import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateDebtDto } from '../dto/create-debt.dto';
import { Debt, DebtStatus } from '../entities/debt.entity';

@Injectable()
export class RegisterDebtUseCase {
  constructor(
    @InjectRepository(Debt)
    private readonly repo: Repository<Debt>,
  ) {}

  async execute(userId: string, dto: CreateDebtDto): Promise<Debt> {
    const name = this.validateName(dto.name);
    const minimumPayment = dto.minimumPayment ?? 0;
    const interestRatePct = dto.interestRatePct ?? 0;

    this.validateMinimumPayment(dto.initialAmount, minimumPayment);

    const debt = this.repo.create({
      userId,
      name,
      creditor: this.normalizeOptionalText(dto.creditor),
      initialAmount: dto.initialAmount,
      minimumPayment,
      interestRatePct,
      dueDay: dto.dueDay ?? null,
      currency: (dto.currency ?? 'DOP').toUpperCase(),
      status: DebtStatus.ACTIVE,
    });

    return this.repo.save(debt);
  }

  private validateName(name: string): string {
    const trimmedName = name.trim();

    if (trimmedName.length < 3) {
      throw new BadRequestException('El nombre de la deuda debe tener al menos 3 caracteres');
    }

    return trimmedName;
  }

  private validateMinimumPayment(
    initialAmount: number,
    minimumPayment: number,
  ): void {
    if (minimumPayment > initialAmount) {
      throw new BadRequestException(
        'El pago minimo no puede ser mayor que el monto inicial',
      );
    }
  }

  private normalizeOptionalText(value?: string): string | null {
    const trimmedValue = value?.trim();
    return trimmedValue || null;
  }
}
