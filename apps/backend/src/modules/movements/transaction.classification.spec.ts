import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  Transaction,
  TransactionClassification,
  TransactionType,
} from './entities/transaction.entity';
import { User } from '../user/entities/user.entity';
import { TransactionService } from './transaction.service';
import { CurrencyConversionService } from './currency-conversion.service';
import { FilterTransactionsUseCase } from './use-cases/cu-011-filter-movements.use-case';

describe('TransactionService - clasificación y resumen', () => {
  let service: TransactionService;
  let repo: Repository<Transaction>;

  const userId = 'user-123';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionService,
        CurrencyConversionService,
        FilterTransactionsUseCase,
        {
          provide: getRepositoryToken(Transaction),
          useValue: {
            create: jest.fn((data: any) => data),
            save: jest.fn((tx: any) => ({ id: 'tx-1', ...tx })),
            find: jest.fn(),
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(async () => ({ id: userId, primaryCurrency: 'DOP' })),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn(() => undefined) },
        },
      ],
    }).compile();

    service = module.get(TransactionService);
    repo = module.get(getRepositoryToken(Transaction));
  });

  describe('create - derivación de tipo desde clasificación', () => {
    it.each([
      [TransactionClassification.REGULAR_INCOME, TransactionType.INCOME],
      [TransactionClassification.EXTRA_INCOME, TransactionType.INCOME],
      [TransactionClassification.FIXED_EXPENSE, TransactionType.EXPENSE],
      [TransactionClassification.VARIABLE_EXPENSE, TransactionType.EXPENSE],
    ])('deriva type para %s', async (classification, expectedType) => {
      await service.create(userId, { classification, amount: 100 } as any);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ classification, type: expectedType, userId }),
      );
    });

    it('normaliza la moneda ingresada a mayúsculas y deja `currency` en base (DOP)', async () => {
      await service.create(userId, {
        classification: TransactionClassification.REGULAR_INCOME,
        amount: 100,
        currency: 'usd',
      } as any);
      // `amount`/`currency` quedan en base; lo ingresado va a original_*.
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ currency: 'DOP', originalCurrency: 'USD' }),
      );

      await service.create(userId, {
        classification: TransactionClassification.REGULAR_INCOME,
        amount: 100,
      } as any);
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ currency: 'DOP', originalCurrency: 'DOP' }),
      );
    });
  });

  describe('getMonthlySummary - totales por clasificación', () => {
    const tx = (
      classification: TransactionClassification,
      type: TransactionType,
      amount: number,
    ): Partial<Transaction> => ({ classification, type, amount });

    it('separa ingresos, ingresos extra, gastos fijos y variables', async () => {
      jest.spyOn(repo, 'find').mockResolvedValue([
        tx(TransactionClassification.REGULAR_INCOME, TransactionType.INCOME, 30000),
        tx(TransactionClassification.EXTRA_INCOME, TransactionType.INCOME, 5000),
        tx(TransactionClassification.FIXED_EXPENSE, TransactionType.EXPENSE, 12000),
        tx(TransactionClassification.VARIABLE_EXPENSE, TransactionType.EXPENSE, 8000),
        tx(TransactionClassification.VARIABLE_EXPENSE, TransactionType.EXPENSE, 2000),
      ] as Transaction[]);

      const summary = await service.getMonthlySummary(userId, 2026, 6);

      expect(summary.totalRegularIncome).toBe(30000);
      expect(summary.totalExtraIncome).toBe(5000);
      expect(summary.totalIncome).toBe(35000);
      expect(summary.totalFixedExpenses).toBe(12000);
      expect(summary.totalVariableExpenses).toBe(10000);
      expect(summary.totalExpenses).toBe(22000);
      expect(summary.balance).toBe(13000);
      expect(summary.transactionCount).toBe(5);
      expect(summary.year).toBe(2026);
      expect(summary.month).toBe(6);
    });

    it('devuelve ceros cuando no hay transacciones', async () => {
      jest.spyOn(repo, 'find').mockResolvedValue([]);

      const summary = await service.getMonthlySummary(userId, 2026, 6);

      expect(summary.totalIncome).toBe(0);
      expect(summary.totalExpenses).toBe(0);
      expect(summary.balance).toBe(0);
      expect(summary.savingsRate).toBe(0);
      expect(summary.transactionCount).toBe(0);
    });

    it('considera filas legacy sin clasificación según su type', async () => {
      jest.spyOn(repo, 'find').mockResolvedValue([
        { classification: null, type: TransactionType.INCOME, amount: 1000 },
        { classification: null, type: TransactionType.EXPENSE, amount: 400 },
      ] as unknown as Transaction[]);

      const summary = await service.getMonthlySummary(userId, 2026, 6);

      expect(summary.totalIncome).toBe(1000);
      expect(summary.totalExpenses).toBe(400);
      expect(summary.balance).toBe(600);
    });
  });
});
