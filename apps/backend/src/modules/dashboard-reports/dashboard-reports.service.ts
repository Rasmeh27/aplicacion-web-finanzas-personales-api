import { Injectable } from '@nestjs/common';
import {
  MonthlyIncomeTotalResponse,
  ViewMonthlyIncomeTotalUseCase,
} from './use-cases/cu-019-view-monthly-income-total.use-case';
import {
  MonthlyExpenseTotalResponse,
  ViewMonthlyExpenseTotalUseCase,
} from './use-cases/cu-020-view-monthly-expense-total.use-case';
import {
  MonthlyBalanceResponse,
  ViewMonthlyBalanceUseCase,
} from './use-cases/cu-021-view-monthly-balance.use-case';
import {
  SavingsPercentageResponse,
  ViewSavingsPercentageUseCase,
} from './use-cases/cu-022-view-savings-percentage.use-case';
import {
  ExpensesByCategoryResponse,
  ViewExpensesByCategoryUseCase,
} from './use-cases/cu-023-view-expenses-by-category.use-case';
import {
  FinancialGoalsSummaryResponse,
  ViewFinancialGoalsSummaryUseCase,
} from './use-cases/cu-024-view-financial-goals-summary.use-case';
import {
  DebtsSummaryResponse,
  ViewDebtsSummaryUseCase,
} from './use-cases/cu-025-view-debts-summary.use-case';
import {
  CalculateFinancialHealthUseCase,
  FinancialHealthResponse,
} from './use-cases/cu-026-calculate-financial-health.use-case';

@Injectable()
export class DashboardReportsService {
  constructor(
    private readonly viewMonthlyIncomeTotalUseCase: ViewMonthlyIncomeTotalUseCase,
    private readonly viewMonthlyExpenseTotalUseCase: ViewMonthlyExpenseTotalUseCase,
    private readonly viewMonthlyBalanceUseCase: ViewMonthlyBalanceUseCase,
    private readonly viewSavingsPercentageUseCase: ViewSavingsPercentageUseCase,
    private readonly viewExpensesByCategoryUseCase: ViewExpensesByCategoryUseCase,
    private readonly viewFinancialGoalsSummaryUseCase: ViewFinancialGoalsSummaryUseCase,
    private readonly viewDebtsSummaryUseCase: ViewDebtsSummaryUseCase,
    private readonly calculateFinancialHealthUseCase: CalculateFinancialHealthUseCase,
  ) {}

  viewMonthlyIncomeTotal(
    userId: string,
    year: number,
    month: number,
  ): Promise<MonthlyIncomeTotalResponse> {
    return this.viewMonthlyIncomeTotalUseCase.execute(userId, year, month);
  }

  viewMonthlyExpenseTotal(
    userId: string,
    year: number,
    month: number,
  ): Promise<MonthlyExpenseTotalResponse> {
    return this.viewMonthlyExpenseTotalUseCase.execute(userId, year, month);
  }

  viewMonthlyBalance(
    userId: string,
    year: number,
    month: number,
  ): Promise<MonthlyBalanceResponse> {
    return this.viewMonthlyBalanceUseCase.execute(userId, year, month);
  }

  viewSavingsPercentage(
    userId: string,
    year: number,
    month: number,
  ): Promise<SavingsPercentageResponse> {
    return this.viewSavingsPercentageUseCase.execute(userId, year, month);
  }

  viewExpensesByCategory(
    userId: string,
    year: number,
    month: number,
  ): Promise<ExpensesByCategoryResponse> {
    return this.viewExpensesByCategoryUseCase.execute(userId, year, month);
  }

  viewFinancialGoalsSummary(
    userId: string,
  ): Promise<FinancialGoalsSummaryResponse> {
    return this.viewFinancialGoalsSummaryUseCase.execute(userId);
  }

  viewDebtsSummary(userId: string): Promise<DebtsSummaryResponse> {
    return this.viewDebtsSummaryUseCase.execute(userId);
  }

  calculateFinancialHealth(
    userId: string,
    year: number,
    month: number,
  ): Promise<FinancialHealthResponse> {
    return this.calculateFinancialHealthUseCase.execute(userId, year, month);
  }
}
