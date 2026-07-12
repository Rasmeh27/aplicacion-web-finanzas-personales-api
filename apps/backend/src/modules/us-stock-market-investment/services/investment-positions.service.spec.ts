import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { MarketDataService } from '../../../integrations/market-data/market-data.service';
import { InvalidMarketSymbolError } from '../../../integrations/market-data/market-data.errors';
import {
  InvestmentAssetType,
  InvestmentPosition,
} from '../entities/investment-position.entity';
import { InvestmentPortfolioService } from './investment-portfolio.service';
import { InvestmentPositionsService } from './investment-positions.service';

const USER_A = '550e8400-e29b-41d4-a716-446655440000';
const USER_B = '660e8400-e29b-41d4-a716-446655440111';
const PORTFOLIO_ID = '770e8400-e29b-41d4-a716-446655440222';
const POSITION_ID = '880e8400-e29b-41d4-a716-446655440333';

function realNormalize(raw: string): string {
  const symbol = (raw ?? '').trim().toUpperCase();
  if (!/^[A-Z0-9.-]{1,12}$/.test(symbol)) {
    throw new InvalidMarketSymbolError(symbol || '(empty)');
  }
  return symbol;
}

describe('InvestmentPositionsService', () => {
  let service: InvestmentPositionsService;
  let repo: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    softDelete: jest.Mock;
  };
  let portfolioService: { getOrCreateDefaultPortfolio: jest.Mock };
  let marketData: {
    normalizeSymbol: jest.Mock;
    verifySymbol: jest.Mock;
    searchSymbols: jest.Mock;
  };

  beforeEach(async () => {
    repo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((value: unknown) => value),
      save: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };
    portfolioService = { getOrCreateDefaultPortfolio: jest.fn() };
    marketData = {
      normalizeSymbol: jest.fn(realNormalize),
      verifySymbol: jest.fn(),
      searchSymbols: jest.fn(),
    };

    portfolioService.getOrCreateDefaultPortfolio.mockResolvedValue({
      id: PORTFOLIO_ID,
      userId: USER_A,
      baseCurrency: 'USD',
    } as never);
    repo.findOne.mockResolvedValue(null as never);
    repo.save.mockImplementation(((value: Partial<InvestmentPosition>) =>
      Promise.resolve({ id: POSITION_ID, ...value })) as never);
    marketData.verifySymbol.mockResolvedValue('valid' as never);
    marketData.searchSymbols.mockResolvedValue([
      { symbol: 'AAPL', name: 'Apple Inc.', assetType: 'stock' },
    ] as never);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvestmentPositionsService,
        { provide: getRepositoryToken(InvestmentPosition), useValue: repo },
        { provide: InvestmentPortfolioService, useValue: portfolioService },
        { provide: MarketDataService, useValue: marketData },
      ],
    }).compile();

    service = module.get(InvestmentPositionsService);
  });

  const createDto = (overrides: Record<string, unknown> = {}) =>
    ({
      symbol: 'aapl',
      assetType: InvestmentAssetType.STOCK,
      quantity: 2.5,
      averageCost: 190.25,
      ...overrides,
    }) as never;

  describe('createPosition', () => {
    it('normaliza el símbolo a mayúsculas y guarda en el portafolio propio', async () => {
      const result = await service.createPosition(USER_A, createDto());

      expect(result.position.symbol).toBe('AAPL');
      expect(result.warnings).toEqual([]);
      const saved = repo.save.mock.calls[0][0] as Partial<InvestmentPosition>;
      expect(saved.userId).toBe(USER_A);
      expect(saved.portfolioId).toBe(PORTFOLIO_ID);
      expect(saved.currency).toBe('USD');
      expect(saved.displayName).toBe('Apple Inc.');
    });

    it('rechaza símbolo con formato inválido', async () => {
      await expect(
        service.createPosition(USER_A, createDto({ symbol: 'BAD SYMBOL!' })),
      ).rejects.toThrow(BadRequestException);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('rechaza símbolo que el proveedor no reconoce (invalid_market_symbol)', async () => {
      marketData.verifySymbol.mockResolvedValue('invalid' as never);

      try {
        await service.createPosition(USER_A, createDto({ symbol: 'ZZZZ' }));
        throw new Error('should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const body = (error as BadRequestException).getResponse() as Record<string, unknown>;
        expect(body.code).toBe('invalid_market_symbol');
      }
    });

    it('proveedor caído: guarda con advertencia controlada (no bloquea el CRUD)', async () => {
      marketData.verifySymbol.mockResolvedValue('unverified' as never);

      const result = await service.createPosition(USER_A, createDto());

      expect(result.warnings).toEqual(['market_validation_skipped']);
      expect(repo.save).toHaveBeenCalled();
    });

    it('rechaza posición duplicada activa para el mismo símbolo (409)', async () => {
      repo.findOne.mockResolvedValue({ id: 'existing' } as never);

      try {
        await service.createPosition(USER_A, createDto());
        throw new Error('should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ConflictException);
        const body = (error as ConflictException).getResponse() as Record<string, unknown>;
        expect(body.code).toBe('duplicate_position');
      }
      // La comprobación de duplicado queda aislada por usuario Y portafolio.
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { userId: USER_A, portfolioId: PORTFOLIO_ID, symbol: 'AAPL' },
      });
    });

    it('rechaza fecha de compra en el futuro', async () => {
      await expect(
        service.createPosition(USER_A, createDto({ purchaseDate: '2099-01-01' })),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updatePosition', () => {
    it('actualiza solo una posición propia', async () => {
      repo.findOne.mockResolvedValue({
        id: POSITION_ID,
        userId: USER_A,
        symbol: 'AAPL',
      } as never);

      await service.updatePosition(USER_A, POSITION_ID, { quantity: 3 } as never);

      expect(repo.update).toHaveBeenCalledWith(
        { id: POSITION_ID, userId: USER_A },
        { quantity: 3 },
      );
    });

    it('404 si la posición pertenece a otro usuario', async () => {
      repo.findOne.mockResolvedValue(null as never);

      try {
        await service.updatePosition(USER_B, POSITION_ID, { quantity: 3 } as never);
        throw new Error('should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        const body = (error as NotFoundException).getResponse() as Record<string, unknown>;
        expect(body.code).toBe('position_not_found');
      }
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: POSITION_ID, userId: USER_B },
      });
      expect(repo.update).not.toHaveBeenCalled();
    });
  });

  describe('removePosition', () => {
    it('soft delete de una posición propia', async () => {
      repo.findOne.mockResolvedValue({ id: POSITION_ID, userId: USER_A } as never);

      await service.removePosition(USER_A, POSITION_ID);

      expect(repo.softDelete).toHaveBeenCalledWith({ id: POSITION_ID, userId: USER_A });
    });

    it('404 si no existe o es de otro usuario (sin filtrar existencia)', async () => {
      repo.findOne.mockResolvedValue(null as never);

      await expect(service.removePosition(USER_B, POSITION_ID)).rejects.toThrow(
        NotFoundException,
      );
      expect(repo.softDelete).not.toHaveBeenCalled();
    });
  });

  describe('listPositions', () => {
    it('siempre filtra por user_id', async () => {
      repo.find.mockResolvedValue([] as never);

      await service.listPositions(USER_A);

      expect(repo.find).toHaveBeenCalledWith({
        where: { userId: USER_A },
        order: { createdAt: 'ASC' },
      });
    });
  });
});
