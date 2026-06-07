import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Repository } from 'typeorm';
import {
  Transaction,
  TransactionType,
} from '../movements/entities/transaction.entity';
import { DashboardReportsService } from './dashboard-reports.service';
import { ViewMonthlyIncomeTotalUseCase } from './use-cases/cu-019-view-monthly-income-total.use-case';

describe('DashboardReportsService - Dashboard reports (CU-019)', () => {
  let service: DashboardReportsService;
  let movementRepo: Repository<Transaction>;

  const userId = '9028b0b0-a7af-4367-9f86-a8b347c55727';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardReportsService,
        ViewMonthlyIncomeTotalUseCase,
        {
          provide: getRepositoryToken(Transaction),
          useValue: {
            find: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DashboardReportsService>(DashboardReportsService);
    movementRepo = module.get<Repository<Transaction>>(getRepositoryToken(Transaction));
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
});
