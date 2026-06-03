import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { Budget } from './entities/budget.entity';
import { CreateMonthlyBudgetUseCase } from './use-cases/create-monthly-budget.use-case';

@Injectable()
export class BudgetService {
  constructor(
    @InjectRepository(Budget)
    private readonly repo: Repository<Budget>,
    private readonly createMonthlyBudgetUseCase: CreateMonthlyBudgetUseCase,
  ) {}

  create(userId: string, dto: CreateBudgetDto): Promise<Budget> {
    return this.createMonthlyBudgetUseCase.execute(userId, dto);
  }

  findAll(userId: string): Promise<Budget[]> {
    return this.repo.find({
      where: { userId },
      relations: ['category'],
      order: {
        periodMonth: 'DESC',
        createdAt: 'DESC',
      },
    });
  }
}
