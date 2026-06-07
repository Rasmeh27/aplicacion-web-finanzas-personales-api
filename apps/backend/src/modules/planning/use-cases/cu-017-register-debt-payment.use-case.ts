import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateDebtPaymentDto } from '../dto/create-debt-payment.dto';
import { Debt, DebtStatus } from '../entities/debt.entity';
import { DebtPayment } from '../entities/debt-payment.entity';

@Injectable()
export class RegisterDebtPaymentUseCase {
  constructor(
    @InjectRepository(Debt)
    private readonly debtRepo: Repository<Debt>,
    @InjectRepository(DebtPayment)
    private readonly paymentRepo: Repository<DebtPayment>,
  ) {}

  async execute(
    userId: string,
    debtId: string,
    dto: CreateDebtPaymentDto,
  ): Promise<DebtPayment> {
    const debt = await this.findDebt(userId, debtId);
    const totalPaid = await this.calculateTotalPaid(userId, debtId);
    const remainingAmount = this.roundMoney(Number(debt.initialAmount) - totalPaid);

    this.validatePaymentAmount(dto.amount, remainingAmount);

    const payment = this.paymentRepo.create({
      userId,
      debtId,
      amount: dto.amount,
      paymentDate: dto.paymentDate ?? this.buildTodayDateString(),
      note: this.normalizeOptionalText(dto.note),
    });

    const savedPayment = await this.paymentRepo.save(payment);

    if (this.roundMoney(totalPaid + dto.amount) >= Number(debt.initialAmount)) {
      await this.markDebtAsPaid(debt);
    }

    return savedPayment;
  }

  private async findDebt(userId: string, debtId: string): Promise<Debt> {
    const debt = await this.debtRepo.findOne({
      where: {
        id: debtId,
        userId,
      },
    });

    if (!debt) {
      throw new NotFoundException('Deuda no encontrada');
    }

    if (debt.status !== DebtStatus.ACTIVE) {
      throw new BadRequestException('Solo se puede registrar pagos a deudas activas');
    }

    return debt;
  }

  private async calculateTotalPaid(userId: string, debtId: string): Promise<number> {
    const result = await this.paymentRepo
      .createQueryBuilder('payment')
      .select('COALESCE(SUM(payment.amount), 0)', 'total')
      .where('payment.userId = :userId', { userId })
      .andWhere('payment.debtId = :debtId', { debtId })
      .getRawOne<{ total: string }>();

    return this.roundMoney(Number(result?.total ?? 0));
  }

  private validatePaymentAmount(amount: number, remainingAmount: number): void {
    if (amount > remainingAmount) {
      throw new BadRequestException(
        'El pago no puede ser mayor que el saldo pendiente',
      );
    }
  }

  private async markDebtAsPaid(debt: Debt): Promise<void> {
    await this.debtRepo.update(
      {
        id: debt.id,
        userId: debt.userId,
      },
      {
        status: DebtStatus.PAID,
      },
    );
  }

  private normalizeOptionalText(value?: string): string | null {
    const trimmedValue = value?.trim();
    return trimmedValue || null;
  }

  private buildTodayDateString(): string {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
      2,
      '0',
    )}-${String(today.getDate()).padStart(2, '0')}`;
  }

  private roundMoney(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
