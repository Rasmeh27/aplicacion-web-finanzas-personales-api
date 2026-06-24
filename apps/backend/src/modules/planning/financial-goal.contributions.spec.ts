import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  FinancialGoal,
  FinancialGoalStatus,
} from './entities/financial-goal.entity';
import { GoalContribution } from './entities/goal-contribution.entity';
import { User } from '../user/entities/user.entity';
import { FinancialGoalService } from './financial-goal.service';
import { CreateFinancialGoalUseCase } from './use-cases/cu-015-create-financial-goal.use-case';

describe('FinancialGoalService - aportes y fondo de emergencia', () => {
  let service: FinancialGoalService;
  let goalRepo: any;
  let contributionRepo: any;
  let userRepo: any;
  let dataSource: any;

  const userId = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(async () => {
    goalRepo = {
      create: jest.fn((data: any) => data),
      save: jest.fn((goal: any) => ({ id: goal.id ?? 'goal-1', ...goal })),
      find: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
    };
    contributionRepo = {
      create: jest.fn((data: any) => data),
      save: jest.fn((c: any) => ({ id: 'contrib-1', ...c })),
      find: jest.fn(),
    };
    userRepo = { findOne: jest.fn() };
    dataSource = { transaction: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinancialGoalService,
        CreateFinancialGoalUseCase,
        { provide: getRepositoryToken(FinancialGoal), useValue: goalRepo },
        { provide: getRepositoryToken(GoalContribution), useValue: contributionRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(FinancialGoalService);
  });

  describe('addContribution', () => {
    const setupTransaction = (goal: Partial<FinancialGoal>) => {
      const managerGoalRepo = {
        findOne: jest.fn<any>().mockResolvedValue(goal),
        save: jest.fn((g: any) => ({ ...g })),
      };
      const managerContribRepo = {
        create: jest.fn((data: any) => data),
        save: jest.fn((c: any) => ({ id: 'contrib-1', ...c })),
      };
      dataSource.transaction.mockImplementation(async (cb: any) =>
        cb({
          getRepository: (entity: any) =>
            entity === FinancialGoal ? managerGoalRepo : managerContribRepo,
        }),
      );
      return { managerGoalRepo, managerContribRepo };
    };

    it('crea el aporte e incrementa el currentAmount de la meta', async () => {
      const { managerContribRepo } = setupTransaction({
        id: 'goal-1',
        userId,
        targetAmount: 10000,
        currentAmount: 2000,
        currency: 'DOP',
        status: FinancialGoalStatus.ACTIVE,
      });

      const result = await service.addContribution(userId, 'goal-1', { amount: 3000 });

      expect(managerContribRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId, goalId: 'goal-1', amount: 3000 }),
      );
      expect(result.goal.currentAmount).toBe(5000);
      expect(result.goal.status).toBe(FinancialGoalStatus.ACTIVE);
      expect(result.contribution.id).toBe('contrib-1');
    });

    it('marca la meta como completada al alcanzar el objetivo', async () => {
      setupTransaction({
        id: 'goal-1',
        userId,
        targetAmount: 10000,
        currentAmount: 8000,
        currency: 'DOP',
        status: FinancialGoalStatus.ACTIVE,
      });

      const result = await service.addContribution(userId, 'goal-1', { amount: 2500 });

      expect(result.goal.currentAmount).toBe(10500);
      expect(result.goal.status).toBe(FinancialGoalStatus.COMPLETED);
    });

    it('lanza NotFoundException si la meta no existe o no es del usuario', async () => {
      setupTransaction(null as any);
      await expect(
        service.addContribution(userId, 'goal-x', { amount: 1000 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('no permite aportar a una meta cancelada', async () => {
      setupTransaction({
        id: 'goal-1',
        userId,
        targetAmount: 10000,
        currentAmount: 0,
        currency: 'DOP',
        status: FinancialGoalStatus.CANCELLED,
      });
      await expect(
        service.addContribution(userId, 'goal-1', { amount: 1000 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Fondo de emergencia', () => {
    it('ensureEmergencyFundGoal crea el fondo con 3 meses de gastos cuando hay datos', async () => {
      goalRepo.findOne.mockResolvedValue(null); // no hay meta predeterminada
      goalRepo.count.mockResolvedValue(0); // no hay metas
      userRepo.findOne.mockResolvedValue({
        id: userId,
        monthlyFixedExpenseEstimate: 15000,
        monthlyVariableExpenseEstimate: 10000,
      });

      const goal = await service.ensureEmergencyFundGoal(userId);

      expect(goalRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Fondo de emergencia',
          targetAmount: 75000, // (15000 + 10000) * 3
          isDefault: true,
          status: FinancialGoalStatus.ACTIVE,
        }),
      );
      expect(goal).not.toBeNull();
    });

    it('ensureEmergencyFundGoal NO crea nada si no hay datos de gastos', async () => {
      goalRepo.findOne.mockResolvedValue(null);
      goalRepo.count.mockResolvedValue(0);
      userRepo.findOne.mockResolvedValue({
        id: userId,
        monthlyFixedExpenseEstimate: 0,
        monthlyVariableExpenseEstimate: 0,
      });

      const goal = await service.ensureEmergencyFundGoal(userId);

      expect(goal).toBeNull();
      expect(goalRepo.create).not.toHaveBeenCalled();
    });

    it('ensureEmergencyFundGoal NO crea si ya existe la meta predeterminada', async () => {
      goalRepo.findOne.mockResolvedValue({ id: 'goal-1', isDefault: true });

      const goal = await service.ensureEmergencyFundGoal(userId);

      expect(goal).toEqual(expect.objectContaining({ id: 'goal-1' }));
      expect(goalRepo.create).not.toHaveBeenCalled();
    });

    it('configureEmergencyFund usa el monto sugerido cuando no se envía targetAmount', async () => {
      goalRepo.findOne.mockResolvedValue(null);
      userRepo.findOne.mockResolvedValue({
        id: userId,
        monthlyFixedExpenseEstimate: 12000,
        monthlyVariableExpenseEstimate: 8000,
      });

      await service.configureEmergencyFund(userId, {});

      expect(goalRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ targetAmount: 60000, isDefault: true }),
      );
    });

    it('configureEmergencyFund falla si no hay datos ni targetAmount', async () => {
      goalRepo.findOne.mockResolvedValue(null);
      userRepo.findOne.mockResolvedValue({
        id: userId,
        monthlyFixedExpenseEstimate: 0,
        monthlyVariableExpenseEstimate: 0,
      });

      await expect(service.configureEmergencyFund(userId, {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('summary expone emergencyFund=suggested cuando hay datos pero no meta', async () => {
      goalRepo.findOne.mockResolvedValue(null); // ensure: no default
      goalRepo.count.mockResolvedValue(2); // ya tiene metas -> no auto-crea
      goalRepo.find.mockResolvedValue([
        { status: FinancialGoalStatus.ACTIVE, targetAmount: 10000, currentAmount: 4000, isDefault: false },
        { status: FinancialGoalStatus.ACTIVE, targetAmount: 20000, currentAmount: 6000, isDefault: false },
      ]);
      userRepo.findOne.mockResolvedValue({
        id: userId,
        monthlyFixedExpenseEstimate: 10000,
        monthlyVariableExpenseEstimate: 5000,
      });

      const summary = await service.summary(userId);

      expect(summary.totalSaved).toBe(10000);
      expect(summary.totalTarget).toBe(30000);
      expect(summary.emergencyFund.status).toBe('suggested');
      expect(summary.emergencyFund.suggestedTargetAmount).toBe(45000);
    });
  });
});
