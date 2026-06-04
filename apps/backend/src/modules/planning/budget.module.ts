import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Budget } from './entities/budget.entity';
import { Category } from './entities/category.entity';
import { FinancialGoal } from './entities/financial-goal.entity';
import { Transaction } from '../movements/entities/transaction.entity';
import { BudgetController } from './budget.controller';
import { BudgetService } from './budget.service';
import { FinancialGoalController } from './financial-goal.controller';
import { FinancialGoalService } from './financial-goal.service';
import { CreateCategoryBudgetUseCase } from './use-cases/cu-013-create-category-budget.use-case';
import { CreateMonthlyBudgetUseCase } from './use-cases/cu-012-create-monthly-budget.use-case';
import { ViewBudgetProgressUseCase } from './use-cases/cu-014-view-budget-progress.use-case';
import { CreateFinancialGoalUseCase } from './use-cases/cu-015-create-financial-goal.use-case';

@Module({
  imports: [TypeOrmModule.forFeature([Budget, Category, Transaction, FinancialGoal])],
  controllers: [BudgetController, FinancialGoalController],
  providers: [
    BudgetService,
    FinancialGoalService,
    CreateMonthlyBudgetUseCase,
    CreateCategoryBudgetUseCase,
    ViewBudgetProgressUseCase,
    CreateFinancialGoalUseCase,
  ],
  exports: [BudgetService, FinancialGoalService],
})
export class PlanningModule {}
