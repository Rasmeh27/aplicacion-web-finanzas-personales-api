import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Repository } from 'typeorm';
import { CreateDebtDto } from './dto/create-debt.dto';
import { Debt, DebtStatus } from './entities/debt.entity';
import { DebtPayment } from './entities/debt-payment.entity';
import { Transaction, TransactionType } from '../movements/entities/transaction.entity';
import { DebtService } from './debt.service';
import { CalculateDebtIncomeRatioUseCase } from './use-cases/cu-018-calculate-debt-income-ratio.use-case';
import { RegisterDebtPaymentUseCase } from './use-cases/cu-017-register-debt-payment.use-case';
import { RegisterDebtUseCase } from './use-cases/cu-016-register-debt.use-case';

describe('DebtService - Debts planning (CU-016/CU-017/CU-018)', () => {
  let service: DebtService;
  let repo: Repository<Debt>;
  let paymentRepo: Repository<DebtPayment>;
  let movementRepo: Repository<Transaction>;

  const userId = '9028b0b0-a7af-4367-9f86-a8b347c55727';

  const dto: CreateDebtDto = {
    name: 'Prestamo del carro',
    creditor: 'Banco Popular',
    initialAmount: 150000,
    minimumPayment: 7500,
    interestRatePct: 12.5,
    dueDay: 15,
    currency: 'dop',
  };

  const createPaymentSumQueryBuilder = (total = '0') => ({
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getRawOne: jest.fn<() => Promise<{ total: string }>>().mockResolvedValue({ total }),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DebtService,
        RegisterDebtUseCase,
        RegisterDebtPaymentUseCase,
        CalculateDebtIncomeRatioUseCase,
        {
          provide: getRepositoryToken(Debt),
          useValue: {
            create: jest.fn((data: Partial<Debt>) => data),
            find: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            save: jest.fn((debt: Partial<Debt>) => ({
              id: 'debt-123',
              ...debt,
              createdAt: new Date('2026-06-03T00:00:00.000Z'),
              updatedAt: new Date('2026-06-03T00:00:00.000Z'),
            })),
          },
        },
        {
          provide: getRepositoryToken(DebtPayment),
          useValue: {
            create: jest.fn((data: Partial<DebtPayment>) => data),
            save: jest.fn((payment: Partial<DebtPayment>) => ({
              id: 'payment-123',
              ...payment,
              createdAt: new Date('2026-06-03T00:00:00.000Z'),
            })),
            createQueryBuilder: jest.fn(() => createPaymentSumQueryBuilder()),
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

    service = module.get<DebtService>(DebtService);
    repo = module.get<Repository<Debt>>(getRepositoryToken(Debt));
    paymentRepo = module.get<Repository<DebtPayment>>(getRepositoryToken(DebtPayment));
    movementRepo = module.get<Repository<Transaction>>(getRepositoryToken(Transaction));
  });

  it('registra una deuda usando la tabla debts', async () => {
    const result = await service.create(userId, dto);

    expect(repo.create).toHaveBeenCalledWith({
      userId,
      name: 'Prestamo del carro',
      creditor: 'Banco Popular',
      initialAmount: 150000,
      minimumPayment: 7500,
      interestRatePct: 12.5,
      dueDay: 15,
      currency: 'DOP',
      status: DebtStatus.ACTIVE,
    });
    expect(repo.save).toHaveBeenCalled();
    expect(result.id).toBe('debt-123');
  });

  it('usa valores por defecto cuando los opcionales no se envian', async () => {
    await service.create(userId, {
      name: 'Tarjeta de credito',
      initialAmount: 20000,
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        creditor: null,
        minimumPayment: 0,
        interestRatePct: 0,
        dueDay: null,
        currency: 'DOP',
        status: DebtStatus.ACTIVE,
      }),
    );
  });

  it('limpia espacios del nombre y acreedor antes de guardar', async () => {
    await service.create(userId, {
      name: '  Prestamo personal  ',
      creditor: '  Cooperativa  ',
      initialAmount: 45000,
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Prestamo personal',
        creditor: 'Cooperativa',
      }),
    );
  });

  it('no permite nombres vacios despues de limpiar espacios', async () => {
    await expect(
      service.create(userId, {
        name: '   ',
        initialAmount: 10000,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('no permite pago minimo mayor que el monto inicial', async () => {
    await expect(
      service.create(userId, {
        name: 'Deuda invalida',
        initialAmount: 10000,
        minimumPayment: 12000,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('registra un pago a una deuda activa usando la tabla debt_payments', async () => {
    jest.spyOn(repo, 'findOne').mockResolvedValue({
      id: 'debt-123',
      userId,
      name: 'Prestamo del carro',
      initialAmount: 150000,
      status: DebtStatus.ACTIVE,
    } as Debt);

    const result = await service.registerPayment(userId, 'debt-123', {
      amount: 7500,
      paymentDate: '2026-06-30',
      note: ' Pago mensual ',
    });

    expect(repo.findOne).toHaveBeenCalledWith({
      where: {
        id: 'debt-123',
        userId,
      },
    });
    expect(paymentRepo.create).toHaveBeenCalledWith({
      userId,
      debtId: 'debt-123',
      amount: 7500,
      paymentDate: '2026-06-30',
      note: 'Pago mensual',
    });
    expect(paymentRepo.save).toHaveBeenCalled();
    expect(result.id).toBe('payment-123');
  });

  it('usa la fecha actual y nota null cuando no se envian opcionales', async () => {
    jest.spyOn(repo, 'findOne').mockResolvedValue({
      id: 'debt-123',
      userId,
      initialAmount: 150000,
      status: DebtStatus.ACTIVE,
    } as Debt);

    await service.registerPayment(userId, 'debt-123', {
      amount: 7500,
    });

    expect(paymentRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        note: null,
      }),
    );
  });

  it('no permite registrar pagos a deudas que no pertenecen al usuario', async () => {
    jest.spyOn(repo, 'findOne').mockResolvedValue(null);

    await expect(
      service.registerPayment(userId, 'debt-123', {
        amount: 7500,
      }),
    ).rejects.toThrow('Deuda no encontrada');
    expect(paymentRepo.save).not.toHaveBeenCalled();
  });

  it('no permite registrar pagos a deudas inactivas', async () => {
    jest.spyOn(repo, 'findOne').mockResolvedValue({
      id: 'debt-123',
      userId,
      initialAmount: 150000,
      status: DebtStatus.PAID,
    } as Debt);

    await expect(
      service.registerPayment(userId, 'debt-123', {
        amount: 7500,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(paymentRepo.save).not.toHaveBeenCalled();
  });

  it('no permite un pago mayor que el saldo pendiente', async () => {
    jest.spyOn(repo, 'findOne').mockResolvedValue({
      id: 'debt-123',
      userId,
      initialAmount: 10000,
      status: DebtStatus.ACTIVE,
    } as Debt);

    await expect(
      service.registerPayment(userId, 'debt-123', {
        amount: 12000,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(paymentRepo.save).not.toHaveBeenCalled();
  });

  it('marca la deuda como pagada cuando el pago completa el saldo', async () => {
    jest.spyOn(repo, 'findOne').mockResolvedValue({
      id: 'debt-123',
      userId,
      initialAmount: 10000,
      status: DebtStatus.ACTIVE,
    } as Debt);

    await service.registerPayment(userId, 'debt-123', {
      amount: 10000,
    });

    expect(repo.update).toHaveBeenCalledWith(
      {
        id: 'debt-123',
        userId,
      },
      {
        status: DebtStatus.PAID,
      },
    );
  });

  it('calcula el ratio deuda ingreso del mes con deudas activas e ingresos', async () => {
    jest.spyOn(repo, 'find').mockResolvedValue([
      {
        userId,
        status: DebtStatus.ACTIVE,
        minimumPayment: 7500,
      } as Debt,
      {
        userId,
        status: DebtStatus.ACTIVE,
        minimumPayment: '2500.50' as unknown as number,
      } as Debt,
    ]);
    jest.spyOn(movementRepo, 'find').mockResolvedValue([
      {
        userId,
        type: TransactionType.INCOME,
        amount: 50000,
        date: '2026-06-05',
      } as Transaction,
    ]);

    const result = await service.calculateIncomeRatio(userId, 2026, 6);

    expect(repo.find).toHaveBeenCalledWith({
      where: {
        userId,
        status: DebtStatus.ACTIVE,
      },
    });
    expect(movementRepo.find).toHaveBeenCalledWith({
      where: expect.objectContaining({
        userId,
        type: TransactionType.INCOME,
      }),
    });
    expect(result).toEqual({
      periodMonth: '2026-06-01',
      totalMonthlyIncome: 50000,
      totalMinimumDebtPayment: 10000.5,
      debtIncomeRatio: 20,
      riskLevel: 'healthy',
      isHealthy: true,
    });
  });

  it('marca warning cuando el ratio esta entre 36 y 50 por ciento', async () => {
    jest.spyOn(repo, 'find').mockResolvedValue([
      {
        minimumPayment: 40000,
        status: DebtStatus.ACTIVE,
      } as Debt,
    ]);
    jest.spyOn(movementRepo, 'find').mockResolvedValue([
      {
        amount: 100000,
        type: TransactionType.INCOME,
      } as Transaction,
    ]);

    const result = await service.calculateIncomeRatio(userId, 2026, 6);

    expect(result.riskLevel).toBe('warning');
    expect(result.isHealthy).toBe(false);
    expect(result.debtIncomeRatio).toBe(40);
  });

  it('marca critical cuando el ratio supera 50 por ciento', async () => {
    jest.spyOn(repo, 'find').mockResolvedValue([
      {
        minimumPayment: 60000,
        status: DebtStatus.ACTIVE,
      } as Debt,
    ]);
    jest.spyOn(movementRepo, 'find').mockResolvedValue([
      {
        amount: 100000,
        type: TransactionType.INCOME,
      } as Transaction,
    ]);

    const result = await service.calculateIncomeRatio(userId, 2026, 6);

    expect(result.riskLevel).toBe('critical');
    expect(result.isHealthy).toBe(false);
    expect(result.debtIncomeRatio).toBe(60);
  });

  it('retorna no_income cuando no hay ingresos en el mes', async () => {
    jest.spyOn(repo, 'find').mockResolvedValue([
      {
        minimumPayment: 7500,
        status: DebtStatus.ACTIVE,
      } as Debt,
    ]);
    jest.spyOn(movementRepo, 'find').mockResolvedValue([]);

    const result = await service.calculateIncomeRatio(userId, 2026, 6);

    expect(result).toEqual({
      periodMonth: '2026-06-01',
      totalMonthlyIncome: 0,
      totalMinimumDebtPayment: 7500,
      debtIncomeRatio: null,
      riskLevel: 'no_income',
      isHealthy: false,
    });
  });
});
