import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Transaction, TransactionType } from './entities/transaction.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { FilterTransactionDto } from './dto/filter-transaction.dto';
import { FilterTransactionsUseCase } from './use-cases/filter-transactions.use-case';

@Injectable()
export class TransactionService {
  constructor(
    @InjectRepository(Transaction)
    private readonly repo: Repository<Transaction>,
    private readonly filterTransactionsUseCase: FilterTransactionsUseCase,
  ) {}

  async create(userId: string, dto: CreateTransactionDto): Promise<Transaction> {
    const tx = this.repo.create({
      ...dto,
      userId,
      currency: dto.currency ?? 'DOP',
      date: dto.date,
    });
    return this.repo.save(tx);
  }

  async findAll(userId: string, filters: FilterTransactionDto = {}) {
    return this.filterTransactionsUseCase.execute(userId, filters);
  }

  async findOne(userId: string, id: string): Promise<Transaction> {
    const tx = await this.repo.findOne({ where: { id, userId }, relations: ['category'] });
    if (!tx) throw new NotFoundException('Transaction not found');
    return tx;
  }

  async update(userId: string, id: string, dto: Partial<CreateTransactionDto>) {
    await this.findOne(userId, id);
    await this.repo.update({ id, userId }, dto);
    return this.findOne(userId, id);
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.repo.delete({ id, userId });
  }

  async getMonthlySummary(userId: string, year: number, month: number) {
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0);
    const end = `${year}-${String(month).padStart(2, '0')}-${String(
      endDate.getDate(),
    ).padStart(2, '0')}`;
    const txs = await this.repo.find({
      where: { userId, date: Between(start, end) },
    });
    const income = txs
      .filter((transaction) => transaction.type === TransactionType.INCOME)
      .reduce((sum, transaction) => sum + +transaction.amount, 0);
    const expense = txs
      .filter((transaction) => transaction.type === TransactionType.EXPENSE)
      .reduce((sum, transaction) => sum + +transaction.amount, 0);

    return {
      income,
      expense,
      balance: income - expense,
      savingsRate: income > 0 ? ((income - expense) / income) * 100 : 0,
    };
  }
}
