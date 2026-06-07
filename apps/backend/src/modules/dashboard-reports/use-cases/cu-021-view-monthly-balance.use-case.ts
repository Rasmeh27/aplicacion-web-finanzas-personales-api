import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import {
  Transaction,
  TransactionType,
} from '../../movements/entities/transaction.entity';

export interface MonthlyBalanceResponse {
  periodMonth: string;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  currency: string;
}

@Injectable()
export class ViewMonthlyBalanceUseCase {
  constructor(
    @InjectRepository(Transaction)
    private readonly movementRepo: Repository<Transaction>,
  ) {}

  async execute(
    userId: string,
    year: number,
    month: number,
  ): Promise<MonthlyBalanceResponse> {
    const periodMonth = this.buildPeriodMonth(year, month);
    const { startDate, endDate } = this.buildMonthRange(year, month);

    const movements = await this.movementRepo.find({
      where: {
        userId,
        date: Between(startDate, endDate),
      },
    });

    const totalIncome = this.sumByType(movements, TransactionType.INCOME);
    const totalExpense = this.sumByType(movements, TransactionType.EXPENSE);

    return {
      periodMonth,
      totalIncome,
      totalExpense,
      balance: this.roundMoney(totalIncome - totalExpense),
      currency: 'DOP',
    };
  }

  private sumByType(movements: Transaction[], type: TransactionType): number {
    return this.roundMoney(
      movements
        .filter((movement) => movement.type === type)
        .reduce((total, movement) => total + Number(movement.amount), 0),
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
