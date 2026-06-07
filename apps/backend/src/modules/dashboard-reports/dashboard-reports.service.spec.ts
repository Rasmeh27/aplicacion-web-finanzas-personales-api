import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Repository } from 'typeorm';
import {
  Transaction,
  TransactionType,
} from '../movements/entities/transaction.entity';
import {
  FinancialGoal,
  FinancialGoalStatus,
} from '../planning/entities/financial-goal.entity';
import { Debt, DebtStatus } from '../planning/entities/debt.entity';
import { DebtPayment } from '../planning/entities/debt-payment.entity';
import { DashboardReportsService } from './dashboard-reports.service';
import { ViewMonthlyIncomeTotalUseCase } from './use-cases/cu-019-view-monthly-income-total.use-case';
import { ViewMonthlyExpenseTotalUseCase } from './use-cases/cu-020-view-monthly-expense-total.use-case';
import { ViewMonthlyBalanceUseCase } from './use-cases/cu-021-view-monthly-balance.use-case';
import { ViewSavingsPercentageUseCase } from './use-cases/cu-022-view-savings-percentage.use-case';
import { ViewExpensesByCategoryUseCase } from './use-cases/cu-023-view-expenses-by-category.use-case';
import { ViewFinancialGoalsSummaryUseCase } from './use-cases/cu-024-view-financial-goals-summary.use-case';
import { ViewDebtsSummaryUseCase } from './use-cases/cu-025-view-debts-summary.use-case';

describe('DashboardReportsService - Dashboard reports (CU-019/CU-020/CU-021/CU-022/CU-023/CU-024/CU-025)', () => {
  let service: DashboardReportsService;
  let movementRepo: Repository<Transaction>;
  let goalRepo: Repository<FinancialGoal>;
  let debtRepo: Repository<Debt>;
  let paymentRepo: Repository<DebtPayment>;

  const userId = '9028b0b0-a7af-4367-9f86-a8b347c55727';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardReportsService,
        ViewMonthlyIncomeTotalUseCase,
        ViewMonthlyExpenseTotalUseCase,
        ViewMonthlyBalanceUseCase,
        ViewSavingsPercentageUseCase,
        ViewExpensesByCategoryUseCase,
        ViewFinancialGoalsSummaryUseCase,
        ViewDebtsSummaryUseCase,
        {
          provide: getRepositoryToken(Transaction),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(FinancialGoal),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Debt),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(DebtPayment),
          useValue: {
            find: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DashboardReportsService>(DashboardReportsService);
    movementRepo = module.get<Repository<Transaction>>(getRepositoryToken(Transaction));
    goalRepo = module.get<Repository<FinancialGoal>>(getRepositoryToken(FinancialGoal));
    debtRepo = module.get<Repository<Debt>>(getRepositoryToken(Debt));
    paymentRepo = module.get<Repository<DebtPayment>>(getRepositoryToken(DebtPayment));
  });

  it('consulta el total de ingresos del mes usando movements', async () => {
    jest.spyOn(movementRepo, 'find').mockResolvedValue([
      {
        userId,
        type: TransactionType.INCOME,
        amount: 25000,
        date: '2026-06-05',
      } as Transaction,
      {
        userId,
        type: TransactionType.INCOME,
        amount: '5000.50' as unknown as number,
        date: '2026-06-20',
      } as Transaction,
    ]);

    const result = await service.viewMonthlyIncomeTotal(userId, 2026, 6);

    expect(movementRepo.find).toHaveBeenCalledWith({
      where: expect.objectContaining({
        userId,
        type: TransactionType.INCOME,
      }),
    });
    expect(result).toEqual({
      periodMonth: '2026-06-01',
      totalIncome: 30000.5,
      currency: 'DOP',
    });
  });

  it('retorna 0 cuando no hay ingresos en el mes', async () => {
    jest.spyOn(movementRepo, 'find').mockResolvedValue([]);

    const result = await service.viewMonthlyIncomeTotal(userId, 2026, 6);

    expect(result).toEqual({
      periodMonth: '2026-06-01',
      totalIncome: 0,
      currency: 'DOP',
    });
  });

  it('consulta el total de gastos del mes usando movements', async () => {
    jest.spyOn(movementRepo, 'find').mockResolvedValue([
      {
        userId,
        type: TransactionType.EXPENSE,
        amount: 1200,
        date: '2026-06-10',
      } as Transaction,
      {
        userId,
        type: TransactionType.EXPENSE,
        amount: '800.75' as unknown as number,
        date: '2026-06-22',
      } as Transaction,
    ]);

    const result = await service.viewMonthlyExpenseTotal(userId, 2026, 6);

    expect(movementRepo.find).toHaveBeenCalledWith({
      where: expect.objectContaining({
        userId,
        type: TransactionType.EXPENSE,
      }),
    });
    expect(result).toEqual({
      periodMonth: '2026-06-01',
      totalExpense: 2000.75,
      currency: 'DOP',
    });
  });

  it('retorna 0 cuando no hay gastos en el mes', async () => {
    jest.spyOn(movementRepo, 'find').mockResolvedValue([]);

    const result = await service.viewMonthlyExpenseTotal(userId, 2026, 6);

    expect(result).toEqual({
      periodMonth: '2026-06-01',
      totalExpense: 0,
      currency: 'DOP',
    });
  });

  it('consulta el balance mensual restando gastos a ingresos', async () => {
    jest.spyOn(movementRepo, 'find').mockResolvedValue([
      {
        userId,
        type: TransactionType.INCOME,
        amount: 50000,
        date: '2026-06-05',
      } as Transaction,
      {
        userId,
        type: TransactionType.EXPENSE,
        amount: 12500,
        date: '2026-06-10',
      } as Transaction,
      {
        userId,
        type: TransactionType.EXPENSE,
        amount: '2500.25' as unknown as number,
        date: '2026-06-20',
      } as Transaction,
    ]);

    const result = await service.viewMonthlyBalance(userId, 2026, 6);

    expect(movementRepo.find).toHaveBeenCalledWith({
      where: expect.objectContaining({
        userId,
      }),
    });
    expect(result).toEqual({
      periodMonth: '2026-06-01',
      totalIncome: 50000,
      totalExpense: 15000.25,
      balance: 34999.75,
      currency: 'DOP',
    });
  });

  it('retorna balance negativo cuando los gastos superan los ingresos', async () => {
    jest.spyOn(movementRepo, 'find').mockResolvedValue([
      {
        type: TransactionType.INCOME,
        amount: 10000,
      } as Transaction,
      {
        type: TransactionType.EXPENSE,
        amount: 12500,
      } as Transaction,
    ]);

    const result = await service.viewMonthlyBalance(userId, 2026, 6);

    expect(result.balance).toBe(-2500);
  });

  it('retorna balance 0 cuando no hay movimientos en el mes', async () => {
    jest.spyOn(movementRepo, 'find').mockResolvedValue([]);

    const result = await service.viewMonthlyBalance(userId, 2026, 6);

    expect(result).toEqual({
      periodMonth: '2026-06-01',
      totalIncome: 0,
      totalExpense: 0,
      balance: 0,
      currency: 'DOP',
    });
  });

  it('calcula el porcentaje de ahorro mensual', async () => {
    jest.spyOn(movementRepo, 'find').mockResolvedValue([
      {
        type: TransactionType.INCOME,
        amount: 50000,
      } as Transaction,
      {
        type: TransactionType.EXPENSE,
        amount: 15000,
      } as Transaction,
    ]);

    const result = await service.viewSavingsPercentage(userId, 2026, 6);

    expect(result).toEqual({
      periodMonth: '2026-06-01',
      totalIncome: 50000,
      totalExpense: 15000,
      savedAmount: 35000,
      savingsPercentage: 70,
      currency: 'DOP',
    });
  });

  it('calcula porcentaje negativo cuando los gastos superan ingresos', async () => {
    jest.spyOn(movementRepo, 'find').mockResolvedValue([
      {
        type: TransactionType.INCOME,
        amount: 10000,
      } as Transaction,
      {
        type: TransactionType.EXPENSE,
        amount: 15000,
      } as Transaction,
    ]);

    const result = await service.viewSavingsPercentage(userId, 2026, 6);

    expect(result.savedAmount).toBe(-5000);
    expect(result.savingsPercentage).toBe(-50);
  });

  it('retorna porcentaje null cuando no hay ingresos', async () => {
    jest.spyOn(movementRepo, 'find').mockResolvedValue([
      {
        type: TransactionType.EXPENSE,
        amount: 15000,
      } as Transaction,
    ]);

    const result = await service.viewSavingsPercentage(userId, 2026, 6);

    expect(result.savingsPercentage).toBeNull();
    expect(result.totalIncome).toBe(0);
  });

  it('agrupa los gastos del mes por categoria', async () => {
    jest.spyOn(movementRepo, 'find').mockResolvedValue([
      {
        type: TransactionType.EXPENSE,
        amount: 3000,
        categoryId: 'food-category',
        category: { name: 'Comida' },
      } as Transaction,
      {
        type: TransactionType.EXPENSE,
        amount: 1000,
        categoryId: 'food-category',
        category: { name: 'Comida' },
      } as Transaction,
      {
        type: TransactionType.EXPENSE,
        amount: 1000,
        categoryId: null,
        category: null,
      } as Transaction,
    ]);

    const result = await service.viewExpensesByCategory(userId, 2026, 6);

    expect(movementRepo.find).toHaveBeenCalledWith({
      where: expect.objectContaining({
        userId,
        type: TransactionType.EXPENSE,
      }),
      relations: ['category'],
    });
    expect(result).toEqual({
      periodMonth: '2026-06-01',
      totalExpense: 5000,
      categories: [
        {
          categoryId: 'food-category',
          categoryName: 'Comida',
          totalExpense: 4000,
          percentage: 80,
        },
        {
          categoryId: null,
          categoryName: 'Sin categoria',
          totalExpense: 1000,
          percentage: 20,
        },
      ],
      currency: 'DOP',
    });
  });

  it('retorna lista vacia cuando no hay gastos por categoria', async () => {
    jest.spyOn(movementRepo, 'find').mockResolvedValue([]);

    const result = await service.viewExpensesByCategory(userId, 2026, 6);

    expect(result).toEqual({
      periodMonth: '2026-06-01',
      totalExpense: 0,
      categories: [],
      currency: 'DOP',
    });
  });

  it('consulta el resumen de metas financieras del usuario', async () => {
    jest.spyOn(goalRepo, 'find').mockResolvedValue([
      {
        id: 'goal-1',
        userId,
        name: 'Fondo de emergencia',
        targetAmount: 100000,
        currentAmount: 25000,
        currency: 'DOP',
        targetDate: '2026-12-31',
        status: FinancialGoalStatus.ACTIVE,
      } as FinancialGoal,
      {
        id: 'goal-2',
        userId,
        name: 'Viaje',
        targetAmount: '50000' as unknown as number,
        currentAmount: '50000' as unknown as number,
        currency: 'DOP',
        targetDate: null,
        status: FinancialGoalStatus.COMPLETED,
      } as FinancialGoal,
      {
        id: 'goal-3',
        userId,
        name: 'Curso',
        targetAmount: 20000,
        currentAmount: 5000,
        currency: 'DOP',
        targetDate: '2026-10-01',
        status: FinancialGoalStatus.PAUSED,
      } as FinancialGoal,
    ]);

    const result = await service.viewFinancialGoalsSummary(userId);

    expect(goalRepo.find).toHaveBeenCalledWith({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    expect(result).toEqual({
      totalGoals: 3,
      activeGoals: 1,
      completedGoals: 1,
      pausedGoals: 1,
      cancelledGoals: 0,
      totalTargetAmount: 170000,
      totalCurrentAmount: 80000,
      overallProgressPercentage: 47.06,
      currency: 'DOP',
      goals: [
        {
          goalId: 'goal-1',
          name: 'Fondo de emergencia',
          targetAmount: 100000,
          currentAmount: 25000,
          remainingAmount: 75000,
          progressPercentage: 25,
          status: FinancialGoalStatus.ACTIVE,
          targetDate: '2026-12-31',
        },
        {
          goalId: 'goal-2',
          name: 'Viaje',
          targetAmount: 50000,
          currentAmount: 50000,
          remainingAmount: 0,
          progressPercentage: 100,
          status: FinancialGoalStatus.COMPLETED,
          targetDate: null,
        },
        {
          goalId: 'goal-3',
          name: 'Curso',
          targetAmount: 20000,
          currentAmount: 5000,
          remainingAmount: 15000,
          progressPercentage: 25,
          status: FinancialGoalStatus.PAUSED,
          targetDate: '2026-10-01',
        },
      ],
    });
  });

  it('retorna resumen en cero cuando no hay metas financieras', async () => {
    jest.spyOn(goalRepo, 'find').mockResolvedValue([]);

    const result = await service.viewFinancialGoalsSummary(userId);

    expect(result).toEqual({
      totalGoals: 0,
      activeGoals: 0,
      completedGoals: 0,
      pausedGoals: 0,
      cancelledGoals: 0,
      totalTargetAmount: 0,
      totalCurrentAmount: 0,
      overallProgressPercentage: 0,
      currency: 'DOP',
      goals: [],
    });
  });

  it('consulta el resumen de deudas del usuario', async () => {
    jest.spyOn(debtRepo, 'find').mockResolvedValue([
      {
        id: 'debt-1',
        userId,
        name: 'Tarjeta',
        creditor: 'Banco A',
        initialAmount: 50000,
        minimumPayment: 2500,
        interestRatePct: 18.5,
        dueDay: 15,
        status: DebtStatus.ACTIVE,
      } as Debt,
      {
        id: 'debt-2',
        userId,
        name: 'Prestamo',
        creditor: null,
        initialAmount: '30000' as unknown as number,
        minimumPayment: '1500' as unknown as number,
        interestRatePct: '10' as unknown as number,
        dueDay: null,
        status: DebtStatus.PAID,
      } as Debt,
      {
        id: 'debt-3',
        userId,
        name: 'Deuda vieja',
        creditor: 'Banco B',
        initialAmount: 10000,
        minimumPayment: 500,
        interestRatePct: 0,
        dueDay: 1,
        status: DebtStatus.CANCELLED,
      } as Debt,
    ]);
    jest.spyOn(paymentRepo, 'find').mockResolvedValue([
      {
        debtId: 'debt-1',
        amount: 10000,
      } as DebtPayment,
      {
        debtId: 'debt-1',
        amount: '5000.50' as unknown as number,
      } as DebtPayment,
      {
        debtId: 'debt-2',
        amount: 30000,
      } as DebtPayment,
    ]);

    const result = await service.viewDebtsSummary(userId);

    expect(debtRepo.find).toHaveBeenCalledWith({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    expect(paymentRepo.find).toHaveBeenCalledWith({
      where: { userId },
    });
    expect(result).toEqual({
      totalDebts: 3,
      activeDebts: 1,
      paidDebts: 1,
      cancelledDebts: 1,
      totalInitialAmount: 90000,
      totalPaidAmount: 45000.5,
      totalRemainingAmount: 34999.5,
      totalMinimumPayment: 2500,
      averageInterestRatePct: 18.5,
      currency: 'DOP',
      debts: [
        {
          debtId: 'debt-1',
          name: 'Tarjeta',
          creditor: 'Banco A',
          initialAmount: 50000,
          paidAmount: 15000.5,
          remainingAmount: 34999.5,
          minimumPayment: 2500,
          interestRatePct: 18.5,
          dueDay: 15,
          status: DebtStatus.ACTIVE,
        },
        {
          debtId: 'debt-2',
          name: 'Prestamo',
          creditor: null,
          initialAmount: 30000,
          paidAmount: 30000,
          remainingAmount: 0,
          minimumPayment: 1500,
          interestRatePct: 10,
          dueDay: null,
          status: DebtStatus.PAID,
        },
        {
          debtId: 'debt-3',
          name: 'Deuda vieja',
          creditor: 'Banco B',
          initialAmount: 10000,
          paidAmount: 0,
          remainingAmount: 0,
          minimumPayment: 500,
          interestRatePct: 0,
          dueDay: 1,
          status: DebtStatus.CANCELLED,
        },
      ],
    });
  });

  it('retorna resumen en cero cuando no hay deudas', async () => {
    jest.spyOn(debtRepo, 'find').mockResolvedValue([]);
    jest.spyOn(paymentRepo, 'find').mockResolvedValue([]);

    const result = await service.viewDebtsSummary(userId);

    expect(result).toEqual({
      totalDebts: 0,
      activeDebts: 0,
      paidDebts: 0,
      cancelledDebts: 0,
      totalInitialAmount: 0,
      totalPaidAmount: 0,
      totalRemainingAmount: 0,
      totalMinimumPayment: 0,
      averageInterestRatePct: 0,
      currency: 'DOP',
      debts: [],
    });
  });
});
