import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { MarketDataService } from '../../../integrations/market-data/market-data.service';
import {
  MarketProviderId,
  MarketRange,
  MarketStatus,
  QuoteResult,
} from '../../../integrations/market-data/market-data.types';
import {
  aggregateMarketStatus,
  aggregatePortfolioTotals,
  computeConcentration,
  computePositionMetrics,
  computeWeights,
  PortfolioMarketStatus,
  PositionMetrics,
  round2,
  round4,
  WeightBasis,
} from '../domain/portfolio-math';
import { InvestmentPortfolioSnapshot } from '../entities/investment-portfolio-snapshot.entity';
import { InvestmentPosition } from '../entities/investment-position.entity';
import { InvestmentPortfolioService } from './investment-portfolio.service';
import { InvestmentPositionsService } from './investment-positions.service';

export interface EnrichedPosition {
  id: string;
  symbol: string;
  displayName: string | null;
  assetType: string;
  quantity: number;
  averageCost: number;
  currency: string;
  purchaseDate: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  costBasis: number;
  currentPrice: number | null;
  marketValue: number | null;
  unrealizedGainLoss: number | null;
  unrealizedGainLossPct: number | null;
  dayChange: number | null;
  dayChangePct: number | null;
  weight: number | null;
  priceAsOf: string | null;
  priceStatus: 'fresh' | 'stale' | 'unavailable';
}

/**
 * Metadata de mercado que acompaña cada respuesta de inversiones. Permite al
 * frontend distinguir datos reales de demo, mostrar el estado del mercado y
 * señalar los símbolos que fallaron sin romper la vista.
 */
export interface MarketDataMeta {
  provider: MarketProviderId;
  status: PortfolioMarketStatus;
  isMock: boolean;
  asOf: string | null;
  marketStatus: MarketStatus;
  failedSymbols: string[];
}

export interface PositionsListResponse {
  portfolioId: string | null;
  baseCurrency: string;
  items: EnrichedPosition[];
  marketDataStatus: PortfolioMarketStatus;
  /** Alias plano del provider id (compat); usar `marketData` para lo demás. */
  marketDataSource: MarketProviderId;
  weightsBasis: WeightBasis | null;
  asOf: string | null;
  marketData: MarketDataMeta;
}

export interface PortfolioSummaryResponse {
  portfolioId: string;
  baseCurrency: string;
  positionsCount: number;
  costBasis: number;
  marketValue: number | null;
  unrealizedGainLoss: number | null;
  unrealizedGainLossPct: number | null;
  dayChange: number | null;
  dayChangePct: number | null;
  topPosition: { symbol: string; weight: number } | null;
  topThreeConcentration: number | null;
  weightsBasis: WeightBasis | null;
  marketDataStatus: PortfolioMarketStatus;
  marketDataSource: MarketProviderId;
  asOf: string | null;
  updatedAt: string;
  marketData: MarketDataMeta;
}

export interface AllocationItem {
  symbol: string;
  displayName: string | null;
  assetType: string;
  value: number;
  weight: number;
}

export interface AllocationResponse {
  portfolioId: string;
  basis: WeightBasis | null;
  items: AllocationItem[];
  byAssetType: { assetType: string; value: number; weight: number }[];
  marketDataStatus: PortfolioMarketStatus;
  marketDataSource: MarketProviderId;
  asOf: string | null;
  marketData: MarketDataMeta;
}

export interface PerformancePoint {
  date: string;
  costBasis: number;
  marketValue: number | null;
  unrealizedGainLoss: number | null;
  marketDataStatus: string;
}

export interface PerformanceResponse {
  portfolioId: string;
  range: MarketRange;
  points: PerformancePoint[];
  insufficientData: boolean;
  /** El historial comienza cuando se registra el primer snapshot. */
  historyStartsAt: string | null;
}

const RANGE_DAYS: Record<MarketRange, number | null> = {
  '1M': 31,
  '3M': 93,
  '6M': 186,
  '1Y': 372,
  ALL: null,
};

interface EnrichmentComputation {
  positions: InvestmentPosition[];
  metrics: PositionMetrics[];
  quotes: Map<string, QuoteResult>;
  status: PortfolioMarketStatus;
  asOf: string | null;
  marketStatus: MarketStatus;
  failedSymbols: string[];
}

@Injectable()
export class InvestmentAnalyticsService {
  private readonly logger = new Logger(InvestmentAnalyticsService.name);

  constructor(
    @InjectRepository(InvestmentPortfolioSnapshot)
    private readonly snapshotRepo: Repository<InvestmentPortfolioSnapshot>,
    private readonly portfolioService: InvestmentPortfolioService,
    private readonly positionsService: InvestmentPositionsService,
    private readonly marketData: MarketDataService,
  ) {}

  /** Posiciones activas enriquecidas con datos de mercado cuando existan. */
  async getEnrichedPositions(userId: string): Promise<PositionsListResponse> {
    const portfolio = await this.portfolioService.getOrCreateDefaultPortfolio(userId);
    const computation = await this.computeEnrichment(userId);
    const { positions, metrics, quotes, status, asOf } = computation;

    const { basis, weights } =
      positions.length > 0 ? computeWeights(metrics) : { basis: null, weights: [] };
    const weightBySymbol = new Map(weights.map((w) => [w.symbol, w.weight]));

    const items: EnrichedPosition[] = positions.map((position, index) => {
      const metric = metrics[index];
      const quote = quotes.get(position.symbol);
      return {
        id: position.id,
        symbol: position.symbol,
        displayName: position.displayName,
        assetType: position.assetType,
        quantity: Number(position.quantity),
        averageCost: Number(position.averageCost),
        currency: position.currency,
        purchaseDate: position.purchaseDate,
        notes: position.notes,
        createdAt: position.createdAt,
        updatedAt: position.updatedAt,
        costBasis: metric.costBasis,
        currentPrice: quote?.quote?.price ?? null,
        marketValue: metric.marketValue,
        unrealizedGainLoss: metric.unrealizedGainLoss,
        unrealizedGainLossPct: metric.unrealizedGainLossPct,
        dayChange: metric.dayChange,
        dayChangePct: metric.dayChangePct,
        weight: weightBySymbol.get(position.symbol) ?? null,
        priceAsOf: quote?.quote?.asOf ?? null,
        priceStatus: quote?.status ?? 'unavailable',
      };
    });

    return {
      portfolioId: portfolio.id,
      baseCurrency: portfolio.baseCurrency,
      items,
      marketDataStatus: status,
      marketDataSource: this.marketData.providerId,
      weightsBasis: items.length > 0 ? basis : null,
      asOf,
      marketData: this.buildMarketDataMeta(computation),
    };
  }

  /**
   * Resumen del portafolio. Con datos de mercado válidos registra (idempotente)
   * el snapshot del día; un fallo del snapshot nunca rompe la respuesta.
   */
  async getSummary(userId: string): Promise<PortfolioSummaryResponse> {
    const portfolio = await this.portfolioService.getOrCreateDefaultPortfolio(userId);
    const computation = await this.computeEnrichment(userId);
    const { metrics, status, asOf } = computation;

    const totals = aggregatePortfolioTotals(metrics);
    const { basis, weights } =
      metrics.length > 0 ? computeWeights(metrics) : { basis: null, weights: [] };
    const concentration = computeConcentration(weights);

    if (metrics.length > 0) {
      try {
        await this.upsertDailySnapshot(userId, portfolio.id, {
          costBasis: totals.costBasis,
          marketValue: totals.marketValue,
          unrealizedGainLoss: totals.unrealizedGainLoss,
          status,
        });
      } catch (error) {
        this.logger.warn(
          `snapshot upsert failed user_id=${userId} reason=${(error as Error)?.name}`,
        );
      }
    }

    return {
      portfolioId: portfolio.id,
      baseCurrency: portfolio.baseCurrency,
      positionsCount: totals.positionsCount,
      costBasis: totals.costBasis,
      marketValue: totals.marketValue,
      unrealizedGainLoss: totals.unrealizedGainLoss,
      unrealizedGainLossPct: totals.unrealizedGainLossPct,
      dayChange: totals.dayChange,
      dayChangePct: totals.dayChangePct,
      topPosition:
        concentration.topPositionSymbol !== null
          ? {
              symbol: concentration.topPositionSymbol,
              weight: concentration.topPositionWeight ?? 0,
            }
          : null,
      topThreeConcentration: concentration.topThreeWeight,
      weightsBasis: metrics.length > 0 ? basis : null,
      marketDataStatus: status,
      marketDataSource: this.marketData.providerId,
      asOf,
      updatedAt: new Date().toISOString(),
      marketData: this.buildMarketDataMeta(computation),
    };
  }

  /** Distribución por símbolo y por tipo de activo. */
  async getAllocation(userId: string): Promise<AllocationResponse> {
    const portfolio = await this.portfolioService.getOrCreateDefaultPortfolio(userId);
    const computation = await this.computeEnrichment(userId);
    const { positions, metrics, status, asOf } = computation;

    if (positions.length === 0) {
      return {
        portfolioId: portfolio.id,
        basis: null,
        items: [],
        byAssetType: [],
        marketDataStatus: status,
        marketDataSource: this.marketData.providerId,
        asOf,
        marketData: this.buildMarketDataMeta(computation),
      };
    }

    const { basis, weights } = computeWeights(metrics);
    const positionBySymbol = new Map(positions.map((p) => [p.symbol, p]));

    const items: AllocationItem[] = weights.map((weight) => {
      const position = positionBySymbol.get(weight.symbol);
      return {
        symbol: weight.symbol,
        displayName: position?.displayName ?? null,
        assetType: position?.assetType ?? 'stock',
        value: weight.value,
        weight: weight.weight,
      };
    });

    const byType = new Map<string, number>();
    for (const item of items) {
      byType.set(item.assetType, (byType.get(item.assetType) ?? 0) + item.value);
    }
    const totalValue = items.reduce((acc, item) => acc + item.value, 0);
    const byAssetType = [...byType.entries()].map(([assetType, value]) => ({
      assetType,
      value: round2(value),
      weight: totalValue > 0 ? round4(value / totalValue) : 0,
    }));

    return {
      portfolioId: portfolio.id,
      basis,
      items,
      byAssetType,
      marketDataStatus: status,
      marketDataSource: this.marketData.providerId,
      asOf,
      marketData: this.buildMarketDataMeta(computation),
    };
  }

  /**
   * Evolución del portafolio a partir de snapshots REALES almacenados.
   * Nunca fabrica una curva: si hay pocos puntos lo indica explícitamente.
   */
  async getPerformance(userId: string, range: MarketRange): Promise<PerformanceResponse> {
    const portfolio = await this.portfolioService.getOrCreateDefaultPortfolio(userId);

    const days = RANGE_DAYS[range];
    const where: Record<string, unknown> = { userId, portfolioId: portfolio.id };
    if (days !== null) {
      const cutoff = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
      where.snapshotDate = MoreThanOrEqual(cutoff);
    }

    const snapshots = await this.snapshotRepo.find({
      where,
      order: { snapshotDate: 'ASC' },
    });

    const first = await this.snapshotRepo.findOne({
      where: { userId, portfolioId: portfolio.id },
      order: { snapshotDate: 'ASC' },
    });

    return {
      portfolioId: portfolio.id,
      range,
      points: snapshots.map((snapshot) => ({
        date: snapshot.snapshotDate,
        costBasis: Number(snapshot.costBasis),
        marketValue: snapshot.marketValue !== null ? Number(snapshot.marketValue) : null,
        unrealizedGainLoss:
          snapshot.unrealizedGainLoss !== null ? Number(snapshot.unrealizedGainLoss) : null,
        marketDataStatus: snapshot.marketDataStatus,
      })),
      insufficientData: snapshots.length < 2,
      historyStartsAt: first?.snapshotDate ?? null,
    };
  }

  /**
   * Snapshot diario idempotente (unique portfolio_id + snapshot_date).
   *
   * Reglas de honestidad:
   *  - status fresh: guarda/actualiza valores completos.
   *  - partial/stale/unavailable: solo crea el registro del día si no existe,
   *    con market_value null (no se fabrican valoraciones); nunca degrada un
   *    snapshot fresh ya guardado.
   */
  async upsertDailySnapshot(
    userId: string,
    portfolioId: string,
    data: {
      costBasis: number;
      marketValue: number | null;
      unrealizedGainLoss: number | null;
      status: PortfolioMarketStatus;
    },
  ): Promise<void> {
    if (data.status === 'empty') return;

    const snapshotDate = new Date().toISOString().slice(0, 10);
    const existing = await this.snapshotRepo.findOne({
      where: { userId, portfolioId, snapshotDate },
    });

    const isFresh = data.status === 'fresh';
    if (existing) {
      if (!isFresh) return; // nunca degradar un snapshot ya registrado
      await this.snapshotRepo.update(
        { id: existing.id, userId },
        {
          costBasis: data.costBasis,
          marketValue: data.marketValue,
          unrealizedGainLoss: data.unrealizedGainLoss,
          marketDataStatus: 'fresh',
        },
      );
      return;
    }

    try {
      await this.snapshotRepo.save(
        this.snapshotRepo.create({
          userId,
          portfolioId,
          snapshotDate,
          costBasis: data.costBasis,
          marketValue: isFresh ? data.marketValue : null,
          unrealizedGainLoss: isFresh ? data.unrealizedGainLoss : null,
          currency: 'USD',
          marketDataStatus: data.status,
        }),
      );
    } catch {
      // Carrera con otra request del mismo día: la restricción única manda.
      this.logger.warn(
        `snapshot insert race portfolio_id=${portfolioId} date=${snapshotDate}`,
      );
    }
  }

  private async computeEnrichment(userId: string): Promise<EnrichmentComputation> {
    const positions = await this.positionsService.listPositions(userId);
    if (positions.length === 0) {
      return {
        positions,
        metrics: [],
        quotes: new Map(),
        status: 'empty',
        asOf: null,
        marketStatus: 'unknown',
        failedSymbols: [],
      };
    }

    const quotes = await this.marketData.getQuotes(positions.map((p) => p.symbol));

    const metrics = positions.map((position) => {
      const quote = quotes.get(position.symbol);
      return computePositionMetrics({
        symbol: position.symbol,
        quantity: Number(position.quantity),
        averageCost: Number(position.averageCost),
        price: quote?.quote?.price ?? null,
        previousClose: quote?.quote?.previousClose ?? null,
        quoteStatus: quote?.status ?? 'unavailable',
      });
    });

    const statuses = positions.map(
      (position) => quotes.get(position.symbol)?.status ?? 'unavailable',
    );
    const status = aggregateMarketStatus(statuses);

    const asOfCandidates = positions
      .map((position) => quotes.get(position.symbol)?.quote?.asOf)
      .filter((value): value is string => Boolean(value))
      .sort();
    const asOf = asOfCandidates.length > 0 ? asOfCandidates[asOfCandidates.length - 1] : null;

    const failedSymbols = positions
      .filter((position) => quotes.get(position.symbol)?.status === 'unavailable')
      .map((position) => position.symbol);

    const marketStatuses = positions
      .map((position) => quotes.get(position.symbol)?.quote?.marketStatus)
      .filter((value): value is MarketStatus => Boolean(value));
    let marketStatus: MarketStatus = 'unknown';
    if (marketStatuses.includes('open')) marketStatus = 'open';
    else if (marketStatuses.includes('closed')) marketStatus = 'closed';

    return { positions, metrics, quotes, status, asOf, marketStatus, failedSymbols };
  }

  /** Construye el bloque de metadata de mercado para las respuestas. */
  private buildMarketDataMeta(computation: EnrichmentComputation): MarketDataMeta {
    return {
      provider: this.marketData.providerId,
      status: computation.status,
      isMock: this.marketData.isMock,
      asOf: computation.asOf,
      marketStatus: computation.marketStatus,
      failedSymbols: computation.failedSymbols,
    };
  }
}
