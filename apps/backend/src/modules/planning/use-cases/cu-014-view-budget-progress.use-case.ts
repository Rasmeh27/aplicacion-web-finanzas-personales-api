import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import {
  Transaction,
  TransactionType,
} from '../../movements/entities/transaction.entity';
import { Budget } from '../entities/budget.entity';

export interface BudgetProgressItem {
  id: string;
  name: string;
  categoryId: string | null;
  categoryName: string | null;
  periodMonth: string;
  limitAmount: number;
  spentAmount: number;
  remainingAmount: number;
  progressPercentage: number;
  isExceeded: boolean;
  currency: string;
}

export interface BudgetProgressResponse {
  periodMonth: string;
  budgets: BudgetProgressItem[];
}

@Injectable()
export class ViewBudgetProgressUseCase {
  constructor(
    @InjectRepository(Budget)
    private readonly budgetRepo: Repository<Budget>,
    @InjectRepository(Transaction)
    private readonly movementRepo: Repository<Transaction>,
  ) {}

  async execute(
    userId: string,
    year: number,
    month: number,
  ): Promise<BudgetProgressResponse> {
    const periodMonth = this.buildPeriodMonth(year, month);
    const { startDate, endDate } = this.buildMonthRange(year, month);

    const [budgets, expenses] = await Promise.all([
      this.budgetRepo.find({
        where: {
          userId,
          periodMonth,
        },
        relations: ['category'],
        order: {
          categoryId: 'ASC',
          createdAt: 'ASC',
        },
      }),
      this.movementRepo.find({
        where: {
          userId,
          type: TransactionType.EXPENSE,
          date: Between(startDate, endDate),
        },
      }),
    ]);

    const totalSpent = this.sumExpenses(expenses);
    const spentByCategory = this.sumExpensesByCategory(expenses);

    return {
      periodMonth,
      budgets: budgets.map((budget) => {
        const spentAmount = budget.categoryId
          ? spentByCategory.get(budget.categoryId) ?? 0
          : totalSpent;

        return this.buildProgressItem(budget, spentAmount);
      }),
    };
  }

  private buildProgressItem(
    budget: Budget,
    spentAmount: number,
  ): BudgetProgressItem {
    const limitAmount = Number(budget.limitAmount);
    const remainingAmount = this.roundMoney(limitAmount - spentAmount);

    return {
      id: budget.id,
      name: budget.name,
      categoryId: budget.categoryId ?? null,
      categoryName: budget.category?.name ?? null,
      periodMonth: budget.periodMonth,
      limitAmount,
      spentAmount: this.roundMoney(spentAmount),
      remainingAmount,
      progressPercentage: this.calculateProgressPercentage(spentAmount, limitAmount),
      isExceeded: spentAmount > limitAmount,
      currency: budget.currency,
    };
  }

  private sumExpenses(expenses: Transaction[]): number {
    return this.roundMoney(
      expenses.reduce((total, expense) => total + Number(expense.amount), 0),
    );
  }

  private sumExpensesByCategory(expenses: Transaction[]): Map<string, number> {
    return expenses.reduce((acc, expense) => {
      if (!expense.categoryId) return acc;

      const currentAmount = acc.get(expense.categoryId) ?? 0;
      acc.set(expense.categoryId, this.roundMoney(currentAmount + Number(expense.amount)));
      return acc;
    }, new Map<string, number>());
  }

  private calculateProgressPercentage(spentAmount: number, limitAmount: number): number {
    if (limitAmount <= 0) return 0;
    return Math.round((spentAmount / limitAmount) * 10000) / 100;
  }

  private roundMoney(value: number): number {
    return Math.round(value * 100) / 100;
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
}
