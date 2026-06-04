import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateFinancialGoalDto } from '../dto/create-financial-goal.dto';
import {
  FinancialGoal,
  FinancialGoalStatus,
} from '../entities/financial-goal.entity';

@Injectable()
export class CreateFinancialGoalUseCase {
  constructor(
    @InjectRepository(FinancialGoal)
    private readonly repo: Repository<FinancialGoal>,
  ) {}

  async execute(
    userId: string,
    dto: CreateFinancialGoalDto,
  ): Promise<FinancialGoal> {
    const currentAmount = dto.currentAmount ?? 0;
    const name = this.validateName(dto.name);
    this.validateAmounts(dto.targetAmount, currentAmount);
    this.validateTargetDate(dto.targetDate);

    const goal = this.repo.create({
      userId,
      name,
      targetAmount: dto.targetAmount,
      currentAmount,
      currency: (dto.currency ?? 'DOP').toUpperCase(),
      targetDate: dto.targetDate ?? null,
      status:
        currentAmount >= dto.targetAmount
          ? FinancialGoalStatus.COMPLETED
          : FinancialGoalStatus.ACTIVE,
    });

    return this.repo.save(goal);
  }

  private validateName(name: string): string {
    const trimmedName = name.trim();

    if (trimmedName.length < 3) {
      throw new BadRequestException('El nombre de la meta debe tener al menos 3 caracteres');
    }

    return trimmedName;
  }

  private validateAmounts(targetAmount: number, currentAmount: number): void {
    if (currentAmount > targetAmount) {
      throw new BadRequestException(
        'El monto actual no puede ser mayor que el monto objetivo',
      );
    }
  }

  private validateTargetDate(targetDate?: string): void {
    if (!targetDate) return;

    const today = this.buildTodayDateString();

    if (targetDate < today) {
      throw new BadRequestException('La fecha objetivo no puede estar en el pasado');
    }
  }

  private buildTodayDateString(): string {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
      2,
      '0',
    )}-${String(today.getDate()).padStart(2, '0')}`;
  }
}
