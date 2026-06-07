import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from '../movements/entities/transaction.entity';
import { Debt } from '../planning/entities/debt.entity';
import { DebtPayment } from '../planning/entities/debt-payment.entity';
import { FinancialGoal } from '../planning/entities/financial-goal.entity';
import { DashboardReportsController } from './dashboard-reports.controller';
import { DashboardReportsService } from './dashboard-reports.service';
import { ViewMonthlyIncomeTotalUseCase } from './use-cases/cu-019-view-monthly-income-total.use-case';
import { ViewMonthlyExpenseTotalUseCase } from './use-cases/cu-020-view-monthly-expense-total.use-case';
import { ViewMonthlyBalanceUseCase } from './use-cases/cu-021-view-monthly-balance.use-case';
import { ViewSavingsPercentageUseCase } from './use-cases/cu-022-view-savings-percentage.use-case';
import { ViewExpensesByCategoryUseCase } from './use-cases/cu-023-view-expenses-by-category.use-case';
import { ViewFinancialGoalsSummaryUseCase } from './use-cases/cu-024-view-financial-goals-summary.use-case';
import { ViewDebtsSummaryUseCase } from './use-cases/cu-025-view-debts-summary.use-case';
import { CalculateFinancialHealthUseCase } from './use-cases/cu-026-calculate-financial-health.use-case';

// Modulo 4: Dashboard y reportes
@Module({
  imports: [TypeOrmModule.forFeature([Transaction, FinancialGoal, Debt, DebtPayment])],
  controllers: [DashboardReportsController],
  providers: [
    DashboardReportsService,
    ViewMonthlyIncomeTotalUseCase,
    ViewMonthlyExpenseTotalUseCase,
    ViewMonthlyBalanceUseCase,
    ViewSavingsPercentageUseCase,
    ViewExpensesByCategoryUseCase,
    ViewFinancialGoalsSummaryUseCase,
    ViewDebtsSummaryUseCase,
    CalculateFinancialHealthUseCase,
  ],
  exports: [DashboardReportsService],
})
export class DashboardReportsModule {}
