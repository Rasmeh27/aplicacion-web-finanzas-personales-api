import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { CreateBudgetDto } from '../dto/create-budget.dto';
import { Budget } from '../entities/budget.entity';

@Injectable()
export class CreateMonthlyBudgetUseCase {
  constructor(
    @InjectRepository(Budget)
    private readonly repo: Repository<Budget>,
  ) {}

  async execute(userId: string, dto: CreateBudgetDto): Promise<Budget> {
    const periodMonth = this.buildPeriodMonth(dto.year, dto.month);
    const currency = (dto.currency ?? 'DOP').toUpperCase();

    const existingBudget = await this.repo.findOne({
      where: {
        userId,
        categoryId: IsNull(),
        periodMonth,
      },
    });

    if (existingBudget) {
      throw new BadRequestException('Ya existe un presupuesto mensual para ese periodo');
    }

    const budget = this.repo.create({
      userId,
      categoryId: null,
      name: dto.name?.trim() || this.buildDefaultName(dto.year, dto.month),
      periodMonth,
      limitAmount: dto.limitAmount,
      currency,
    });

    return this.repo.save(budget);
  }

  private buildPeriodMonth(year: number, month: number): string {
    return `${year}-${String(month).padStart(2, '0')}-01`;
  }

  private buildDefaultName(year: number, month: number): string {
    return `Presupuesto mensual ${String(month).padStart(2, '0')}/${year}`;
  }
}
