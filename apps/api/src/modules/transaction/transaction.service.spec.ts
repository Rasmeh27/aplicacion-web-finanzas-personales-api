import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FindManyOptions, FindOptionsWhere, Repository } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  Transaction,
  TransactionType,
} from './entities/transaction.entity';
import { TransactionService } from './transaction.service';
import { FilterTransactionDto } from './dto/filter-transaction.dto';
import { FilterTransactionsUseCase } from './use-cases/filter-transactions.use-case';

describe('TransactionService - Filtering (CU-011)', () => {
  let service: TransactionService;
  let repo: Repository<Transaction>;

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
    amount: 50,
    currency: 'DOP',
    description: 'Test transaction',
    date: '2026-05-15',
    categoryId,
    category: { id: categoryId, name: 'Alimentación' } as any,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: null,
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionService,
        FilterTransactionsUseCase,
        {
          provide: getRepositoryToken(Transaction),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TransactionService>(TransactionService);
    repo = module.get<Repository<Transaction>>(getRepositoryToken(Transaction));
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
});
