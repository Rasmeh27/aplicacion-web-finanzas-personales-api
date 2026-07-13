import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import {
  Transaction,
  TransactionType,
} from '../../movements/entities/transaction.entity';

export interface ExpenseByCategoryItem {
  categoryId: string | null;
  categoryName: string;
  totalExpense: number;
  percentage: number;
}

export interface ExpensesByCategoryResponse {
  periodMonth: string;
  totalExpense: number;
  categories: ExpenseByCategoryItem[];
  currency: string;
}

@Injectable()
export class ViewExpensesByCategoryUseCase {
  constructor(
    @InjectRepository(Transaction)
    private readonly movementRepo: Repository<Transaction>,
  ) {}

  async execute(
    userId: string,
    year: number,
    month: number,
  ): Promise<ExpensesByCategoryResponse> {
    const periodMonth = this.buildPeriodMonth(year, month);
    const { startDate, endDate } = this.buildMonthRange(year, month);

    const expenses = await this.movementRepo.find({
      where: {
        userId,
        type: TransactionType.EXPENSE,
        date: Between(startDate, endDate),
      },
      relations: ['category'],
    });

    // `amount` ya está en moneda base (DOP), convertido al crear/actualizar.
    const totalExpense = this.sumAmounts(expenses.map((expense) => expense.amount));

    return {
      periodMonth,
      totalExpense,
      categories: this.groupByCategory(expenses, totalExpense),
      currency: 'DOP',
    };
  }

  private groupByCategory(
    expenses: Transaction[],
    totalExpense: number,
  ): ExpenseByCategoryItem[] {
    const groupedExpenses = expenses.reduce((acc, expense) => {
      const categoryId = expense.categoryId ?? null;
      const key = categoryId ?? 'without-category';
      const current = acc.get(key) ?? {
        categoryId,
        categoryName: expense.category?.name ?? 'Sin categoria',
        totalExpense: 0,
      };

      current.totalExpense = this.roundMoney(
        current.totalExpense + Number(expense.amount),
      );
      acc.set(key, current);
      return acc;
    }, new Map<string, Omit<ExpenseByCategoryItem, 'percentage'>>());

    return Array.from(groupedExpenses.values())
      .map((item) => ({
        ...item,
        percentage: this.calculatePercentage(item.totalExpense, totalExpense),
      }))
      .sort((a, b) => b.totalExpense - a.totalExpense);
  }

  private calculatePercentage(amount: number, totalExpense: number): number {
    if (totalExpense <= 0) return 0;
    return Math.round((amount / totalExpense) * 10000) / 100;
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
