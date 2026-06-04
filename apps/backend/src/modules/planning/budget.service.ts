import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCategoryBudgetDto } from './dto/create-category-budget.dto';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { Budget } from './entities/budget.entity';
import { CreateCategoryBudgetUseCase } from './use-cases/cu-013-create-category-budget.use-case';
import { CreateMonthlyBudgetUseCase } from './use-cases/cu-012-create-monthly-budget.use-case';
import {
  BudgetProgressResponse,
  ViewBudgetProgressUseCase,
} from './use-cases/cu-014-view-budget-progress.use-case';

@Injectable()
export class BudgetService {
  constructor(
    @InjectRepository(Budget)
    private readonly repo: Repository<Budget>,
    private readonly createMonthlyBudgetUseCase: CreateMonthlyBudgetUseCase,
    private readonly createCategoryBudgetUseCase: CreateCategoryBudgetUseCase,
    private readonly viewBudgetProgressUseCase: ViewBudgetProgressUseCase,
  ) {}

  create(userId: string, dto: CreateBudgetDto): Promise<Budget> {
    return this.createMonthlyBudgetUseCase.execute(userId, dto);
  }

  createByCategory(userId: string, dto: CreateCategoryBudgetDto): Promise<Budget> {
    return this.createCategoryBudgetUseCase.execute(userId, dto);
  }

  viewProgress(
    userId: string,
    year: number,
    month: number,
  ): Promise<BudgetProgressResponse> {
    return this.viewBudgetProgressUseCase.execute(userId, year, month);
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
