import axios from 'axios';
import apiClient from '@/lib/api/client';
import type { TranslationKey } from '@/shared/i18n/translations';
import type {
  AllocationResponse,
  CreatePositionPayload,
  CreatePositionResponse,
  InvestmentPortfolio,
  MarketRange,
  PerformanceResponse,
  PortfolioSummary,
  PositionsListResponse,
  SymbolHistoryResponse,
  SymbolSearchResponse,
  UpdatePositionPayload,
} from '../types';

/**
 * API Premium de inversiones. El backend exige JWT + plan Premium
 * (PremiumPlanGuard); el frontend jamás envía userId, portfolioId ajeno ni plan.
 */
export const investmentsService = {
  async getPortfolio(): Promise<InvestmentPortfolio> {
    const { data } = await apiClient.get<InvestmentPortfolio>('/investments/portfolio');
    return data;
  },

  async listPositions(): Promise<PositionsListResponse> {
    const { data } = await apiClient.get<PositionsListResponse>('/investments/positions');
    return data;
  },

  async createPosition(payload: CreatePositionPayload): Promise<CreatePositionResponse> {
    const { data } = await apiClient.post<CreatePositionResponse>(
      '/investments/positions',
      payload,
    );
    return data;
  },

  async updatePosition(id: string, payload: UpdatePositionPayload) {
    const { data } = await apiClient.patch(`/investments/positions/${id}`, payload);
    return data;
  },

  async removePosition(id: string): Promise<void> {
    await apiClient.delete(`/investments/positions/${id}`);
  },

  async getSummary(): Promise<PortfolioSummary> {
    const { data } = await apiClient.get<PortfolioSummary>('/investments/summary');
    return data;
  },

  async getAllocation(): Promise<AllocationResponse> {
    const { data } = await apiClient.get<AllocationResponse>('/investments/allocation');
    return data;
  },

  async getPerformance(range: MarketRange = 'ALL'): Promise<PerformanceResponse> {
    const { data } = await apiClient.get<PerformanceResponse>('/investments/performance', {
      params: { range },
    });
    return data;
  },

  async searchSymbols(query: string): Promise<SymbolSearchResponse> {
    const { data } = await apiClient.get<SymbolSearchResponse>('/investments/symbols/search', {
      params: { query },
    });
    return data;
  },

  async getSymbolHistory(
    symbol: string,
    range: Exclude<MarketRange, 'ALL'> = '3M',
  ): Promise<SymbolHistoryResponse> {
    const { data } = await apiClient.get<SymbolHistoryResponse>(
      `/investments/symbols/${encodeURIComponent(symbol)}/history`,
      { params: { range } },
    );
    return data;
  },
};

/** Mapea códigos de error controlados del backend a claves i18n. */
export function investmentErrorKey(error: unknown): TranslationKey {
  if (axios.isAxiosError(error)) {
    const code = (error.response?.data as { code?: string } | undefined)?.code;
    switch (code) {
      case 'duplicate_position':
        return 'investments.error.duplicate';
      case 'invalid_market_symbol':
        return 'investments.error.invalidSymbol';
      case 'market_data_rate_limited':
        return 'investments.error.rateLimited';
      case 'market_data_unavailable':
        return 'investments.error.marketUnavailable';
      case 'premium_required':
        return 'investments.error.premiumRequired';
      default:
        break;
    }
    if (error.response?.status === 403) return 'investments.error.premiumRequired';
  }
  return 'investments.error.generic';
}

/** True cuando el backend rechazó por plan (para refrescar el gating). */
export function isPremiumRequiredError(error: unknown): boolean {
  return (
    axios.isAxiosError(error) &&
    (error.response?.status === 403 ||
      (error.response?.data as { code?: string } | undefined)?.code === 'premium_required')
  );
}
