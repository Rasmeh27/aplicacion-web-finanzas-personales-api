import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { IsNull, Repository } from 'typeorm';
import { Budget } from './entities/budget.entity';
import { BudgetService } from './budget.service';
import { CreateMonthlyBudgetUseCase } from './use-cases/create-monthly-budget.use-case';
import { CreateBudgetDto } from './dto/create-budget.dto';

describe('BudgetService - Monthly budget (CU-012)', () => {
  let service: BudgetService;
  let repo: Repository<Budget>;

  const userId = '550e8400-e29b-41d4-a716-446655440000';

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
      ],
    }).compile();

    service = module.get<BudgetService>(BudgetService);
    repo = module.get<Repository<Budget>>(getRepositoryToken(Budget));
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
});
