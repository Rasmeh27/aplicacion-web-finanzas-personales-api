import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { MarketDataService } from '../../../integrations/market-data/market-data.service';
import { QuoteResult } from '../../../integrations/market-data/market-data.types';
import { InvestmentPortfolioSnapshot } from '../entities/investment-portfolio-snapshot.entity';
import { InvestmentAnalyticsService } from './investment-analytics.service';
import { InvestmentPortfolioService } from './investment-portfolio.service';
import { InvestmentPositionsService } from './investment-positions.service';

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const PORTFOLIO_ID = '770e8400-e29b-41d4-a716-446655440222';

function position(symbol: string, quantity: number, averageCost: number) {
  return {
    id: `pos-${symbol}`,
    userId: USER_ID,
    portfolioId: PORTFOLIO_ID,
    symbol,
    displayName: null,
    assetType: symbol === 'VOO' ? 'etf' : 'stock',
    quantity,
    averageCost,
    currency: 'USD',
    purchaseDate: null,
    notes: null,
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    updatedAt: new Date('2026-07-01T00:00:00.000Z'),
  };
}

function freshQuote(symbol: string, price: number, previousClose: number): QuoteResult {
  return {
    symbol,
    status: 'fresh',
    quote: {
      symbol,
      name: `${symbol} Inc`,
      assetType: 'stock',
      currency: 'USD',
      exchange: 'NASDAQ',
      price,
      previousClose,
      open: previousClose,
      high: price,
      low: previousClose,
      volume: 1000,
      change: price - previousClose,
      changePct: 1,
      asOf: '2026-07-11T15:00:00.000Z',
      provider: 'twelve_data',
      marketStatus: 'open',
      isDelayed: null,
    },
  };
}

describe('InvestmentAnalyticsService', () => {
  let service: InvestmentAnalyticsService;
  let snapshotRepo: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
  };
  let portfolioService: { getOrCreateDefaultPortfolio: jest.Mock };
  let positionsService: { listPositions: jest.Mock };
  let marketData: { getQuotes: jest.Mock; providerId: string; isMock: boolean };

  beforeEach(async () => {
    snapshotRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((value: unknown) => value),
      save: jest.fn(),
      update: jest.fn(),
    };
    portfolioService = { getOrCreateDefaultPortfolio: jest.fn() };
    positionsService = { listPositions: jest.fn() };
    marketData = { getQuotes: jest.fn(), providerId: 'twelve_data', isMock: false };

    portfolioService.getOrCreateDefaultPortfolio.mockResolvedValue({
      id: PORTFOLIO_ID,
      userId: USER_ID,
      baseCurrency: 'USD',
    } as never);
    positionsService.listPositions.mockResolvedValue([] as never);
    snapshotRepo.find.mockResolvedValue([] as never);
    snapshotRepo.findOne.mockResolvedValue(null as never);
    snapshotRepo.save.mockImplementation(((value: unknown) =>
      Promise.resolve(value)) as never);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvestmentAnalyticsService,
        {
          provide: getRepositoryToken(InvestmentPortfolioSnapshot),
          useValue: snapshotRepo,
        },
        { provide: InvestmentPortfolioService, useValue: portfolioService },
        { provide: InvestmentPositionsService, useValue: positionsService },
        { provide: MarketDataService, useValue: marketData },
      ],
    }).compile();

    service = module.get(InvestmentAnalyticsService);
  });

  describe('getSummary', () => {
    it('portafolio vacío: costo 0, estado empty, sin snapshot', async () => {
      const summary = await service.getSummary(USER_ID);

      expect(summary.positionsCount).toBe(0);
      expect(summary.costBasis).toBe(0);
      expect(summary.marketValue).toBeNull();
      expect(summary.marketDataStatus).toBe('empty');
      expect(snapshotRepo.save).not.toHaveBeenCalled();
    });

    it('con cotizaciones frescas: totales correctos y snapshot del día', async () => {
      positionsService.listPositions.mockResolvedValue([
        position('AAPL', 5, 100), // costo 500
        position('VOO', 2, 500), // costo 1000
      ] as never);
      marketData.getQuotes.mockResolvedValue(
        new Map([
          ['AAPL', freshQuote('AAPL', 120, 110)], // valor 600
          ['VOO', freshQuote('VOO', 525, 520)], // valor 1050
        ]) as never,
      );

      const summary = await service.getSummary(USER_ID);

      expect(summary.costBasis).toBe(1500);
      expect(summary.marketValue).toBe(1650);
      expect(summary.unrealizedGainLoss).toBe(150);
      expect(summary.unrealizedGainLossPct).toBe(10);
      expect(summary.dayChange).toBe(60); // 5*10 + 2*5
      expect(summary.positionsCount).toBe(2);
      expect(summary.topPosition?.symbol).toBe('VOO');
      expect(summary.topThreeConcentration).toBe(1);
      expect(summary.marketDataStatus).toBe('fresh');
      expect(summary.marketDataSource).toBe('twelve_data');
      expect(summary.marketData).toEqual(
        expect.objectContaining({
          provider: 'twelve_data',
          isMock: false,
          status: 'fresh',
          failedSymbols: [],
        }),
      );

      // Snapshot idempotente del día con valores completos.
      const saved = snapshotRepo.save.mock.calls[0][0] as Record<string, unknown>;
      expect(saved.portfolioId).toBe(PORTFOLIO_ID);
      expect(saved.costBasis).toBe(1500);
      expect(saved.marketValue).toBe(1650);
      expect(saved.marketDataStatus).toBe('fresh');
    });

    it('proveedor caído: conserva costo, valores null y estado unavailable', async () => {
      positionsService.listPositions.mockResolvedValue([
        position('AAPL', 5, 100),
      ] as never);
      marketData.getQuotes.mockResolvedValue(
        new Map([['AAPL', { symbol: 'AAPL', quote: null, status: 'unavailable' }]]) as never,
      );

      const summary = await service.getSummary(USER_ID);

      expect(summary.costBasis).toBe(500);
      expect(summary.marketValue).toBeNull();
      expect(summary.unrealizedGainLoss).toBeNull();
      expect(summary.dayChange).toBeNull();
      expect(summary.marketDataStatus).toBe('unavailable');
      // El snapshot del día se crea con market_value null (etiquetado), sin inventar.
      const saved = snapshotRepo.save.mock.calls[0][0] as Record<string, unknown>;
      expect(saved.marketValue).toBeNull();
      expect(saved.marketDataStatus).toBe('unavailable');
    });

    it('datos parciales: agregados de mercado null y estado partial', async () => {
      positionsService.listPositions.mockResolvedValue([
        position('AAPL', 5, 100),
        position('MSFT', 1, 400),
      ] as never);
      marketData.getQuotes.mockResolvedValue(
        new Map<string, QuoteResult>([
          ['AAPL', freshQuote('AAPL', 120, 110)],
          ['MSFT', { symbol: 'MSFT', quote: null, status: 'unavailable' }],
        ]) as never,
      );

      const summary = await service.getSummary(USER_ID);

      expect(summary.costBasis).toBe(900);
      expect(summary.marketValue).toBeNull();
      expect(summary.marketDataStatus).toBe('partial');
      expect(summary.weightsBasis).toBe('cost_basis');
      // El símbolo sin cotización se reporta en failedSymbols (no se inventa precio).
      expect(summary.marketData.failedSymbols).toEqual(['MSFT']);
      expect(summary.marketData.status).toBe('partial');
    });

    it('un fallo del snapshot no rompe el resumen', async () => {
      positionsService.listPositions.mockResolvedValue([
        position('AAPL', 5, 100),
      ] as never);
      marketData.getQuotes.mockResolvedValue(
        new Map([['AAPL', freshQuote('AAPL', 120, 110)]]) as never,
      );
      snapshotRepo.findOne.mockRejectedValue(new Error('db down') as never);

      const summary = await service.getSummary(USER_ID);
      expect(summary.marketValue).toBe(600);
    });
  });

  describe('upsertDailySnapshot (idempotente)', () => {
    const data = {
      costBasis: 1500,
      marketValue: 1650,
      unrealizedGainLoss: 150,
      status: 'fresh' as const,
    };

    it('crea el snapshot del día si no existe', async () => {
      await service.upsertDailySnapshot(USER_ID, PORTFOLIO_ID, data);

      expect(snapshotRepo.save).toHaveBeenCalledTimes(1);
      const saved = snapshotRepo.save.mock.calls[0][0] as Record<string, unknown>;
      expect(saved.snapshotDate).toBe(new Date().toISOString().slice(0, 10));
      expect(saved.currency).toBe('USD');
    });

    it('actualiza (no duplica) el snapshot existente cuando el dato es fresh', async () => {
      snapshotRepo.findOne.mockResolvedValue({
        id: 'snap-1',
        marketDataStatus: 'partial',
      } as never);

      await service.upsertDailySnapshot(USER_ID, PORTFOLIO_ID, data);

      expect(snapshotRepo.save).not.toHaveBeenCalled();
      expect(snapshotRepo.update).toHaveBeenCalledWith(
        { id: 'snap-1', userId: USER_ID },
        {
          costBasis: 1500,
          marketValue: 1650,
          unrealizedGainLoss: 150,
          marketDataStatus: 'fresh',
        },
      );
    });

    it('nunca degrada un snapshot existente con datos no-fresh', async () => {
      snapshotRepo.findOne.mockResolvedValue({
        id: 'snap-1',
        marketDataStatus: 'fresh',
      } as never);

      await service.upsertDailySnapshot(USER_ID, PORTFOLIO_ID, {
        ...data,
        status: 'unavailable',
      });

      expect(snapshotRepo.update).not.toHaveBeenCalled();
      expect(snapshotRepo.save).not.toHaveBeenCalled();
    });

    it('una carrera de inserción (unique) no lanza', async () => {
      snapshotRepo.save.mockRejectedValue(
        new Error('duplicate key value violates unique constraint') as never,
      );

      await expect(
        service.upsertDailySnapshot(USER_ID, PORTFOLIO_ID, data),
      ).resolves.toBeUndefined();
    });
  });

  describe('getPerformance', () => {
    it('devuelve snapshots reales y marca datos insuficientes con < 2 puntos', async () => {
      snapshotRepo.find.mockResolvedValue([
        {
          snapshotDate: '2026-07-10',
          costBasis: '1500.00',
          marketValue: '1600.00',
          unrealizedGainLoss: '100.00',
          marketDataStatus: 'fresh',
        },
      ] as never);
      snapshotRepo.findOne.mockResolvedValue({ snapshotDate: '2026-07-10' } as never);

      const performance = await service.getPerformance(USER_ID, 'ALL');

      expect(performance.points).toHaveLength(1);
      expect(performance.points[0].marketValue).toBe(1600);
      expect(performance.insufficientData).toBe(true);
      expect(performance.historyStartsAt).toBe('2026-07-10');
    });

    it('con 2+ puntos no marca datos insuficientes y no fabrica curva', async () => {
      snapshotRepo.find.mockResolvedValue([
        {
          snapshotDate: '2026-07-10',
          costBasis: '1500.00',
          marketValue: '1600.00',
          unrealizedGainLoss: '100.00',
          marketDataStatus: 'fresh',
        },
        {
          snapshotDate: '2026-07-11',
          costBasis: '1500.00',
          marketValue: null,
          unrealizedGainLoss: null,
          marketDataStatus: 'unavailable',
        },
      ] as never);
      snapshotRepo.findOne.mockResolvedValue({ snapshotDate: '2026-07-10' } as never);

      const performance = await service.getPerformance(USER_ID, '1M');

      expect(performance.insufficientData).toBe(false);
      expect(performance.points[1].marketValue).toBeNull();
      expect(performance.points).toHaveLength(2);
    });
  });

  describe('getAllocation', () => {
    it('distribución por símbolo y por tipo de activo con market value', async () => {
      positionsService.listPositions.mockResolvedValue([
        position('AAPL', 5, 100),
        position('VOO', 2, 500),
      ] as never);
      marketData.getQuotes.mockResolvedValue(
        new Map([
          ['AAPL', freshQuote('AAPL', 120, 110)],
          ['VOO', freshQuote('VOO', 525, 520)],
        ]) as never,
      );

      const allocation = await service.getAllocation(USER_ID);

      expect(allocation.basis).toBe('market_value');
      expect(allocation.items[0].symbol).toBe('VOO'); // mayor peso primero
      expect(allocation.items[0].weight).toBeCloseTo(0.6364, 4);
      const etf = allocation.byAssetType.find((t) => t.assetType === 'etf');
      expect(etf?.value).toBe(1050);
      expect(etf?.weight).toBeCloseTo(0.6364, 4);
    });

    it('portafolio vacío: items vacíos sin gráficos falsos', async () => {
      const allocation = await service.getAllocation(USER_ID);
      expect(allocation.items).toEqual([]);
      expect(allocation.byAssetType).toEqual([]);
      expect(allocation.basis).toBeNull();
    });
  });
});
