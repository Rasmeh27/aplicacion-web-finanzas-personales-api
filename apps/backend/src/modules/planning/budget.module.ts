import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Budget } from './entities/budget.entity';
import { Category } from './entities/category.entity';
import { Debt } from './entities/debt.entity';
import { DebtPayment } from './entities/debt-payment.entity';
import { FinancialGoal } from './entities/financial-goal.entity';
import { Transaction } from '../movements/entities/transaction.entity';
import { BudgetController } from './budget.controller';
import { BudgetService } from './budget.service';
import { DebtController } from './debt.controller';
import { DebtService } from './debt.service';
import { FinancialGoalController } from './financial-goal.controller';
import { FinancialGoalService } from './financial-goal.service';
import { CreateCategoryBudgetUseCase } from './use-cases/cu-013-create-category-budget.use-case';
import { CreateMonthlyBudgetUseCase } from './use-cases/cu-012-create-monthly-budget.use-case';
import { ViewBudgetProgressUseCase } from './use-cases/cu-014-view-budget-progress.use-case';
import { CreateFinancialGoalUseCase } from './use-cases/cu-015-create-financial-goal.use-case';
import { RegisterDebtUseCase } from './use-cases/cu-016-register-debt.use-case';
import { RegisterDebtPaymentUseCase } from './use-cases/cu-017-register-debt-payment.use-case';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Budget,
      Category,
      Transaction,
      FinancialGoal,
      Debt,
      DebtPayment,
    ]),
  ],
  controllers: [BudgetController, FinancialGoalController, DebtController],
  providers: [
    BudgetService,
    FinancialGoalService,
    DebtService,
    CreateMonthlyBudgetUseCase,
    CreateCategoryBudgetUseCase,
    ViewBudgetProgressUseCase,
    CreateFinancialGoalUseCase,
    RegisterDebtUseCase,
    RegisterDebtPaymentUseCase,
  ],
  exports: [BudgetService, FinancialGoalService, DebtService],
})
export class PlanningModule {}
