import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Budget } from './entities/budget.entity';
import { Category } from './entities/category.entity';
import { Transaction } from '../movements/entities/transaction.entity';
import { BudgetController } from './budget.controller';
import { BudgetService } from './budget.service';
import { CreateCategoryBudgetUseCase } from './use-cases/cu-013-create-category-budget.use-case';
import { CreateMonthlyBudgetUseCase } from './use-cases/cu-012-create-monthly-budget.use-case';
import { ViewBudgetProgressUseCase } from './use-cases/cu-014-view-budget-progress.use-case';

@Module({
  imports: [TypeOrmModule.forFeature([Budget, Category, Transaction])],
  controllers: [BudgetController],
  providers: [
    BudgetService,
    CreateMonthlyBudgetUseCase,
    CreateCategoryBudgetUseCase,
    ViewBudgetProgressUseCase,
  ],
  exports: [BudgetService],
})
export class PlanningModule {}
