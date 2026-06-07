import { Injectable } from '@nestjs/common';
import {
  MonthlyIncomeTotalResponse,
  ViewMonthlyIncomeTotalUseCase,
} from './use-cases/cu-019-view-monthly-income-total.use-case';

@Injectable()
export class DashboardReportsService {
  constructor(
    private readonly viewMonthlyIncomeTotalUseCase: ViewMonthlyIncomeTotalUseCase,
  ) {}

  viewMonthlyIncomeTotal(
    userId: string,
    year: number,
    month: number,
  ): Promise<MonthlyIncomeTotalResponse> {
    return this.viewMonthlyIncomeTotalUseCase.execute(userId, year, month);
  }
}
