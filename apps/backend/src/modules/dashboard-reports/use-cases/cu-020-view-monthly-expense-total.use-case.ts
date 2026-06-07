import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import {
  Transaction,
  TransactionType,
} from '../../movements/entities/transaction.entity';

export interface MonthlyExpenseTotalResponse {
  periodMonth: string;
  totalExpense: number;
  currency: string;
}

@Injectable()
export class ViewMonthlyExpenseTotalUseCase {
  constructor(
    @InjectRepository(Transaction)
    private readonly movementRepo: Repository<Transaction>,
  ) {}

  async execute(
    userId: string,
    year: number,
    month: number,
  ): Promise<MonthlyExpenseTotalResponse> {
    const periodMonth = this.buildPeriodMonth(year, month);
    const { startDate, endDate } = this.buildMonthRange(year, month);

    const expenses = await this.movementRepo.find({
      where: {
        userId,
        type: TransactionType.EXPENSE,
        date: Between(startDate, endDate),
      },
    });

    return {
      periodMonth,
      totalExpense: this.sumAmounts(expenses.map((expense) => expense.amount)),
      currency: 'DOP',
    };
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
