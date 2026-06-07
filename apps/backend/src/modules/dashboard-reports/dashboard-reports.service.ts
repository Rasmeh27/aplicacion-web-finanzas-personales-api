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

@Injectable()
export class DashboardReportsService {
  constructor(
    private readonly viewMonthlyIncomeTotalUseCase: ViewMonthlyIncomeTotalUseCase,
    private readonly viewMonthlyExpenseTotalUseCase: ViewMonthlyExpenseTotalUseCase,
    private readonly viewMonthlyBalanceUseCase: ViewMonthlyBalanceUseCase,
    private readonly viewSavingsPercentageUseCase: ViewSavingsPercentageUseCase,
    private readonly viewExpensesByCategoryUseCase: ViewExpensesByCategoryUseCase,
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
}
