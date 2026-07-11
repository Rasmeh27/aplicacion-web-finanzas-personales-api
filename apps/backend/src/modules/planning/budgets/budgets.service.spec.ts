import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Repository } from 'typeorm';
import { Budget } from '../entities/budget.entity';
import { Category, CategoryType } from '../entities/category.entity';
import {
  Transaction,
  TransactionClassification,
  TransactionType,
} from '../../movements/entities/transaction.entity';
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto } from './dto/create-budget.dto';

describe('BudgetsService - presupuestos mensuales por categoría', () => {
  let service: BudgetsService;
  let budgetRepo: Repository<Budget>;
  let categoryRepo: Repository<Category>;
  let txRepo: Repository<Transaction>;

  const userId = '550e8400-e29b-41d4-a716-446655440000';
  const categoryId = '550e8400-e29b-41d4-a716-446655440001';

  const expenseCategory = {
    id: categoryId,
    userId,
    name: 'Comida',
    type: CategoryType.EXPENSE,
  } as Category;

  const validDto: CreateBudgetDto = {
    categoryId,
    month: 6,
    year: 2026,
    amountLimit: 8000,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetsService,
        {
          provide: getRepositoryToken(Budget),
          useValue: {
            create: jest.fn((data: Partial<Budget>) => data),
            save: jest.fn((b: Partial<Budget> | Partial<Budget>[]) =>
              Array.isArray(b)
                ? b.map((item, index) => ({ id: `budget-${index + 1}`, ...item }))
                : { id: 'budget-1', ...b },
            ),
            find: jest.fn(),
            findAndCount: jest.fn(),
            findOne: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Category),
          useValue: { findOne: jest.fn(), count: jest.fn() },
        },
        {
          provide: getRepositoryToken(Transaction),
          useValue: { find: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(BudgetsService);
    budgetRepo = module.get(getRepositoryToken(Budget));
    categoryRepo = module.get(getRepositoryToken(Category));
    txRepo = module.get(getRepositoryToken(Transaction));
  });

  describe('create', () => {
    it('crea un presupuesto válido por categoría de gasto', async () => {
      jest.spyOn(categoryRepo, 'findOne').mockResolvedValue(expenseCategory);
      jest.spyOn(txRepo, 'find').mockResolvedValue([]);
      jest.spyOn(budgetRepo, 'find')
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
          id: 'budget-1',
          userId,
          categoryId,
          name: 'Presupuesto Comida 06/2026',
          periodMonth: '2026-06-01',
          month: 6,
          year: 2026,
          limitAmount: 8000,
          currency: 'DOP',
          alertThresholdPct: 80,
          isActive: true,
          category: expenseCategory,
          } as Budget,
        ]);

      const result = await service.create(userId, validDto);

      expect(budgetRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          categoryId,
          periodMonth: '2026-06-01',
          month: 6,
          year: 2026,
          limitAmount: 8000,
          currency: 'DOP',
          alertThresholdPct: 80,
          isActive: true,
          periodType: 'monthly',
        }),
      );
      expect(result).toHaveLength(1);
      expect(result[0].amountLimit).toBe(8000);
      expect(result[0].status).toBe('safe');
    });

    it('rechaza amountLimit <= 0 a nivel servicio no aplica (lo valida el DTO); pero rechaza categoría de ingreso', async () => {
      jest.spyOn(categoryRepo, 'findOne').mockResolvedValue({
        ...expenseCategory,
        type: CategoryType.INCOME,
      } as Category);

      await expect(service.create(userId, validDto)).rejects.toThrow(BadRequestException);
      expect(budgetRepo.save).not.toHaveBeenCalled();
    });

    it('rechaza presupuesto para categoría inexistente / de otro usuario', async () => {
      jest.spyOn(categoryRepo, 'findOne').mockResolvedValue(null);

      await expect(service.create(userId, validDto)).rejects.toThrow(NotFoundException);
      expect(budgetRepo.save).not.toHaveBeenCalled();
    });

    it('rechaza un segundo presupuesto activo para la misma categoría/mes/año', async () => {
      jest.spyOn(categoryRepo, 'findOne').mockResolvedValue(expenseCategory);
      jest.spyOn(budgetRepo, 'find').mockResolvedValue([
        {
          id: 'existing',
          userId,
          categoryId,
          periodMonth: '2026-06-01',
          month: 6,
          year: 2026,
          isActive: true,
        } as Budget,
      ]);

      await expect(service.create(userId, validDto)).rejects.toThrow(BadRequestException);
      expect(budgetRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('calculateBudgetUsage', () => {
    const budget = (limit: number, threshold = 80) =>
      ({ limitAmount: limit, alertThresholdPct: threshold } as Budget);

    it('calcula spent desde transactions y remaining/usagePct', async () => {
      const usage = service.calculateBudgetUsage(budget(8000), 2000);
      expect(usage.spentAmount).toBe(2000);
      expect(usage.remainingAmount).toBe(6000);
      expect(usage.usagePct).toBe(25);
      expect(usage.status).toBe('safe');
    });

    it('marca warning cuando se alcanza el umbral de alerta', () => {
      const usage = service.calculateBudgetUsage(budget(1000, 80), 850);
      expect(usage.usagePct).toBe(85);
      expect(usage.status).toBe('warning');
    });

    it('marca exceeded y remaining negativo cuando supera el límite', () => {
      const usage = service.calculateBudgetUsage(budget(1000), 1270);
      expect(usage.usagePct).toBe(127);
      expect(usage.remainingAmount).toBe(-270);
      expect(usage.status).toBe('exceeded');
    });

    it('usagePct 0 cuando no hay gasto', () => {
      const usage = service.calculateBudgetUsage(budget(1000), 0);
      expect(usage.usagePct).toBe(0);
      expect(usage.status).toBe('safe');
    });
  });

  describe('findAll', () => {
    it('calcula spentAmount sumando gastos reales de la categoría en el periodo', async () => {
      jest.spyOn(budgetRepo, 'findAndCount').mockResolvedValue([
        [
          {
            id: 'budget-1',
            userId,
            categoryId,
            name: 'Presupuesto Comida 06/2026',
            periodMonth: '2026-06-01',
            month: 6,
            year: 2026,
            limitAmount: 5000,
            currency: 'DOP',
            alertThresholdPct: 80,
            isActive: true,
            category: expenseCategory,
          } as Budget,
        ],
        1,
      ]);
      jest.spyOn(txRepo, 'find').mockResolvedValue([
        {
          userId,
          type: TransactionType.EXPENSE,
          classification: TransactionClassification.FIXED_EXPENSE,
          amount: 3000,
          date: '2026-06-05',
          categoryId,
        } as Transaction,
        {
          userId,
          type: TransactionType.EXPENSE,
          classification: TransactionClassification.VARIABLE_EXPENSE,
          amount: 1500,
          date: '2026-06-12',
          categoryId,
        } as Transaction,
        {
          userId,
          type: TransactionType.EXPENSE,
          amount: 999,
          date: '2026-06-15',
          categoryId: 'otra-categoria',
        } as Transaction,
      ]);

      const result = await service.findAll(userId, { month: 6, year: 2026 });

      expect(result.items).toHaveLength(1);
      const view = result.items[0];
      expect(view.spentAmount).toBe(4500); // fixed + variable de la categoría
      expect(view.remainingAmount).toBe(500);
      expect(view.usagePct).toBe(90);
      expect(view.status).toBe('warning');
    });
  });

  describe('getSummary', () => {
    it('agrega totales y cuenta por estado', async () => {
      jest.spyOn(budgetRepo, 'find').mockResolvedValue([
        {
          id: 'b1',
          userId,
          categoryId,
          periodMonth: '2026-06-01',
          month: 6,
          year: 2026,
          limitAmount: 5000,
          currency: 'DOP',
          alertThresholdPct: 80,
          isActive: true,
        } as Budget,
        {
          id: 'b2',
          userId,
          categoryId: 'cat-2',
          periodMonth: '2026-06-01',
          month: 6,
          year: 2026,
          limitAmount: 2000,
          currency: 'DOP',
          alertThresholdPct: 80,
          isActive: true,
        } as Budget,
      ]);
      jest.spyOn(txRepo, 'find').mockResolvedValue([
        { userId, type: TransactionType.EXPENSE, amount: 5500, date: '2026-06-05', categoryId } as Transaction,
        { userId, type: TransactionType.EXPENSE, amount: 500, date: '2026-06-06', categoryId: 'cat-2' } as Transaction,
      ]);
      jest.spyOn(categoryRepo, 'count').mockResolvedValue(5);

      const summary = await service.getSummary(userId, 6, 2026);

      expect(summary.totalBudgeted).toBe(7000);
      expect(summary.totalSpent).toBe(6000);
      expect(summary.totalRemaining).toBe(1000);
      expect(summary.activeBudgetsCount).toBe(2);
      expect(summary.exceededBudgetsCount).toBe(1); // b1: 5500/5000 = 110%
      expect(summary.safeBudgetsCount).toBe(1); // b2: 500/2000 = 25%
      expect(summary.categoriesWithoutBudget).toBe(3); // 5 categorías de gasto - 2 presupuestadas
    });
  });

  describe('aislamiento por usuario', () => {
    it('findOne lanza NotFound si el presupuesto no es del usuario', async () => {
      jest.spyOn(budgetRepo, 'findOne').mockResolvedValue(null);

      await expect(service.findOne(userId, 'budget-x')).rejects.toThrow(NotFoundException);
      expect(budgetRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'budget-x', userId } }),
      );
    });

    it('remove hace soft delete (isActive=false) validando propiedad', async () => {
      jest.spyOn(budgetRepo, 'findOne').mockResolvedValue({
        id: 'budget-1',
        userId,
        categoryId,
        isActive: true,
      } as Budget);

      const result = await service.remove(userId, 'budget-1');

      expect(result).toEqual({ id: 'budget-1', isActive: false });
      expect(budgetRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'budget-1', isActive: false }),
      );
    });
  });
});
