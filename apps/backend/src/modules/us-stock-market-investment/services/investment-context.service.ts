import { Injectable, Logger } from '@nestjs/common';
import {
  aggregatePortfolioTotals,
  computeConcentration,
  computeWeights,
} from '../domain/portfolio-math';
import { InvestmentAnalyticsService } from './investment-analytics.service';

/**
 * Sección opcional de inversiones del contexto financiero que consume el AI
 * Service para usuarios PREMIUM. Solo agregados: sin notas privadas, sin
 * fechas de compra, sin credenciales ni datos de otros usuarios. El número de
 * posiciones enviadas al modelo está acotado.
 */
export interface InvestmentContextPayload {
  portfolioAvailable: boolean;
  currency: string;
  marketDataStatus: string;
  asOf: string | null;
  summary: {
    costBasis: number;
    marketValue: number | null;
    unrealizedGainLoss: number | null;
    unrealizedGainLossPct: number | null;
    dayChange: number | null;
  } | null;
  allocation: {
    symbol: string;
    assetType: string;
    marketValue: number | null;
    weight: number;
  }[];
  riskIndicators: {
    topPositionWeight: number | null;
    topThreeWeight: number | null;
    positionCount: number;
  } | null;
  warnings: string[];
}

/** Máximo de posiciones detalladas que se comparten con el modelo. */
const MAX_ALLOCATION_ITEMS = 8;

@Injectable()
export class InvestmentContextService {
  private readonly logger = new Logger(InvestmentContextService.name);

  constructor(private readonly analytics: InvestmentAnalyticsService) {}

  /**
   * Contexto agregado del portafolio para la IA. Nunca lanza: ante cualquier
   * fallo devuelve null y el chat continúa sin contexto de inversiones.
   */
  async buildInvestmentContext(userId: string): Promise<InvestmentContextPayload | null> {
    try {
      const enriched = await this.analytics.getEnrichedPositions(userId);

      if (enriched.items.length === 0) {
        return {
          portfolioAvailable: false,
          currency: enriched.baseCurrency,
          marketDataStatus: enriched.marketDataStatus,
          asOf: null,
          summary: null,
          allocation: [],
          riskIndicators: null,
          warnings: ['portfolio_empty'],
        };
      }

      const metrics = enriched.items.map((item) => ({
        symbol: item.symbol,
        costBasis: item.costBasis,
        marketValue: item.marketValue,
        unrealizedGainLoss: item.unrealizedGainLoss,
        unrealizedGainLossPct: item.unrealizedGainLossPct,
        dayChange: item.dayChange,
        dayChangePct: item.dayChangePct,
      }));

      const totals = aggregatePortfolioTotals(metrics);
      const { weights } = computeWeights(metrics);
      const concentration = computeConcentration(weights);

      const assetTypeBySymbol = new Map(
        enriched.items.map((item) => [item.symbol, item.assetType]),
      );
      const marketValueBySymbol = new Map(
        enriched.items.map((item) => [item.symbol, item.marketValue]),
      );

      const warnings: string[] = [];
      if (enriched.marketDataStatus !== 'fresh') {
        warnings.push(`market_data_${enriched.marketDataStatus}`);
      }
      if (weights.length > MAX_ALLOCATION_ITEMS) {
        warnings.push('allocation_truncated');
      }

      return {
        portfolioAvailable: true,
        currency: enriched.baseCurrency,
        marketDataStatus: enriched.marketDataStatus,
        asOf: enriched.asOf,
        summary: {
          costBasis: totals.costBasis,
          marketValue: totals.marketValue,
          unrealizedGainLoss: totals.unrealizedGainLoss,
          unrealizedGainLossPct: totals.unrealizedGainLossPct,
          dayChange: totals.dayChange,
        },
        allocation: weights.slice(0, MAX_ALLOCATION_ITEMS).map((weight) => ({
          symbol: weight.symbol,
          assetType: assetTypeBySymbol.get(weight.symbol) ?? 'stock',
          marketValue: marketValueBySymbol.get(weight.symbol) ?? null,
          weight: weight.weight,
        })),
        riskIndicators: {
          topPositionWeight: concentration.topPositionWeight,
          topThreeWeight: concentration.topThreeWeight,
          positionCount: concentration.positionCount,
        },
        warnings,
      };
    } catch (error) {
      this.logger.warn(
        `investment context skipped user_id=${userId} reason=${(error as Error)?.name}`,
      );
      return null;
    }
  }
}
