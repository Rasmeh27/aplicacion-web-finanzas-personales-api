import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from '../movements/entities/transaction.entity';
import { DashboardReportsController } from './dashboard-reports.controller';
import { DashboardReportsService } from './dashboard-reports.service';
import { ViewMonthlyIncomeTotalUseCase } from './use-cases/cu-019-view-monthly-income-total.use-case';
import { ViewMonthlyExpenseTotalUseCase } from './use-cases/cu-020-view-monthly-expense-total.use-case';
import { ViewMonthlyBalanceUseCase } from './use-cases/cu-021-view-monthly-balance.use-case';
import { ViewSavingsPercentageUseCase } from './use-cases/cu-022-view-savings-percentage.use-case';
import { ViewExpensesByCategoryUseCase } from './use-cases/cu-023-view-expenses-by-category.use-case';

// Modulo 4: Dashboard y reportes
@Module({
  imports: [TypeOrmModule.forFeature([Transaction])],
  controllers: [DashboardReportsController],
  providers: [
    DashboardReportsService,
    ViewMonthlyIncomeTotalUseCase,
    ViewMonthlyExpenseTotalUseCase,
    ViewMonthlyBalanceUseCase,
    ViewSavingsPercentageUseCase,
    ViewExpensesByCategoryUseCase,
  ],
  exports: [DashboardReportsService],
})
export class DashboardReportsModule {}
