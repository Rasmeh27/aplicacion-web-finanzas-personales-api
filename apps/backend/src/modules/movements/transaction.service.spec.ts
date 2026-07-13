import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { FindManyOptions, FindOptionsWhere, Repository } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  Transaction,
  TransactionClassification,
  TransactionType,
} from './entities/transaction.entity';
import { User } from '../user/entities/user.entity';
import { TransactionService } from './transaction.service';
import { CurrencyConversionService } from './currency-conversion.service';
import { FilterTransactionDto } from './dto/filter-transaction.dto';
import { FilterTransactionsUseCase } from './use-cases/cu-011-filter-movements.use-case';

describe('TransactionService - Filtering (CU-011)', () => {
  let service: TransactionService;
  let repo: Repository<Transaction>;
  let userRepo: Repository<User>;

  const userId = 'user-123';
  const categoryId = '550e8400-e29b-41d4-a716-446655440000';

  const getFindAndCountOptions = (): FindManyOptions<Transaction> =>
    (repo.findAndCount as jest.MockedFunction<typeof repo.findAndCount>).mock
      .calls[0][0];

  const getFindAndCountWhere = (): FindOptionsWhere<Transaction> =>
    getFindAndCountOptions().where as FindOptionsWhere<Transaction>;

  const mockTransaction = (
    overrides: Partial<Transaction> = {},
  ): Transaction => ({
    id: '550e8400-e29b-41d4-a716-446655440000',
    userId,
    type: TransactionType.EXPENSE,
    classification: TransactionClassification.VARIABLE_EXPENSE,
    amount: 50,
    currency: 'DOP',
    originalAmount: 50,
    originalCurrency: 'DOP',
    exchangeRate: 1,
    description: 'Test transaction',
    notes: null as any,
    date: '2026-05-15',
    categoryId,
    category: { id: categoryId, name: 'Alimentación' } as any,
    isRecurring: false,
    recurrenceFrequency: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionService,
        CurrencyConversionService,
        FilterTransactionsUseCase,
        {
          provide: getRepositoryToken(Transaction),
          useValue: {
            create: jest.fn((entity: any) => entity),
            save: jest.fn((entity: any) => entity),
            find: jest.fn(),
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            // Por defecto: usuario con moneda base DOP.
            findOne: jest.fn(async () => ({ id: userId, primaryCurrency: 'DOP' })),
          },
        },
        {
          // Sin overrides de entorno => usa las tasas BCRD por defecto.
          provide: ConfigService,
          useValue: { get: jest.fn(() => undefined) },
        },
      ],
    }).compile();

    service = module.get<TransactionService>(TransactionService);
    repo = module.get<Repository<Transaction>>(getRepositoryToken(Transaction));
    userRepo = module.get<Repository<User>>(getRepositoryToken(User));
  });

  describe('findAll - Filtro por Tipo (CU-011.1)', () => {
    it('debería filtrar transacciones por tipo EXPENSE', async () => {
      const transaction = mockTransaction();
      jest.spyOn(repo, 'findAndCount').mockResolvedValue([[transaction], 1]);

      const filters: FilterTransactionDto = { type: TransactionType.EXPENSE };
      const result = await service.findAll(userId, filters);

      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: TransactionType.EXPENSE }),
        }),
      );
      expect(result.items).toHaveLength(1);
      expect(result.items[0].type).toBe(TransactionType.EXPENSE);
    });

    it('debería filtrar transacciones por tipo INCOME', async () => {
      const transaction = mockTransaction({ type: TransactionType.INCOME });
      jest.spyOn(repo, 'findAndCount').mockResolvedValue([[transaction], 1]);

      const filters: FilterTransactionDto = { type: TransactionType.INCOME };
      const result = await service.findAll(userId, filters);

      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: TransactionType.INCOME }),
        }),
      );
      expect(result.items[0].type).toBe(TransactionType.INCOME);
    });
  });

  describe('findAll - Filtro por Categoría (CU-011.2)', () => {
    it('debería filtrar transacciones por categoryId', async () => {
      const transaction = mockTransaction({ categoryId });
      jest.spyOn(repo, 'findAndCount').mockResolvedValue([[transaction], 1]);

      const filters: FilterTransactionDto = { categoryId };
      const result = await service.findAll(userId, filters);

      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ categoryId }),
        }),
      );
      expect(result.items[0].categoryId).toBe(categoryId);
    });
  });

  describe('findAll - Filtro por Rango de Fechas (CU-011.3)', () => {
    it('debería filtrar transacciones por rango de fechas', async () => {
      const transaction = mockTransaction({ date: '2026-05-15' });
      jest.spyOn(repo, 'findAndCount').mockResolvedValue([[transaction], 1]);

      const filters: FilterTransactionDto = {
        startDate: '2026-05-01',
        endDate: '2026-05-31',
      };
      const result = await service.findAll(userId, filters);

      expect(repo.findAndCount).toHaveBeenCalled();
      const where = getFindAndCountWhere();
      expect(where.date).toBeDefined();
      expect(result.items).toHaveLength(1);
    });

    it('debería lanzar BadRequestException si startDate > endDate', async () => {
      const filters: FilterTransactionDto = {
        startDate: '2026-12-31',
        endDate: '2026-01-01',
      };

      await expect(service.findAll(userId, filters)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debería permitir startDate igual a endDate', async () => {
      jest.spyOn(repo, 'findAndCount').mockResolvedValue([[], 0]);

      const filters: FilterTransactionDto = {
        startDate: '2026-05-15',
        endDate: '2026-05-15',
      };

      await expect(service.findAll(userId, filters)).resolves.not.toThrow();
    });

    it('debería filtrar desde startDate hasta hoy si solo startDate se proporciona', async () => {
      jest.spyOn(repo, 'findAndCount').mockResolvedValue([[], 0]);

      const filters: FilterTransactionDto = {
        startDate: '2026-01-01',
      };
      await service.findAll(userId, filters);

      const where = getFindAndCountWhere();
      expect(where.date).toBeDefined();
    });

    it('debería filtrar hasta endDate si solo endDate se proporciona', async () => {
      jest.spyOn(repo, 'findAndCount').mockResolvedValue([[], 0]);

      const filters: FilterTransactionDto = {
        endDate: '2026-05-31',
      };
      await service.findAll(userId, filters);

      const where = getFindAndCountWhere();
      expect(where.date).toBeDefined();
    });
  });

  describe('findAll - Filtros Combinados (CU-011.4)', () => {
    it('debería soportar filtros combinados: tipo + categoría + fechas', async () => {
      const transaction = mockTransaction({
        type: TransactionType.EXPENSE,
        categoryId,
        date: '2026-05-15',
      });
      jest.spyOn(repo, 'findAndCount').mockResolvedValue([[transaction], 1]);

      const filters: FilterTransactionDto = {
        type: TransactionType.EXPENSE,
        categoryId,
        startDate: '2026-05-01',
        endDate: '2026-05-31',
      };
      const result = await service.findAll(userId, filters);

      const where = getFindAndCountWhere();
      expect(where.type).toBe(TransactionType.EXPENSE);
      expect(where.categoryId).toBe(categoryId);
      expect(where.date).toBeDefined();
      expect(result.items).toHaveLength(1);
    });
  });

  describe('findAll - Paginación (CU-011.5)', () => {
    it('debería aplicar limit y offset correctamente', async () => {
      jest.spyOn(repo, 'findAndCount').mockResolvedValue([[], 100]);

      const filters: FilterTransactionDto = {
        limit: 20,
        offset: 40,
      };
      await service.findAll(userId, filters);

      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
          skip: 40,
        }),
      );
    });

    it('debería usar valores por defecto: limit=20, offset=0', async () => {
      jest.spyOn(repo, 'findAndCount').mockResolvedValue([[], 50]);

      await service.findAll(userId, {});

      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
          skip: 0,
        }),
      );
    });

    it('debería calcular hasMore correctamente', async () => {
      jest.spyOn(repo, 'findAndCount').mockResolvedValue([[], 100]);

      const filters: FilterTransactionDto = {
        limit: 20,
        offset: 0,
      };
      const result = await service.findAll(userId, filters);

      expect(result.hasMore).toBe(true);
      expect(result.total).toBe(100);
    });

    it('debería indicar hasMore=false cuando se llega al final', async () => {
      jest.spyOn(repo, 'findAndCount').mockResolvedValue([[], 100]);

      const filters: FilterTransactionDto = {
        limit: 50,
        offset: 80,
      };
      const result = await service.findAll(userId, filters);

      expect(result.hasMore).toBe(false);
    });
  });

  describe('findAll - Respuesta Enriquecida', () => {
    it('debería retornar metadatos de paginación en la respuesta', async () => {
      jest.spyOn(repo, 'findAndCount').mockResolvedValue([[], 42]);

      const filters: FilterTransactionDto = {
        limit: 20,
        offset: 0,
      };
      const result = await service.findAll(userId, filters);

      expect(result).toEqual(
        expect.objectContaining({
          items: [],
          total: 42,
          limit: 20,
          offset: 0,
          hasMore: true,
        }),
      );
    });

    it('debería cargar la relación category', async () => {
      jest.spyOn(repo, 'findAndCount').mockResolvedValue([[], 0]);

      await service.findAll(userId, {});

      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          relations: ['category'],
        }),
      );
    });

    it('debería ordenar por fecha DESC y createdAt DESC', async () => {
      jest.spyOn(repo, 'findAndCount').mockResolvedValue([[], 0]);

      await service.findAll(userId, {});

      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { date: 'DESC', createdAt: 'DESC' },
        }),
      );
    });
  });

  describe('findAll - Seguridad', () => {
    it('debería siempre filtrar por userId del usuario actual', async () => {
      jest.spyOn(repo, 'findAndCount').mockResolvedValue([[], 0]);

      await service.findAll('user-secure-123', {});

      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user-secure-123' }),
        }),
      );
    });

    it('no debería permitir ver transacciones de otros usuarios', async () => {
      jest.spyOn(repo, 'findAndCount').mockResolvedValue([[], 0]);

      await service.findAll(userId, {});

      const where = getFindAndCountWhere();
      expect(where.userId).toBe(userId);
    });
  });

  describe('create - Conversión de moneda (BCRD)', () => {
    it('guarda un INGRESO en USD ya convertido a DOP con la tasa de compra (58.36)', async () => {
      const created = await service.create(userId, {
        classification: TransactionClassification.EXTRA_INCOME,
        amount: 2400,
        currency: 'USD',
        description: 'Tarjeta de Credito GOLD en dolar',
      } as any);

      // `amount` queda en moneda base (DOP) y se preserva lo ingresado.
      expect(created.amount).toBe(140064); // 2400 * 58.36
      expect(created.currency).toBe('DOP');
      expect(created.originalAmount).toBe(2400);
      expect(created.originalCurrency).toBe('USD');
      expect(created.exchangeRate).toBe(58.36);
      expect(created.type).toBe(TransactionType.INCOME);
    });

    it('guarda un GASTO en USD ya convertido a DOP con la tasa de venta (58.95)', async () => {
      const created = await service.create(userId, {
        classification: TransactionClassification.VARIABLE_EXPENSE,
        amount: 100,
        currency: 'USD',
        description: 'Compra en dólares',
      } as any);

      expect(created.amount).toBe(5895); // 100 * 58.95
      expect(created.currency).toBe('DOP');
      expect(created.originalAmount).toBe(100);
      expect(created.originalCurrency).toBe('USD');
      expect(created.exchangeRate).toBe(58.95);
      expect(created.type).toBe(TransactionType.EXPENSE);
    });

    it('deja el monto igual cuando la moneda ya es la base (DOP, tasa 1)', async () => {
      const created = await service.create(userId, {
        classification: TransactionClassification.REGULAR_INCOME,
        amount: 50000,
        currency: 'DOP',
        description: 'Salario',
      } as any);

      expect(created.amount).toBe(50000);
      expect(created.currency).toBe('DOP');
      expect(created.originalAmount).toBe(50000);
      expect(created.originalCurrency).toBe('DOP');
      expect(created.exchangeRate).toBe(1);
    });

    it('resuelve la moneda base desde el perfil del usuario', async () => {
      await service.create(userId, {
        classification: TransactionClassification.REGULAR_INCOME,
        amount: 1000,
        description: 'Sin moneda enviada',
      } as any);

      expect(userRepo.findOne).toHaveBeenCalled();
    });
  });

  describe('getMonthlySummary - Conversión de moneda', () => {
    it('suma el `amount` ya convertido a moneda base', async () => {
      const usdIncome = mockTransaction({
        type: TransactionType.INCOME,
        classification: TransactionClassification.EXTRA_INCOME,
        amount: 140064, // 2400 USD ya convertido con 58.36
        currency: 'DOP',
        originalAmount: 2400,
        originalCurrency: 'USD',
        exchangeRate: 58.36,
      });
      jest.spyOn(repo, 'find').mockResolvedValue([usdIncome]);

      const summary = await service.getMonthlySummary(userId, 2026, 7);

      expect(summary.totalExtraIncome).toBe(140064);
      expect(summary.totalIncome).toBe(140064);
    });
  });
});
