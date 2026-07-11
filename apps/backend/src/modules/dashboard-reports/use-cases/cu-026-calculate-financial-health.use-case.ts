import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import {
  Transaction,
  TransactionType,
} from '../../movements/entities/transaction.entity';
import { Debt, DebtStatus } from '../../planning/entities/debt.entity';
import { DebtPayment } from '../../planning/entities/debt-payment.entity';
import {
  FinancialGoal,
  FinancialGoalStatus,
} from '../../planning/entities/financial-goal.entity';

export type FinancialHealthStatus = 'optimal' | 'healthy' | 'stable' | 'weak' | 'critical';

export interface FinancialHealthResponse {
  periodMonth: string;
  totalIncome: number;
  totalExpense: number;
  monthlyBalance: number;
  savingsPercentage: number | null;
  debtIncomeRatio: number | null;
  totalDebtRemaining: number;
  goalsProgressPercentage: number;
  financialHealthScore: number;
  status: FinancialHealthStatus;
  recommendations: string[];
  currency: string;
}

@Injectable()
export class CalculateFinancialHealthUseCase {
  constructor(
    @InjectRepository(Transaction)
    private readonly movementRepo: Repository<Transaction>,
    @InjectRepository(Debt)
    private readonly debtRepo: Repository<Debt>,
    @InjectRepository(DebtPayment)
    private readonly paymentRepo: Repository<DebtPayment>,
    @InjectRepository(FinancialGoal)
    private readonly goalRepo: Repository<FinancialGoal>,
  ) {}

  async execute(
    userId: string,
    year: number,
    month: number,
  ): Promise<FinancialHealthResponse> {
    const periodMonth = this.buildPeriodMonth(year, month);
    const { startDate, endDate } = this.buildMonthRange(year, month);

    const [movements, activeDebts, payments, goals] = await Promise.all([
      this.movementRepo.find({
        where: {
          userId,
          date: Between(startDate, endDate),
        },
      }),
      this.debtRepo.find({
        where: {
          userId,
          status: DebtStatus.ACTIVE,
        },
      }),
      this.paymentRepo.find({
        where: { userId },
      }),
      this.goalRepo.find({
        where: { userId },
      }),
    ]);

    const totalIncome = this.sumAmounts(
      movements
        .filter((movement) => movement.type === TransactionType.INCOME)
        .map((movement) => movement.amount),
    );
    const totalExpense = this.sumAmounts(
      movements
        .filter((movement) => movement.type === TransactionType.EXPENSE)
        .map((movement) => movement.amount),
    );
    const monthlyBalance = this.roundMoney(totalIncome - totalExpense);
    const savingsPercentage =
      totalIncome > 0
        ? this.roundMoney((monthlyBalance / totalIncome) * 100)
        : null;

    const paidByDebt = this.groupPaymentsByDebt(payments);
    const totalDebtRemaining = this.calculateTotalDebtRemaining(
      activeDebts,
      paidByDebt,
    );
    const totalMinimumPayment = this.sumAmounts(
      activeDebts.map((debt) => debt.minimumPayment),
    );
    const debtIncomeRatio =
      totalIncome > 0
        ? this.roundMoney((totalMinimumPayment / totalIncome) * 100)
        : totalMinimumPayment > 0
          ? null
          : 0;

    const relevantGoals = goals.filter(
      (goal) => goal.status !== FinancialGoalStatus.CANCELLED,
    );
    const goalsProgressPercentage = this.calculateGoalsProgress(relevantGoals);
    const financialHealthScore = this.calculateScore({
      savingsPercentage,
      debtIncomeRatio,
      totalIncome,
      monthlyBalance,
      goalsProgressPercentage,
      hasGoals: relevantGoals.length > 0,
    });

    return {
      periodMonth,
      totalIncome,
      totalExpense,
      monthlyBalance,
      savingsPercentage,
      debtIncomeRatio,
      totalDebtRemaining,
      goalsProgressPercentage,
      financialHealthScore,
      status: this.resolveStatus(financialHealthScore),
      recommendations: this.buildRecommendations({
        savingsPercentage,
        debtIncomeRatio,
        monthlyBalance,
        totalIncome,
        totalDebtRemaining,
        goalsProgressPercentage,
        hasGoals: relevantGoals.length > 0,
      }),
      currency: 'DOP',
    };
  }

  private calculateScore(params: {
    savingsPercentage: number | null;
    debtIncomeRatio: number | null;
    totalIncome: number;
    monthlyBalance: number;
    goalsProgressPercentage: number;
    hasGoals: boolean;
  }): number {
    const savingsScore =
      params.savingsPercentage === null
        ? 0
        : Math.min(Math.max(params.savingsPercentage, 0) / 20, 1) * 30;

    const debtScore = this.calculateDebtScore(params.debtIncomeRatio);
    const balanceScore = this.calculateBalanceScore(
      params.monthlyBalance,
      params.totalIncome,
    );
    const goalsScore = params.hasGoals
      ? Math.min(params.goalsProgressPercentage / 100, 1) * 20
      : 10;

    return this.roundMoney(savingsScore + debtScore + balanceScore + goalsScore);
  }

  private calculateDebtScore(debtIncomeRatio: number | null): number {
    if (debtIncomeRatio === null) return 0;
    if (debtIncomeRatio <= 30) return 25;
    if (debtIncomeRatio <= 40) return 18;
    if (debtIncomeRatio <= 50) return 10;
    return 0;
  }

  private calculateBalanceScore(monthlyBalance: number, totalIncome: number): number {
    if (totalIncome <= 0) return monthlyBalance >= 0 ? 10 : 0;
    if (monthlyBalance >= 0) return 25;

    const negativeRatio = Math.abs(monthlyBalance) / totalIncome;
    return this.roundMoney(Math.max(25 - negativeRatio * 25, 0));
  }

  private calculateGoalsProgress(goals: FinancialGoal[]): number {
    const totalTargetAmount = this.sumAmounts(
      goals.map((goal) => goal.targetAmount),
    );
    const totalCurrentAmount = this.sumAmounts(
      goals.map((goal) => goal.currentAmount),
    );

    if (totalTargetAmount <= 0) return 0;
    return this.roundMoney((totalCurrentAmount / totalTargetAmount) * 100);
  }

  private calculateTotalDebtRemaining(
    debts: Debt[],
    paidByDebt: Map<string, number>,
  ): number {
    return this.sumAmounts(
      debts.map((debt) =>
        Math.max(Number(debt.initialAmount) - (paidByDebt.get(debt.id) ?? 0), 0),
      ),
    );
  }

  private buildRecommendations(params: {
    savingsPercentage: number | null;
    debtIncomeRatio: number | null;
    monthlyBalance: number;
    totalIncome: number;
    totalDebtRemaining: number;
    goalsProgressPercentage: number;
    hasGoals: boolean;
  }): string[] {
    const recommendations: string[] = [];

    if (params.totalIncome <= 0) {
      recommendations.push('Registrar ingresos del mes para medir mejor la salud financiera.');
    }

    if (params.monthlyBalance < 0) {
      recommendations.push('Revisar los gastos del mes porque superan los ingresos.');
    }

    if (
      params.savingsPercentage !== null &&
      params.savingsPercentage >= 0 &&
      params.savingsPercentage < 20
    ) {
      recommendations.push('Subir el porcentaje de ahorro mensual al menos a 20%.');
    }

    if (params.debtIncomeRatio === null || params.debtIncomeRatio > 40) {
      recommendations.push('Reducir pagos minimos de deudas frente al ingreso mensual.');
    }

    if (params.hasGoals && params.goalsProgressPercentage < 50) {
      recommendations.push('Aumentar aportes a metas financieras activas.');
    }

    if (params.totalDebtRemaining > 0 && params.debtIncomeRatio !== null) {
      recommendations.push('Priorizar pagos a deudas activas para bajar el saldo pendiente.');
    }

    return recommendations.length > 0
      ? recommendations
      : ['Mantener el ritmo actual y revisar el avance cada mes.'];
  }

  private resolveStatus(score: number): FinancialHealthStatus {
    if (score >= 85) return 'optimal';
    if (score >= 70) return 'healthy';
    if (score >= 50) return 'stable';
    if (score >= 30) return 'weak';
    return 'critical';
  }

  private groupPaymentsByDebt(payments: DebtPayment[]): Map<string, number> {
    return payments.reduce((acc, payment) => {
      const currentAmount = acc.get(payment.debtId) ?? 0;
      acc.set(
        payment.debtId,
        this.roundMoney(currentAmount + Number(payment.amount)),
      );
      return acc;
    }, new Map<string, number>());
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
