/**
 * Cálculos financieros del portafolio como funciones PURAS y deterministas.
 * Sin dependencias de NestJS/TypeORM para que sean fáciles de testear.
 *
 * Regla de honestidad de datos: cuando falta la cotización de una posición,
 * los agregados que dependen de precios (valor de mercado, ganancia/pérdida,
 * cambio del día) son null. Nunca se sustituye un dato faltante por cero ni
 * por el costo.
 */

import { QuoteFreshness } from '../../../integrations/market-data/market-data.types';

export type PortfolioMarketStatus = 'fresh' | 'partial' | 'stale' | 'unavailable' | 'empty';

export interface PositionSnapshotInput {
  symbol: string;
  quantity: number;
  averageCost: number;
  /** Precio actual; null cuando la cotización no está disponible. */
  price: number | null;
  previousClose: number | null;
  quoteStatus: QuoteFreshness;
}

export interface PositionMetrics {
  symbol: string;
  costBasis: number;
  marketValue: number | null;
  unrealizedGainLoss: number | null;
  unrealizedGainLossPct: number | null;
  dayChange: number | null;
  dayChangePct: number | null;
}

export interface PortfolioTotals {
  positionsCount: number;
  costBasis: number;
  marketValue: number | null;
  unrealizedGainLoss: number | null;
  unrealizedGainLossPct: number | null;
  dayChange: number | null;
  dayChangePct: number | null;
}

export type WeightBasis = 'market_value' | 'cost_basis';

export interface PositionWeight {
  symbol: string;
  /** Valor usado para el peso (market value o cost basis según `basis`). */
  value: number;
  /** Fracción 0..1 con 4 decimales. */
  weight: number;
}

export interface WeightsResult {
  basis: WeightBasis;
  weights: PositionWeight[];
}

export interface ConcentrationResult {
  positionCount: number;
  topPositionSymbol: string | null;
  topPositionWeight: number | null;
  topThreeWeight: number | null;
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function round4(value: number): number {
  return Math.round((value + Number.EPSILON) * 10_000) / 10_000;
}

/** Costo total de una posición (cantidad * costo promedio). */
export function positionCostBasis(quantity: number, averageCost: number): number {
  return round2(Number(quantity) * Number(averageCost));
}

/** Métricas de una posición individual; null donde falte cotización. */
export function computePositionMetrics(input: PositionSnapshotInput): PositionMetrics {
  const quantity = Number(input.quantity);
  const costBasis = positionCostBasis(quantity, Number(input.averageCost));

  if (input.price === null || !Number.isFinite(input.price)) {
    return {
      symbol: input.symbol,
      costBasis,
      marketValue: null,
      unrealizedGainLoss: null,
      unrealizedGainLossPct: null,
      dayChange: null,
      dayChangePct: null,
    };
  }

  const marketValue = round2(quantity * input.price);
  const unrealizedGainLoss = round2(marketValue - costBasis);
  const unrealizedGainLossPct =
    costBasis > 0 ? round2((unrealizedGainLoss / costBasis) * 100) : null;

  let dayChange: number | null = null;
  let dayChangePct: number | null = null;
  if (input.previousClose !== null && Number.isFinite(input.previousClose)) {
    dayChange = round2(quantity * (input.price - input.previousClose));
    dayChangePct =
      input.previousClose > 0
        ? round2(((input.price - input.previousClose) / input.previousClose) * 100)
        : null;
  }

  return {
    symbol: input.symbol,
    costBasis,
    marketValue,
    unrealizedGainLoss,
    unrealizedGainLossPct,
    dayChange,
    dayChangePct,
  };
}

/**
 * Agrega las métricas del portafolio. El valor de mercado y sus derivados solo
 * existen cuando TODAS las posiciones tienen cotización; con datos parciales
 * se devuelve null (el detalle por posición conserva lo disponible).
 */
export function aggregatePortfolioTotals(positions: PositionMetrics[]): PortfolioTotals {
  const positionsCount = positions.length;
  const costBasis = round2(positions.reduce((acc, p) => acc + p.costBasis, 0));

  const allPriced = positionsCount > 0 && positions.every((p) => p.marketValue !== null);
  if (!allPriced) {
    return {
      positionsCount,
      costBasis,
      marketValue: null,
      unrealizedGainLoss: null,
      unrealizedGainLossPct: null,
      dayChange: null,
      dayChangePct: null,
    };
  }

  const marketValue = round2(
    positions.reduce((acc, p) => acc + (p.marketValue ?? 0), 0),
  );
  const unrealizedGainLoss = round2(marketValue - costBasis);
  const unrealizedGainLossPct =
    costBasis > 0 ? round2((unrealizedGainLoss / costBasis) * 100) : null;

  const allWithDayChange = positions.every((p) => p.dayChange !== null);
  let dayChange: number | null = null;
  let dayChangePct: number | null = null;
  if (allWithDayChange) {
    dayChange = round2(positions.reduce((acc, p) => acc + (p.dayChange ?? 0), 0));
    const previousValue = marketValue - dayChange;
    dayChangePct = previousValue > 0 ? round2((dayChange / previousValue) * 100) : null;
  }

  return {
    positionsCount,
    costBasis,
    marketValue,
    unrealizedGainLoss,
    unrealizedGainLossPct,
    dayChange,
    dayChangePct,
  };
}

/**
 * Pesos por posición. Usa valor de mercado cuando TODAS las posiciones lo
 * tienen; de lo contrario usa el costo (etiquetado en `basis` para que la UI
 * y la IA lo comuniquen honestamente).
 */
export function computeWeights(positions: PositionMetrics[]): WeightsResult {
  const allPriced = positions.length > 0 && positions.every((p) => p.marketValue !== null);
  const basis: WeightBasis = allPriced ? 'market_value' : 'cost_basis';

  const values = positions.map((p) => ({
    symbol: p.symbol,
    value: basis === 'market_value' ? (p.marketValue as number) : p.costBasis,
  }));

  const total = values.reduce((acc, item) => acc + item.value, 0);
  const weights = values
    .map((item) => ({
      symbol: item.symbol,
      value: round2(item.value),
      weight: total > 0 ? round4(item.value / total) : 0,
    }))
    .sort((a, b) => b.weight - a.weight);

  return { basis, weights };
}

/** Concentración: posición de mayor peso y suma de las tres principales. */
export function computeConcentration(weights: PositionWeight[]): ConcentrationResult {
  if (weights.length === 0) {
    return {
      positionCount: 0,
      topPositionSymbol: null,
      topPositionWeight: null,
      topThreeWeight: null,
    };
  }

  const sorted = [...weights].sort((a, b) => b.weight - a.weight);
  const topThree = sorted.slice(0, 3).reduce((acc, item) => acc + item.weight, 0);

  return {
    positionCount: sorted.length,
    topPositionSymbol: sorted[0].symbol,
    topPositionWeight: sorted[0].weight,
    topThreeWeight: round4(Math.min(topThree, 1)),
  };
}

/**
 * Estado agregado del dato de mercado del portafolio:
 *  - empty:       sin posiciones.
 *  - fresh:       todas las cotizaciones frescas.
 *  - stale:       todas cotizadas pero al menos una desde cache antigua.
 *  - partial:     algunas posiciones sin cotización.
 *  - unavailable: ninguna posición pudo cotizarse.
 */
export function aggregateMarketStatus(statuses: QuoteFreshness[]): PortfolioMarketStatus {
  if (statuses.length === 0) return 'empty';

  const priced = statuses.filter((s) => s !== 'unavailable');
  if (priced.length === 0) return 'unavailable';
  if (priced.length < statuses.length) return 'partial';
  return priced.some((s) => s === 'stale') ? 'stale' : 'fresh';
}
