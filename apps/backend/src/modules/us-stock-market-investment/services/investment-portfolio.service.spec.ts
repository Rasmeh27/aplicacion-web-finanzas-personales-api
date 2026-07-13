import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { InvestmentPortfolio } from '../entities/investment-portfolio.entity';
import { InvestmentPortfolioService } from './investment-portfolio.service';

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const PORTFOLIO_ID = '770e8400-e29b-41d4-a716-446655440222';

describe('InvestmentPortfolioService', () => {
  let service: InvestmentPortfolioService;
  let repo: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };

  beforeEach(async () => {
    repo = {
      findOne: jest.fn(),
      create: jest.fn((value: unknown) => value),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvestmentPortfolioService,
        { provide: getRepositoryToken(InvestmentPortfolio), useValue: repo },
      ],
    }).compile();

    service = module.get(InvestmentPortfolioService);
  });

  it('devuelve el portafolio default existente sin crear otro (idempotente)', async () => {
    const existing = { id: PORTFOLIO_ID, userId: USER_ID, isDefault: true };
    repo.findOne.mockResolvedValue(existing as never);

    const result = await service.getOrCreateDefaultPortfolio(USER_ID);

    expect(result).toBe(existing);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('crea el portafolio default (USD) cuando no existe', async () => {
    repo.findOne.mockResolvedValue(null as never);
    repo.save.mockImplementation(((value: Partial<InvestmentPortfolio>) =>
      Promise.resolve({ id: PORTFOLIO_ID, ...value })) as never);

    const result = await service.getOrCreateDefaultPortfolio(USER_ID);

    expect(result.userId).toBe(USER_ID);
    expect(result.baseCurrency).toBe('USD');
    expect(result.isDefault).toBe(true);
    const saved = repo.save.mock.calls[0][0] as Partial<InvestmentPortfolio>;
    expect(saved.userId).toBe(USER_ID);
  });

  it('ante una carrera de creación, relee el portafolio ganador', async () => {
    const winner = { id: PORTFOLIO_ID, userId: USER_ID, isDefault: true };
    repo.findOne
      .mockResolvedValueOnce(null as never) // primera lectura: no existe
      .mockResolvedValueOnce(winner as never); // relectura tras el conflicto
    repo.save.mockRejectedValue(
      new Error('duplicate key value violates unique constraint') as never,
    );

    const result = await service.getOrCreateDefaultPortfolio(USER_ID);

    expect(result).toBe(winner);
  });

  it('getOwnedPortfolioOrFail: 404 con code portfolio_not_found para ajenos', async () => {
    repo.findOne.mockResolvedValue(null as never);

    try {
      await service.getOwnedPortfolioOrFail(USER_ID, PORTFOLIO_ID);
      throw new Error('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(NotFoundException);
      const body = (error as NotFoundException).getResponse() as Record<string, unknown>;
      expect(body.code).toBe('portfolio_not_found');
    }
    expect(repo.findOne).toHaveBeenCalledWith({
      where: { id: PORTFOLIO_ID, userId: USER_ID },
    });
  });
});
