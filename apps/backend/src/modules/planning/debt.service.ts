import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CreateDebtPaymentDto } from './dto/create-debt-payment.dto';
import { CreateDebtDto } from './dto/create-debt.dto';
import { Debt, DebtStatus } from './entities/debt.entity';
import { DebtPayment } from './entities/debt-payment.entity';
import {
  CalculateDebtIncomeRatioUseCase,
  DebtIncomeRatioResponse,
} from './use-cases/cu-018-calculate-debt-income-ratio.use-case';
import { RegisterDebtPaymentUseCase } from './use-cases/cu-017-register-debt-payment.use-case';
import { RegisterDebtUseCase } from './use-cases/cu-016-register-debt.use-case';

@Injectable()
export class DebtService {
  constructor(
    @InjectRepository(Debt)
    private readonly debtRepo: Repository<Debt>,
    @InjectRepository(DebtPayment)
    private readonly paymentRepo: Repository<DebtPayment>,
    private readonly registerDebtUseCase: RegisterDebtUseCase,
    private readonly registerDebtPaymentUseCase: RegisterDebtPaymentUseCase,
    private readonly calculateDebtIncomeRatioUseCase: CalculateDebtIncomeRatioUseCase,
  ) {}

  async list(userId: string) {
    const debts = await this.debtRepo.find({
      where: { userId },
      order: { status: 'ASC', createdAt: 'DESC' },
    });

    return this.attachDebtProgress(userId, debts);
  }

  async getSummary(userId: string, year: number, month: number) {
    const [debts, ratio] = await Promise.all([
      this.list(userId),
      this.calculateIncomeRatio(userId, year, month),
    ]);
    const activeDebts = debts.filter((debt) => debt.status === DebtStatus.ACTIVE);
    const totalPending = activeDebts.reduce((sum, debt) => sum + debt.balance, 0);
    const totalMinimumPayment = activeDebts.reduce(
      (sum, debt) => sum + Number(debt.minimumPayment ?? 0),
      0,
    );

    return {
      totalPending: this.roundMoney(totalPending),
      totalMinimumPayment: this.roundMoney(totalMinimumPayment),
      activeDebtsCount: activeDebts.length,
      debtIncomeRatio: ratio.debtIncomeRatio,
      riskLevel: ratio.riskLevel,
      debts,
    };
  }

  create(userId: string, dto: CreateDebtDto): Promise<Debt> {
    return this.registerDebtUseCase.execute(userId, dto);
  }

  registerPayment(
    userId: string,
    debtId: string,
    dto: CreateDebtPaymentDto,
  ): Promise<DebtPayment> {
    return this.registerDebtPaymentUseCase.execute(userId, debtId, dto);
  }

  calculateIncomeRatio(
    userId: string,
    year: number,
    month: number,
  ): Promise<DebtIncomeRatioResponse> {
    return this.calculateDebtIncomeRatioUseCase.execute(userId, year, month);
  }

  async listPayments(userId: string, debtId: string): Promise<DebtPayment[]> {
    return this.paymentRepo.find({
      where: { userId, debtId },
      order: { paymentDate: 'DESC', createdAt: 'DESC' },
    });
  }

  private async attachDebtProgress(userId: string, debts: Debt[]) {
    if (!debts.length) return [];

    const debtIds = debts.map((debt) => debt.id);
    const payments = await this.paymentRepo.find({
      where: { userId, debtId: In(debtIds) },
    });
    const paidByDebt = payments.reduce<Record<string, number>>((acc, payment) => {
      acc[payment.debtId] = (acc[payment.debtId] ?? 0) + Number(payment.amount);
      return acc;
    }, {});

    return debts.map((debt) => {
      const totalPaid = this.roundMoney(paidByDebt[debt.id] ?? 0);
      const initialAmount = Number(debt.initialAmount);
      const balance = this.roundMoney(Math.max(initialAmount - totalPaid, 0));
      const progress = initialAmount > 0
        ? Math.min(100, Math.round((totalPaid / initialAmount) * 100))
        : 0;

      return {
        ...debt,
        initialAmount,
        minimumPayment: Number(debt.minimumPayment ?? 0),
        interestRatePct: Number(debt.interestRatePct ?? 0),
        totalPaid,
        balance,
        progress,
        nextPaymentDate: this.calculateNextPaymentDate(debt.dueDay),
      };
    });
  }

  private calculateNextPaymentDate(dueDay?: number | null): string | null {
    if (!dueDay) return null;

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const candidate = new Date(year, month, dueDay);
    if (candidate < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
      candidate.setMonth(candidate.getMonth() + 1);
    }

    return candidate.toISOString().slice(0, 10);
  }

  private roundMoney(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
