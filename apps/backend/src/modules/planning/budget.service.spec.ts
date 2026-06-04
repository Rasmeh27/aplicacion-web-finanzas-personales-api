import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { IsNull, Repository } from 'typeorm';
import { Category, CategoryType } from './entities/category.entity';
import { Budget } from './entities/budget.entity';
import { Transaction, TransactionType } from '../movements/entities/transaction.entity';
import { BudgetService } from './budget.service';
import { CreateCategoryBudgetUseCase } from './use-cases/cu-013-create-category-budget.use-case';
import { CreateMonthlyBudgetUseCase } from './use-cases/cu-012-create-monthly-budget.use-case';
import { ViewBudgetProgressUseCase } from './use-cases/cu-014-view-budget-progress.use-case';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { CreateCategoryBudgetDto } from './dto/create-category-budget.dto';

describe('BudgetService - Budget planning (CU-012/CU-013/CU-014)', () => {
  let service: BudgetService;
  let repo: Repository<Budget>;
  let categoryRepo: Repository<Category>;
  let movementRepo: Repository<Transaction>;

  const userId = '550e8400-e29b-41d4-a716-446655440000';
  const categoryId = '550e8400-e29b-41d4-a716-446655440001';

  const dto: CreateBudgetDto = {
    month: 6,
    year: 2026,
    limitAmount: 25000,
    currency: 'dop',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetService,
        CreateMonthlyBudgetUseCase,
        CreateCategoryBudgetUseCase,
        ViewBudgetProgressUseCase,
        {
          provide: getRepositoryToken(Budget),
          useValue: {
            create: jest.fn((data: Partial<Budget>) => data),
            save: jest.fn((budget: Partial<Budget>) => ({
              id: 'budget-123',
              ...budget,
              createdAt: new Date('2026-06-03T00:00:00.000Z'),
              updatedAt: new Date('2026-06-03T00:00:00.000Z'),
            })),
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Category),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Transaction),
          useValue: {
            find: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BudgetService>(BudgetService);
    repo = module.get<Repository<Budget>>(getRepositoryToken(Budget));
    categoryRepo = module.get<Repository<Category>>(getRepositoryToken(Category));
    movementRepo = module.get<Repository<Transaction>>(getRepositoryToken(Transaction));
  });

  it('crea el presupuesto mensual general usando la tabla budgets', async () => {
    jest.spyOn(repo, 'findOne').mockResolvedValue(null);

    const result = await service.create(userId, dto);

    expect(repo.create).toHaveBeenCalledWith({
      userId,
      categoryId: null,
      name: 'Presupuesto mensual 06/2026',
      periodMonth: '2026-06-01',
      limitAmount: 25000,
      currency: 'DOP',
    });
    expect(repo.save).toHaveBeenCalled();
    expect(result.periodMonth).toBe('2026-06-01');
  });

  it('usa el nombre enviado por el usuario cuando existe', async () => {
    jest.spyOn(repo, 'findOne').mockResolvedValue(null);

    await service.create(userId, {
      ...dto,
      name: 'Junio controlado',
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Junio controlado',
      }),
    );
  });

  it('consulta duplicados por usuario, mes y presupuesto general', async () => {
    jest.spyOn(repo, 'findOne').mockResolvedValue(null);

    await service.create(userId, dto);

    expect(repo.findOne).toHaveBeenCalledWith({
      where: {
        userId,
        categoryId: IsNull(),
        periodMonth: '2026-06-01',
      },
    });
  });

  it('no permite dos presupuestos mensuales generales para el mismo periodo', async () => {
    jest.spyOn(repo, 'findOne').mockResolvedValue({
      id: 'budget-123',
      userId,
      categoryId: null,
      name: 'Presupuesto mensual 06/2026',
      periodMonth: '2026-06-01',
      limitAmount: 25000,
      currency: 'DOP',
    } as Budget);

    await expect(service.create(userId, dto)).rejects.toThrow(BadRequestException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('lista los presupuestos del usuario ordenados por periodo', async () => {
    jest.spyOn(repo, 'find').mockResolvedValue([]);

    await service.findAll(userId);

    expect(repo.find).toHaveBeenCalledWith({
      where: { userId },
      relations: ['category'],
      order: {
        periodMonth: 'DESC',
        createdAt: 'DESC',
      },
    });
  });

  it('crea presupuesto por categoria usando category_id real de budgets', async () => {
    const categoryBudgetDto: CreateCategoryBudgetDto = {
      categoryId,
      month: 6,
      year: 2026,
      limitAmount: 8500,
      currency: 'dop',
    };

    jest.spyOn(categoryRepo, 'findOne').mockResolvedValue({
      id: categoryId,
      userId,
      name: 'Comida',
      type: CategoryType.EXPENSE,
    } as Category);
    jest.spyOn(repo, 'findOne').mockResolvedValue(null);

    const result = await service.createByCategory(userId, categoryBudgetDto);

    expect(categoryRepo.findOne).toHaveBeenCalledWith({
      where: {
        id: categoryId,
        userId,
      },
    });
    expect(repo.create).toHaveBeenCalledWith({
      userId,
      categoryId,
      name: 'Presupuesto Comida 06/2026',
      periodMonth: '2026-06-01',
      limitAmount: 8500,
      currency: 'DOP',
    });
    expect(result.categoryId).toBe(categoryId);
  });

  it('usa el nombre enviado en presupuesto por categoria', async () => {
    jest.spyOn(categoryRepo, 'findOne').mockResolvedValue({
      id: categoryId,
      userId,
      name: 'Comida',
      type: CategoryType.EXPENSE,
    } as Category);
    jest.spyOn(repo, 'findOne').mockResolvedValue(null);

    await service.createByCategory(userId, {
      categoryId,
      month: 6,
      year: 2026,
      limitAmount: 8500,
      name: 'Comida junio',
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Comida junio',
      }),
    );
  });

  it('no permite presupuesto por categoria si la categoria no pertenece al usuario', async () => {
    jest.spyOn(categoryRepo, 'findOne').mockResolvedValue(null);

    await expect(
      service.createByCategory(userId, {
        categoryId,
        month: 6,
        year: 2026,
        limitAmount: 8500,
      }),
    ).rejects.toThrow(NotFoundException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('no permite presupuesto por categoria de ingreso', async () => {
    jest.spyOn(categoryRepo, 'findOne').mockResolvedValue({
      id: categoryId,
      userId,
      name: 'Salario',
      type: CategoryType.INCOME,
    } as Category);

    await expect(
      service.createByCategory(userId, {
        categoryId,
        month: 6,
        year: 2026,
        limitAmount: 8500,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('no permite dos presupuestos para la misma categoria y periodo', async () => {
    jest.spyOn(categoryRepo, 'findOne').mockResolvedValue({
      id: categoryId,
      userId,
      name: 'Comida',
      type: CategoryType.EXPENSE,
    } as Category);
    jest.spyOn(repo, 'findOne').mockResolvedValue({
      id: 'budget-123',
      userId,
      categoryId,
      name: 'Presupuesto Comida 06/2026',
      periodMonth: '2026-06-01',
      limitAmount: 8500,
      currency: 'DOP',
    } as Budget);

    await expect(
      service.createByCategory(userId, {
        categoryId,
        month: 6,
        year: 2026,
        limitAmount: 8500,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('consulta el avance del presupuesto mensual usando movimientos de gasto del periodo', async () => {
    jest.spyOn(repo, 'find').mockResolvedValue([
      {
        id: 'budget-monthly',
        userId,
        categoryId: null,
        name: 'Presupuesto mensual 06/2026',
        periodMonth: '2026-06-01',
        limitAmount: 25000,
        currency: 'DOP',
      } as Budget,
    ]);
    jest.spyOn(movementRepo, 'find').mockResolvedValue([
      {
        userId,
        type: TransactionType.EXPENSE,
        amount: 4500,
        date: '2026-06-05',
        categoryId,
      } as Transaction,
      {
        userId,
        type: TransactionType.EXPENSE,
        amount: '1500.50' as unknown as number,
        date: '2026-06-10',
        categoryId: null,
      } as Transaction,
    ]);

    const result = await service.viewProgress(userId, 2026, 6);

    expect(repo.find).toHaveBeenCalledWith({
      where: {
        userId,
        periodMonth: '2026-06-01',
      },
      relations: ['category'],
      order: {
        categoryId: 'ASC',
        createdAt: 'ASC',
      },
    });
    expect(movementRepo.find).toHaveBeenCalledWith({
      where: expect.objectContaining({
        userId,
        type: TransactionType.EXPENSE,
      }),
    });
    expect(result).toEqual({
      periodMonth: '2026-06-01',
      budgets: [
        {
          id: 'budget-monthly',
          name: 'Presupuesto mensual 06/2026',
          categoryId: null,
          categoryName: null,
          periodMonth: '2026-06-01',
          limitAmount: 25000,
          spentAmount: 6000.5,
          remainingAmount: 18999.5,
          progressPercentage: 24,
          isExceeded: false,
          currency: 'DOP',
        },
      ],
    });
  });

  it('calcula el avance por categoria y marca cuando el limite fue excedido', async () => {
    jest.spyOn(repo, 'find').mockResolvedValue([
      {
        id: 'budget-food',
        userId,
        categoryId,
        category: {
          id: categoryId,
          userId,
          name: 'Comida',
          type: CategoryType.EXPENSE,
        },
        name: 'Presupuesto Comida 06/2026',
        periodMonth: '2026-06-01',
        limitAmount: 5000,
        currency: 'DOP',
      } as Budget,
    ]);
    jest.spyOn(movementRepo, 'find').mockResolvedValue([
      {
        userId,
        type: TransactionType.EXPENSE,
        amount: 3000,
        date: '2026-06-05',
        categoryId,
      } as Transaction,
      {
        userId,
        type: TransactionType.EXPENSE,
        amount: 2500,
        date: '2026-06-14',
        categoryId,
      } as Transaction,
      {
        userId,
        type: TransactionType.EXPENSE,
        amount: 1200,
        date: '2026-06-20',
        categoryId: 'other-category',
      } as Transaction,
    ]);

    const result = await service.viewProgress(userId, 2026, 6);

    expect(result.budgets[0]).toEqual({
      id: 'budget-food',
      name: 'Presupuesto Comida 06/2026',
      categoryId,
      categoryName: 'Comida',
      periodMonth: '2026-06-01',
      limitAmount: 5000,
      spentAmount: 5500,
      remainingAmount: -500,
      progressPercentage: 110,
      isExceeded: true,
      currency: 'DOP',
    });
  });
});
