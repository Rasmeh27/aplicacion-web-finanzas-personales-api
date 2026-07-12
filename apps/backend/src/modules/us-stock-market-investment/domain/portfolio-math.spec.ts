import { describe, expect, it } from '@jest/globals';
import {
  aggregateMarketStatus,
  aggregatePortfolioTotals,
  computeConcentration,
  computePositionMetrics,
  computeWeights,
  positionCostBasis,
} from './portfolio-math';

describe('portfolio-math (funciones puras)', () => {
  describe('positionCostBasis', () => {
    it('multiplica cantidad por costo promedio con redondeo a 2 decimales', () => {
      expect(positionCostBasis(2.5, 190.25)).toBe(475.63);
      expect(positionCostBasis(3, 100)).toBe(300);
      expect(positionCostBasis(0.333, 3)).toBe(1);
    });
  });

  describe('computePositionMetrics', () => {
    it('calcula market value, ganancia/pérdida y cambio diario con cotización', () => {
      const metrics = computePositionMetrics({
        symbol: 'AAPL',
        quantity: 2,
        averageCost: 100,
        price: 120,
        previousClose: 110,
        quoteStatus: 'fresh',
      });

      expect(metrics.costBasis).toBe(200);
      expect(metrics.marketValue).toBe(240);
      expect(metrics.unrealizedGainLoss).toBe(40);
      expect(metrics.unrealizedGainLossPct).toBe(20);
      expect(metrics.dayChange).toBe(20);
      expect(metrics.dayChangePct).toBe(9.09);
    });

    it('sin cotización: conserva el costo y deja null lo dependiente de mercado', () => {
      const metrics = computePositionMetrics({
        symbol: 'MSFT',
        quantity: 1.5,
        averageCost: 400,
        price: null,
        previousClose: null,
        quoteStatus: 'unavailable',
      });

      expect(metrics.costBasis).toBe(600);
      expect(metrics.marketValue).toBeNull();
      expect(metrics.unrealizedGainLoss).toBeNull();
      expect(metrics.unrealizedGainLossPct).toBeNull();
      expect(metrics.dayChange).toBeNull();
    });

    it('costo promedio 0: pct de ganancia es null (no división por cero)', () => {
      const metrics = computePositionMetrics({
        symbol: 'GIFT',
        quantity: 10,
        averageCost: 0,
        price: 5,
        previousClose: 5,
        quoteStatus: 'fresh',
      });
      expect(metrics.costBasis).toBe(0);
      expect(metrics.marketValue).toBe(50);
      expect(metrics.unrealizedGainLoss).toBe(50);
      expect(metrics.unrealizedGainLossPct).toBeNull();
    });

    it('pérdida no realizada negativa se calcula correctamente', () => {
      const metrics = computePositionMetrics({
        symbol: 'TSLA',
        quantity: 4,
        averageCost: 300,
        price: 250,
        previousClose: 260,
        quoteStatus: 'fresh',
      });
      expect(metrics.unrealizedGainLoss).toBe(-200);
      expect(metrics.unrealizedGainLossPct).toBe(-16.67);
      expect(metrics.dayChange).toBe(-40);
    });
  });

  describe('aggregatePortfolioTotals', () => {
    const priced = (symbol: string, cost: number, value: number, day = 0) => ({
      symbol,
      costBasis: cost,
      marketValue: value,
      unrealizedGainLoss: value - cost,
      unrealizedGainLossPct: cost > 0 ? ((value - cost) / cost) * 100 : null,
      dayChange: day,
      dayChangePct: null,
    });

    it('agrega costo, valor y ganancia cuando todo está cotizado', () => {
      const totals = aggregatePortfolioTotals([
        priced('AAPL', 500, 600, 10),
        priced('VOO', 1000, 1050, -5),
      ]);

      expect(totals.positionsCount).toBe(2);
      expect(totals.costBasis).toBe(1500);
      expect(totals.marketValue).toBe(1650);
      expect(totals.unrealizedGainLoss).toBe(150);
      expect(totals.unrealizedGainLossPct).toBe(10);
      expect(totals.dayChange).toBe(5);
    });

    it('con datos parciales: conserva el costo y anula agregados de mercado', () => {
      const totals = aggregatePortfolioTotals([
        priced('AAPL', 500, 600),
        {
          symbol: 'MSFT',
          costBasis: 300,
          marketValue: null,
          unrealizedGainLoss: null,
          unrealizedGainLossPct: null,
          dayChange: null,
          dayChangePct: null,
        },
      ]);

      expect(totals.costBasis).toBe(800);
      expect(totals.marketValue).toBeNull();
      expect(totals.unrealizedGainLoss).toBeNull();
      expect(totals.dayChange).toBeNull();
    });

    it('portafolio vacío: todo null salvo costo 0', () => {
      const totals = aggregatePortfolioTotals([]);
      expect(totals.positionsCount).toBe(0);
      expect(totals.costBasis).toBe(0);
      expect(totals.marketValue).toBeNull();
    });
  });

  describe('computeWeights y computeConcentration', () => {
    const metric = (symbol: string, cost: number, value: number | null) => ({
      symbol,
      costBasis: cost,
      marketValue: value,
      unrealizedGainLoss: null,
      unrealizedGainLossPct: null,
      dayChange: null,
      dayChangePct: null,
    });

    it('usa market value cuando todas las posiciones están cotizadas', () => {
      const { basis, weights } = computeWeights([
        metric('AAPL', 100, 900),
        metric('VOO', 100, 750),
      ]);

      expect(basis).toBe('market_value');
      expect(weights[0].symbol).toBe('AAPL');
      expect(weights[0].weight).toBe(0.5455);
      expect(weights[1].weight).toBe(0.4545);
    });

    it('cae a cost basis (etiquetado) cuando falta alguna cotización', () => {
      const { basis, weights } = computeWeights([
        metric('AAPL', 300, 900),
        metric('MSFT', 100, null),
      ]);

      expect(basis).toBe('cost_basis');
      expect(weights[0].weight).toBe(0.75);
      expect(weights[1].weight).toBe(0.25);
    });

    it('concentración: top 1 y top 3 sobre pesos ordenados', () => {
      const { weights } = computeWeights([
        metric('A', 0, 500),
        metric('B', 0, 250),
        metric('C', 0, 150),
        metric('D', 0, 100),
      ]);
      const concentration = computeConcentration(weights);

      expect(concentration.positionCount).toBe(4);
      expect(concentration.topPositionSymbol).toBe('A');
      expect(concentration.topPositionWeight).toBe(0.5);
      expect(concentration.topThreeWeight).toBe(0.9);
    });

    it('concentración de lista vacía: nulls y count 0', () => {
      expect(computeConcentration([])).toEqual({
        positionCount: 0,
        topPositionSymbol: null,
        topPositionWeight: null,
        topThreeWeight: null,
      });
    });
  });

  describe('aggregateMarketStatus', () => {
    it('empty sin posiciones', () => {
      expect(aggregateMarketStatus([])).toBe('empty');
    });
    it('fresh cuando todas frescas', () => {
      expect(aggregateMarketStatus(['fresh', 'fresh'])).toBe('fresh');
    });
    it('stale cuando todas cotizadas pero alguna vieja', () => {
      expect(aggregateMarketStatus(['fresh', 'stale'])).toBe('stale');
    });
    it('partial cuando falta alguna cotización', () => {
      expect(aggregateMarketStatus(['fresh', 'unavailable'])).toBe('partial');
    });
    it('unavailable cuando no hay ninguna cotización', () => {
      expect(aggregateMarketStatus(['unavailable', 'unavailable'])).toBe('unavailable');
    });
  });
});
