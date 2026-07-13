import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import {
  Transaction,
  TransactionType,
} from '../../movements/entities/transaction.entity';

export interface SavingsPercentageResponse {
  periodMonth: string;
  totalIncome: number;
  totalExpense: number;
  savedAmount: number;
  savingsPercentage: number | null;
  currency: string;
}

@Injectable()
export class ViewSavingsPercentageUseCase {
  constructor(
    @InjectRepository(Transaction)
    private readonly movementRepo: Repository<Transaction>,
  ) {}

  async execute(
    userId: string,
    year: number,
    month: number,
  ): Promise<SavingsPercentageResponse> {
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
    const savedAmount = this.roundMoney(totalIncome - totalExpense);

    return {
      periodMonth,
      totalIncome,
      totalExpense,
      savedAmount,
      savingsPercentage: this.calculateSavingsPercentage(savedAmount, totalIncome),
      currency: 'DOP',
    };
  }

  private calculateSavingsPercentage(
    savedAmount: number,
    totalIncome: number,
  ): number | null {
    if (totalIncome <= 0) return null;
    return Math.round((savedAmount / totalIncome) * 10000) / 100;
  }

  private sumByType(movements: Transaction[], type: TransactionType): number {
    return this.roundMoney(
      movements
        .filter((movement) => movement.type === type)
        // Monto en moneda base (DOP); fallback a `amount` para filas sin convertir.
        .reduce((total, movement) => total + Number(movement.amountBase ?? movement.amount), 0),
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
