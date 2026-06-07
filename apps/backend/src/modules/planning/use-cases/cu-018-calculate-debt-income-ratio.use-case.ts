import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import {
  Transaction,
  TransactionType,
} from '../../movements/entities/transaction.entity';
import { Debt, DebtStatus } from '../entities/debt.entity';

export type DebtIncomeRiskLevel = 'healthy' | 'warning' | 'critical' | 'no_income';

export interface DebtIncomeRatioResponse {
  periodMonth: string;
  totalMonthlyIncome: number;
  totalMinimumDebtPayment: number;
  debtIncomeRatio: number | null;
  riskLevel: DebtIncomeRiskLevel;
  isHealthy: boolean;
}

@Injectable()
export class CalculateDebtIncomeRatioUseCase {
  constructor(
    @InjectRepository(Debt)
    private readonly debtRepo: Repository<Debt>,
    @InjectRepository(Transaction)
    private readonly movementRepo: Repository<Transaction>,
  ) {}

  async execute(
    userId: string,
    year: number,
    month: number,
  ): Promise<DebtIncomeRatioResponse> {
    const periodMonth = this.buildPeriodMonth(year, month);
    const { startDate, endDate } = this.buildMonthRange(year, month);

    const [debts, incomes] = await Promise.all([
      this.debtRepo.find({
        where: {
          userId,
          status: DebtStatus.ACTIVE,
        },
      }),
      this.movementRepo.find({
        where: {
          userId,
          type: TransactionType.INCOME,
          date: Between(startDate, endDate),
        },
      }),
    ]);

    const totalMonthlyIncome = this.sumAmounts(incomes.map((income) => income.amount));
    const totalMinimumDebtPayment = this.sumAmounts(
      debts.map((debt) => debt.minimumPayment),
    );

    const debtIncomeRatio = this.calculateRatio(
      totalMinimumDebtPayment,
      totalMonthlyIncome,
    );

    const riskLevel = this.calculateRiskLevel(debtIncomeRatio);

    return {
      periodMonth,
      totalMonthlyIncome,
      totalMinimumDebtPayment,
      debtIncomeRatio,
      riskLevel,
      isHealthy: riskLevel === 'healthy',
    };
  }

  private calculateRatio(
    totalMinimumDebtPayment: number,
    totalMonthlyIncome: number,
  ): number | null {
    if (totalMonthlyIncome <= 0) return null;
    return Math.round((totalMinimumDebtPayment / totalMonthlyIncome) * 10000) / 100;
  }

  private calculateRiskLevel(
    debtIncomeRatio: number | null,
  ): DebtIncomeRiskLevel {
    if (debtIncomeRatio === null) return 'no_income';
    if (debtIncomeRatio < 36) return 'healthy';
    if (debtIncomeRatio <= 50) return 'warning';
    return 'critical';
  }

  private sumAmounts(amounts: number[]): number {
    return this.roundMoney(
      amounts.reduce((total, amount) => total + Number(amount), 0),
    );
  }

  private buildPeriodMonth(year: number, month: number): string {
    return `${year}-${String(month).padStart(2, '0')}-01`;
  }

  private buildMonthRange(year: number, month: number): {
    startDate: string;
    endDate: string;
  } {
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();

    return {
      startDate: this.buildPeriodMonth(year, month),
      endDate: `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(
        2,
        '0',
      )}`,
    };
  }

  private roundMoney(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
