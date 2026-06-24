import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  FindOperator,
  FindOptionsWhere,
  ILike,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { FilterTransactionDto } from '../dto/filter-transaction.dto';
import { Transaction } from '../entities/transaction.entity';

// CU-011: Filtrar movimientos por fecha, categoria o tipo.
@Injectable()
export class FilterTransactionsUseCase {
  constructor(
    @InjectRepository(Transaction)
    private readonly repo: Repository<Transaction>,
  ) {}

  async execute(userId: string, filters: FilterTransactionDto = {}) {
    const where: FindOptionsWhere<Transaction> = { userId };

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.classification) {
      where.classification = filters.classification;
    }

    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters.startDate || filters.endDate) {
      where.date = this.buildDateFilter(filters);
    }

    const search = filters.search?.trim();
    if (search) {
      where.description = ILike(`%${search}%`);
    }

    const limit = filters.limit ?? 20;
    const offset = filters.offset ?? 0;

    const [items, total] = await this.repo.findAndCount({
      where,
      order: { date: 'DESC', createdAt: 'DESC' },
      take: limit,
      skip: offset,
      relations: ['category'],
    });

    return {
      items,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    };
  }

  private buildDateFilter(filters: FilterTransactionDto): FindOperator<string> {
    const start = filters.startDate;
    const end = filters.endDate;

    if (start && end) {
      if (start > end) {
        throw new BadRequestException('startDate must be less than or equal to endDate');
      }

      return Between(start, end);
    }

    if (start) {
      return MoreThanOrEqual(start);
    }

    if (end) {
      return LessThanOrEqual(end);
    }

    throw new BadRequestException('At least one date filter must be provided');
  }
}
