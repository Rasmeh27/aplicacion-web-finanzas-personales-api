import { Logger } from '@nestjs/common';
import {
  InvalidMarketSymbolError,
  MarketDataRateLimitedError,
  MarketDataUnavailableError,
} from '../market-data.errors';
import {
  HistoricalPricePoint,
  MarketAssetType,
  MarketDataProvider,
  MarketQuote,
  MarketRange,
  MarketSymbol,
} from '../market-data.types';

export interface AlphaVantageOptions {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
}

const DEFAULT_BASE_URL = 'https://www.alphavantage.co';
const DEFAULT_TIMEOUT_MS = 8_000;

const RANGE_CALENDAR_DAYS: Record<MarketRange, number | null> = {
  '1M': 31,
  '3M': 93,
  '6M': 186,
  '1Y': 372,
  ALL: null,
};

/**
 * Proveedor real basado en la API oficial de Alpha Vantage
 * (https://www.alphavantage.co/documentation/). Sin scraping ni endpoints no
 * oficiales. La API key nunca se registra en logs ni sale del backend.
 */
export class AlphaVantageMarketDataProvider implements MarketDataProvider {
  private readonly logger = new Logger(AlphaVantageMarketDataProvider.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(options: AlphaVantageOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async searchSymbols(query: string): Promise<MarketSymbol[]> {
    const payload = await this.request({ function: 'SYMBOL_SEARCH', keywords: query });
    const matches = Array.isArray(payload['bestMatches']) ? payload['bestMatches'] : [];

    return matches
      .map((match: Record<string, string>) => ({
        symbol: (match['1. symbol'] ?? '').toUpperCase(),
        name: match['2. name'] ?? '',
        assetType: this.mapAssetType(match['3. type']),
        region: match['4. region'] ?? 'United States',
        currency: match['8. currency'] ?? 'USD',
      }))
      .filter((item: MarketSymbol) => item.symbol.length > 0)
      .slice(0, 10);
  }

  async getQuote(symbol: string): Promise<MarketQuote> {
    const payload = await this.request({ function: 'GLOBAL_QUOTE', symbol });
    const quote = payload['Global Quote'] as Record<string, string> | undefined;

    if (!quote || !quote['05. price']) {
      // Alpha Vantage devuelve un objeto vacío para símbolos desconocidos.
      throw new InvalidMarketSymbolError(symbol);
    }

    const price = Number(quote['05. price']);
    const previousClose = this.toNumberOrNull(quote['08. previous close']);
    const change = this.toNumberOrNull(quote['09. change']);
    const changePctRaw = quote['10. change percent'];
    const changePct = changePctRaw
      ? this.toNumberOrNull(changePctRaw.replace('%', ''))
      : null;

    if (!Number.isFinite(price) || price <= 0) {
      throw new MarketDataUnavailableError();
    }

    return {
      symbol: (quote['01. symbol'] ?? symbol).toUpperCase(),
      name: null,
      assetType: 'stock',
      currency: 'USD',
      exchange: null,
      price,
      previousClose,
      open: this.toNumberOrNull(quote['02. open']),
      high: this.toNumberOrNull(quote['03. high']),
      low: this.toNumberOrNull(quote['04. low']),
      volume: this.toNumberOrNull(quote['06. volume']),
      change,
      changePct,
      // Conserva el día de cotización real del proveedor (no la hora local).
      asOf: quote['07. latest trading day']
        ? new Date(`${quote['07. latest trading day']}T21:00:00.000Z`).toISOString()
        : '',
      provider: 'alphavantage',
      marketStatus: 'unknown',
      isDelayed: null,
    };
  }

  async getHistoricalPrices(
    symbol: string,
    range: MarketRange,
  ): Promise<HistoricalPricePoint[]> {
    const outputsize = range === '1M' || range === '3M' ? 'compact' : 'full';
    const payload = await this.request({
      function: 'TIME_SERIES_DAILY',
      symbol,
      outputsize,
    });

    const series = payload['Time Series (Daily)'] as
      | Record<string, Record<string, string>>
      | undefined;

    if (!series) {
      throw new InvalidMarketSymbolError(symbol);
    }

    const days = RANGE_CALENDAR_DAYS[range];
    const cutoff = days === null ? null : Date.now() - days * 86_400_000;

    return Object.entries(series)
      .map(([date, values]) => ({ date, close: Number(values['4. close']) }))
      .filter(
        (point) =>
          Number.isFinite(point.close) &&
          (cutoff === null || new Date(`${point.date}T00:00:00.000Z`).getTime() >= cutoff),
      )
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Llama a /query con timeout explícito y un único retry ante fallos de red o
   * 5xx. Errores 429 y avisos de throttling NO se reintentan.
   */
  private async request(
    params: Record<string, string>,
    attempt = 0,
  ): Promise<Record<string, unknown>> {
    const url = new URL(`${this.baseUrl}/query`);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    url.searchParams.set('apikey', this.apiKey);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
    } catch (error) {
      // Timeout o error de red. Un solo retry.
      if (attempt === 0) return this.request(params, 1);
      this.logger.warn(
        `alpha-vantage network error fn=${params.function} reason=${(error as Error)?.name}`,
      );
      throw new MarketDataUnavailableError();
    } finally {
      clearTimeout(timer);
    }

    if (response.status === 429) {
      throw new MarketDataRateLimitedError();
    }
    if (!response.ok) {
      if (response.status >= 500 && attempt === 0) return this.request(params, 1);
      this.logger.warn(
        `alpha-vantage http error fn=${params.function} status=${response.status}`,
      );
      throw new MarketDataUnavailableError();
    }

    let payload: Record<string, unknown>;
    try {
      payload = (await response.json()) as Record<string, unknown>;
    } catch {
      throw new MarketDataUnavailableError();
    }

    // Alpha Vantage informa el throttling con HTTP 200 + "Note"/"Information".
    const note = payload['Note'] ?? payload['Information'];
    if (typeof note === 'string' && note.length > 0) {
      throw new MarketDataRateLimitedError();
    }
    if (typeof payload['Error Message'] === 'string') {
      throw new InvalidMarketSymbolError(params.symbol ?? params.keywords ?? 'unknown');
    }

    return payload;
  }

  private mapAssetType(raw: string | undefined): MarketAssetType {
    const value = (raw ?? '').toLowerCase();
    if (value === 'etf') return 'etf';
    if (value === 'equity') return 'stock';
    return 'other';
  }

  private toNumberOrNull(raw: string | undefined): number | null {
    if (raw === undefined || raw === null || raw === '') return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  }
}
