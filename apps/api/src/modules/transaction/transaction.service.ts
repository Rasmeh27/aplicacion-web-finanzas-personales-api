import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository }  from '@nestjs/typeorm';
import { Between, FindOptionsWhere, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { Transaction, TransactionType } from './entities/transaction.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ListTransactionsQueryDto } from './dto/list-transactions-query.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

@Injectable()
export class TransactionService {
  constructor(
    @InjectRepository(Transaction)
    private readonly repo: Repository<Transaction>,
  ) {}

  async create(userId: string, dto: CreateTransactionDto): Promise<Transaction> {
    const tx = this.repo.create({
      ...this.cleanMovementData(dto),
      userId,
      currency: dto.currency ?? 'DOP',
    });
    return this.repo.save(tx);
  }

  async findAll(userId: string, filters: ListTransactionsQueryDto = {}) {
    const where: FindOptionsWhere<Transaction> = { userId };
    if (filters.type)       where.type = filters.type;
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.startDate && filters.endDate) {
      where.date = Between(filters.startDate, filters.endDate) as any;
    } else if (filters.startDate) {
      where.date = MoreThanOrEqual(filters.startDate) as any;
    } else if (filters.endDate) {
      where.date = LessThanOrEqual(filters.endDate) as any;
    }
    const [items, total] = await this.repo.findAndCount({
      where,
      order: { date: 'DESC', createdAt: 'DESC' },
      take: filters.limit ?? 20,
      skip: filters.offset ?? 0,
      relations: ['category'],
    });
    return { items, total };
  }

  async findOne(userId: string, id: string): Promise<Transaction> {
    const tx = await this.repo.findOne({ where: { id, userId }, relations: ['category'] });
    if (!tx) throw new NotFoundException('Transaction not found');
    return tx;
  }

  async update(userId: string, id: string, dto: UpdateTransactionDto) {
    await this.findOne(userId, id);
    await this.repo.update({ id, userId }, this.cleanMovementData(dto));
    return this.findOne(userId, id);
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.repo.delete({ id, userId });
  }

  async getMonthlySummary(userId: string, year: number, month: number) {
    const start = new Date(year, month - 1, 1);
    const end   = new Date(year, month, 0);
    const txs   = await this.repo.find({
      where: { userId, date: Between(start, end) as any },
    });
    const income  = txs.filter(t => t.type === TransactionType.INCOME).reduce((s, t) => s + +t.amount, 0);
    const expense = txs.filter(t => t.type === TransactionType.EXPENSE).reduce((s, t) => s + +t.amount, 0);
    return { income, expense, balance: income - expense, savingsRate: income > 0 ? ((income - expense) / income) * 100 : 0 };
  }

  private cleanMovementData(dto: CreateTransactionDto | UpdateTransactionDto) {
    return Object.fromEntries(
      Object.entries(dto).filter(([, value]) => value !== undefined),
    );
  }
}
