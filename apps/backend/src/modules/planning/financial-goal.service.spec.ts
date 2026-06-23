import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { DataSource, Repository } from 'typeorm';
import { CreateFinancialGoalDto } from './dto/create-financial-goal.dto';
import {
  FinancialGoal,
  FinancialGoalStatus,
} from './entities/financial-goal.entity';
import { GoalContribution } from './entities/goal-contribution.entity';
import { User } from '../user/entities/user.entity';
import { FinancialGoalService } from './financial-goal.service';
import { CreateFinancialGoalUseCase } from './use-cases/cu-015-create-financial-goal.use-case';

describe('FinancialGoalService - Financial goals (CU-015)', () => {
  let service: FinancialGoalService;
  let repo: Repository<FinancialGoal>;

  const userId = '550e8400-e29b-41d4-a716-446655440000';

  const dto: CreateFinancialGoalDto = {
    name: 'Fondo de emergencia',
    targetAmount: 50000,
    currentAmount: 5000,
    currency: 'dop',
    targetDate: '2099-12-31',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinancialGoalService,
        CreateFinancialGoalUseCase,
        {
          provide: getRepositoryToken(FinancialGoal),
          useValue: {
            create: jest.fn((data: Partial<FinancialGoal>) => data),
            save: jest.fn((goal: Partial<FinancialGoal>) => ({
              id: 'goal-123',
              ...goal,
              createdAt: new Date('2026-06-03T00:00:00.000Z'),
              updatedAt: new Date('2026-06-03T00:00:00.000Z'),
            })),
            find: jest.fn(),
            findOne: jest.fn(),
            count: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(GoalContribution),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<FinancialGoalService>(FinancialGoalService);
    repo = module.get<Repository<FinancialGoal>>(getRepositoryToken(FinancialGoal));
  });

  it('crea una meta financiera usando la tabla financial_goals', async () => {
    const result = await service.create(userId, dto);

    expect(repo.create).toHaveBeenCalledWith({
      userId,
      name: 'Fondo de emergencia',
      targetAmount: 50000,
      currentAmount: 5000,
      currency: 'DOP',
      targetDate: '2099-12-31',
      status: FinancialGoalStatus.ACTIVE,
    });
    expect(repo.save).toHaveBeenCalled();
    expect(result.id).toBe('goal-123');
  });

  it('usa DOP y monto actual 0 cuando no se envian opcionales', async () => {
    await service.create(userId, {
      name: 'Viaje',
      targetAmount: 30000,
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        currentAmount: 0,
        currency: 'DOP',
        targetDate: null,
        status: FinancialGoalStatus.ACTIVE,
      }),
    );
  });

  it('marca la meta como completada si el monto actual alcanza el objetivo', async () => {
    await service.create(userId, {
      name: 'Laptop',
      targetAmount: 40000,
      currentAmount: 40000,
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: FinancialGoalStatus.COMPLETED,
      }),
    );
  });

  it('limpia espacios del nombre antes de guardar', async () => {
    await service.create(userId, {
      name: '  Fondo casa  ',
      targetAmount: 200000,
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Fondo casa',
      }),
    );
  });

  it('no permite nombres vacios despues de limpiar espacios', async () => {
    await expect(
      service.create(userId, {
        name: '   ',
        targetAmount: 10000,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('no permite monto actual mayor que el monto objetivo', async () => {
    await expect(
      service.create(userId, {
        name: 'Meta invalida',
        targetAmount: 10000,
        currentAmount: 12000,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('no permite fecha objetivo en el pasado', async () => {
    await expect(
      service.create(userId, {
        name: 'Meta vieja',
        targetAmount: 10000,
        targetDate: '2001-01-01',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(repo.save).not.toHaveBeenCalled();
  });
});
