import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import {
  CLASSIFICATION_TO_TYPE,
  Transaction,
  TransactionClassification,
  TransactionType,
} from './entities/transaction.entity';
import { User } from '../user/entities/user.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { FilterTransactionDto } from './dto/filter-transaction.dto';
import { FilterTransactionsUseCase } from './use-cases/cu-011-filter-movements.use-case';
import { BASE_CURRENCY, CurrencyConversionService } from './currency-conversion.service';

export interface TransactionSummary {
  year: number;
  month: number;
  totalIncome: number;
  totalRegularIncome: number;
  totalExtraIncome: number;
  totalExpenses: number;
  totalFixedExpenses: number;
  totalVariableExpenses: number;
  balance: number;
  savingsRate: number;
  transactionCount: number;
}

@Injectable()
export class TransactionService {
  constructor(
    @InjectRepository(Transaction)
    private readonly repo: Repository<Transaction>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly filterTransactionsUseCase: FilterTransactionsUseCase,
    private readonly conversion: CurrencyConversionService,
  ) {}

  async create(userId: string, dto: CreateTransactionDto): Promise<Transaction> {
    const type = CLASSIFICATION_TO_TYPE[dto.classification];
    const currency = (dto.currency ?? BASE_CURRENCY).toUpperCase();
    const baseCurrency = await this.resolveBaseCurrency(userId);
    const { amountBase, exchangeRate } = this.conversion.convertToBase({
      amount: dto.amount,
      currency,
      type,
      baseCurrency,
    });

    const tx = this.repo.create({
      userId,
      classification: dto.classification,
      type,
      amount: dto.amount,
      currency,
      amountBase,
      exchangeRate,
      baseCurrency,
      description: dto.description ?? null,
      notes: dto.notes ?? null,
      categoryId: dto.categoryId ?? null,
      date: dto.date ?? this.buildTodayDateString(),
      isRecurring: dto.isRecurring ?? false,
      recurrenceFrequency: dto.isRecurring ? dto.recurrenceFrequency ?? null : null,
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

  async update(userId: string, id: string, dto: UpdateTransactionDto): Promise<Transaction> {
    const existing = await this.findOne(userId, id);

    const patch: Partial<Transaction> = {};
    if (dto.classification !== undefined) {
      patch.classification = dto.classification;
      // La clasificación es la fuente de verdad: el tipo se re-deriva siempre.
      patch.type = CLASSIFICATION_TO_TYPE[dto.classification];
    }
    if (dto.amount !== undefined) patch.amount = dto.amount;
    if (dto.currency !== undefined) patch.currency = dto.currency.toUpperCase();
    if (dto.description !== undefined) patch.description = dto.description;
    if (dto.notes !== undefined) patch.notes = dto.notes;
    if (dto.categoryId !== undefined) patch.categoryId = dto.categoryId;
    if (dto.date !== undefined) patch.date = dto.date;
    if (dto.isRecurring !== undefined) {
      patch.isRecurring = dto.isRecurring;
      patch.recurrenceFrequency = dto.isRecurring ? dto.recurrenceFrequency ?? null : null;
    } else if (dto.recurrenceFrequency !== undefined) {
      patch.recurrenceFrequency = dto.recurrenceFrequency;
    }

    // Si cambia monto, moneda o tipo (por clasificación), se recalcula la
    // conversión a moneda base para mantener consistentes los reportes.
    if (
      dto.amount !== undefined ||
      dto.currency !== undefined ||
      dto.classification !== undefined
    ) {
      const baseCurrency =
        existing.baseCurrency || (await this.resolveBaseCurrency(userId));
      const { amountBase, exchangeRate } = this.conversion.convertToBase({
        amount: patch.amount ?? existing.amount,
        currency: patch.currency ?? existing.currency,
        type: patch.type ?? existing.type,
        baseCurrency,
      });
      patch.amountBase = amountBase;
      patch.exchangeRate = exchangeRate;
      patch.baseCurrency = baseCurrency;
    }

    if (Object.keys(patch).length > 0) {
      await this.repo.update({ id, userId }, patch);
    }
    return this.findOne(userId, id);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOne(userId, id);
    await this.repo.softDelete({ id, userId });
  }

  async getMonthlySummary(
    userId: string,
    year?: number,
    month?: number,
  ): Promise<TransactionSummary> {
    const now = new Date();
    const resolvedYear = this.toPositiveInt(year) ?? now.getFullYear();
    const resolvedMonth = this.toPositiveInt(month) ?? now.getMonth() + 1;

    const start = `${resolvedYear}-${String(resolvedMonth).padStart(2, '0')}-01`;
    const endDate = new Date(resolvedYear, resolvedMonth, 0);
    const end = `${resolvedYear}-${String(resolvedMonth).padStart(2, '0')}-${String(
      endDate.getDate(),
    ).padStart(2, '0')}`;

    const txs = await this.repo.find({
      where: { userId, date: Between(start, end) },
    });

    // Se suma SIEMPRE el monto en moneda base (amountBase). Fallback a `amount`
    // solo para filas antiguas aún sin convertir (previas a la migración).
    const baseAmount = (tx: Transaction) => Number(tx.amountBase ?? tx.amount);

    const sumBy = (classification: TransactionClassification) =>
      txs
        .filter((tx) => tx.classification === classification)
        .reduce((acc, tx) => acc + baseAmount(tx), 0);

    const totalRegularIncome = sumBy(TransactionClassification.REGULAR_INCOME);
    const totalExtraIncome = sumBy(TransactionClassification.EXTRA_INCOME);
    const totalFixedExpenses = sumBy(TransactionClassification.FIXED_EXPENSE);
    const totalVariableExpenses = sumBy(TransactionClassification.VARIABLE_EXPENSE);

    // Fallback por compatibilidad: rows antiguas sin clasificación se suman por type.
    const legacyIncome = txs
      .filter((tx) => !tx.classification && tx.type === TransactionType.INCOME)
      .reduce((acc, tx) => acc + baseAmount(tx), 0);
    const legacyExpense = txs
      .filter((tx) => !tx.classification && tx.type === TransactionType.EXPENSE)
      .reduce((acc, tx) => acc + baseAmount(tx), 0);

    const totalIncome = this.round2(totalRegularIncome + totalExtraIncome + legacyIncome);
    const totalExpenses = this.round2(
      totalFixedExpenses + totalVariableExpenses + legacyExpense,
    );
    const balance = this.round2(totalIncome - totalExpenses);

    return {
      year: resolvedYear,
      month: resolvedMonth,
      totalIncome,
      totalRegularIncome: this.round2(totalRegularIncome + legacyIncome),
      totalExtraIncome: this.round2(totalExtraIncome),
      totalExpenses,
      totalFixedExpenses: this.round2(totalFixedExpenses),
      totalVariableExpenses: this.round2(totalVariableExpenses + legacyExpense),
      balance,
      savingsRate: totalIncome > 0 ? this.round2((balance / totalIncome) * 100) : 0,
      transactionCount: txs.length,
    };
  }

  /** Moneda base del usuario (moneda principal del perfil; DOP por defecto). */
  private async resolveBaseCurrency(userId: string): Promise<string> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'primaryCurrency'],
    });
    return (user?.primaryCurrency || BASE_CURRENCY).toUpperCase();
  }

  private toPositiveInt(value?: number): number | undefined {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
  }

  private buildTodayDateString(): string {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
      today.getDate(),
    ).padStart(2, '0')}`;
  }

  private round2(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
