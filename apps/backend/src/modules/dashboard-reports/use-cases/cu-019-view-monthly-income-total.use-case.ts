import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import {
  Transaction,
  TransactionType,
} from '../../movements/entities/transaction.entity';

export interface MonthlyIncomeTotalResponse {
  periodMonth: string;
  totalIncome: number;
  currency: string;
}

@Injectable()
export class ViewMonthlyIncomeTotalUseCase {
  constructor(
    @InjectRepository(Transaction)
    private readonly movementRepo: Repository<Transaction>,
  ) {}

  async execute(
    userId: string,
    year: number,
    month: number,
  ): Promise<MonthlyIncomeTotalResponse> {
    const periodMonth = this.buildPeriodMonth(year, month);
    const { startDate, endDate } = this.buildMonthRange(year, month);

    const incomes = await this.movementRepo.find({
      where: {
        userId,
        type: TransactionType.INCOME,
        date: Between(startDate, endDate),
      },
    });

    return {
      periodMonth,
      // Se suma el monto ya convertido a moneda base (DOP); fallback a `amount`
      // para filas antiguas aún sin convertir.
      totalIncome: this.sumAmounts(
        incomes.map((income) => income.amountBase ?? income.amount),
      ),
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
