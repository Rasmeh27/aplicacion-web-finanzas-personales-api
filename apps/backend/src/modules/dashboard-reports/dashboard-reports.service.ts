import { Injectable } from '@nestjs/common';
import {
  MonthlyIncomeTotalResponse,
  ViewMonthlyIncomeTotalUseCase,
} from './use-cases/cu-019-view-monthly-income-total.use-case';
import {
  MonthlyExpenseTotalResponse,
  ViewMonthlyExpenseTotalUseCase,
} from './use-cases/cu-020-view-monthly-expense-total.use-case';

@Injectable()
export class DashboardReportsService {
  constructor(
    private readonly viewMonthlyIncomeTotalUseCase: ViewMonthlyIncomeTotalUseCase,
    private readonly viewMonthlyExpenseTotalUseCase: ViewMonthlyExpenseTotalUseCase,
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
}
