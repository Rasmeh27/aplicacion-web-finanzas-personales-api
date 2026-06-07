import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Repository } from 'typeorm';
import { CreateDebtDto } from './dto/create-debt.dto';
import { Debt, DebtStatus } from './entities/debt.entity';
import { DebtService } from './debt.service';
import { RegisterDebtUseCase } from './use-cases/cu-016-register-debt.use-case';

describe('DebtService - Debts planning (CU-016)', () => {
  let service: DebtService;
  let repo: Repository<Debt>;

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DebtService,
        RegisterDebtUseCase,
        {
          provide: getRepositoryToken(Debt),
          useValue: {
            create: jest.fn((data: Partial<Debt>) => data),
            save: jest.fn((debt: Partial<Debt>) => ({
              id: 'debt-123',
              ...debt,
              createdAt: new Date('2026-06-03T00:00:00.000Z'),
              updatedAt: new Date('2026-06-03T00:00:00.000Z'),
            })),
          },
        },
      ],
    }).compile();

    service = module.get<DebtService>(DebtService);
    repo = module.get<Repository<Debt>>(getRepositoryToken(Debt));
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
});
