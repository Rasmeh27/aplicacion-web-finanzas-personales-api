import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  InvalidMarketSymbolError,
  MarketDataError,
  MarketDataUnavailableError,
} from './market-data.errors';
import {
  HistoricalPricePoint,
  MARKET_DATA_META_TOKEN,
  MARKET_DATA_PROVIDER_TOKEN,
  MarketDataProvider,
  MarketDataProviderMeta,
  MarketProviderId,
  MarketQuote,
  MarketRange,
  MarketSymbol,
  QuoteResult,
} from './market-data.types';

interface CacheEntry<T> {
  value: T;
  storedAt: number;
}

export const SYMBOL_PATTERN = /^[A-Z0-9.-]{1,12}$/;

/**
 * Facade único de datos de mercado para el resto del backend.
 *
 * - Normaliza y valida símbolos antes de llegar al proveedor.
 * - Cache TTL en memoria (quotes ~60s, búsqueda ~5min, históricos ~15min).
 * - Dedupe: solicitudes simultáneas del mismo recurso comparten una llamada.
 * - Fallback "stale": si el proveedor falla y hay un dato previo razonablemente
 *   reciente, se devuelve marcado como stale en lugar de romper la vista.
 */
@Injectable()
export class MarketDataService {
  private readonly logger = new Logger(MarketDataService.name);

  private readonly cache = new Map<string, CacheEntry<unknown>>();
  private readonly inFlight = new Map<string, Promise<unknown>>();

  private readonly quoteTtlMs: number;
  private readonly searchTtlMs: number;
  private readonly historyTtlMs: number;
  private readonly staleMaxAgeMs: number;
  private readonly maxConcurrency: number;

  constructor(
    @Inject(MARKET_DATA_PROVIDER_TOKEN)
    private readonly provider: MarketDataProvider,
    @Inject(MARKET_DATA_META_TOKEN)
    private readonly meta: MarketDataProviderMeta,
    config: ConfigService,
  ) {
    this.quoteTtlMs = this.readMs(config, 'MARKET_DATA_QUOTE_CACHE_TTL_MS', 60_000);
    this.searchTtlMs = this.readMs(config, 'MARKET_DATA_SEARCH_CACHE_TTL_MS', 300_000);
    this.historyTtlMs = this.readMs(config, 'MARKET_DATA_HISTORY_CACHE_TTL_MS', 900_000);
    this.staleMaxAgeMs = this.readMs(config, 'MARKET_DATA_STALE_MAX_AGE_MS', 86_400_000);
    this.maxConcurrency = this.readMs(config, 'MARKET_DATA_MAX_CONCURRENCY', 4);
  }

  /** Identificador del proveedor activo ('mock' | 'twelve_data' | 'alphavantage'). */
  get providerId(): MarketProviderId {
    return this.meta.id;
  }

  /** true solo con el proveedor mock (datos de demostración). */
  get isMock(): boolean {
    return this.meta.isMock;
  }

  /** Normaliza a mayúsculas y valida el formato. Lanza invalid_market_symbol. */
  normalizeSymbol(raw: string): string {
    const symbol = (raw ?? '').trim().toUpperCase();
    if (!SYMBOL_PATTERN.test(symbol)) {
      throw new InvalidMarketSymbolError(symbol || '(empty)');
    }
    return symbol;
  }

  async searchSymbols(rawQuery: string): Promise<MarketSymbol[]> {
    const query = this.sanitizeQuery(rawQuery);
    if (!query) return [];

    const key = `search:${query.toLowerCase()}`;
    const cached = this.fromCache<MarketSymbol[]>(key, this.searchTtlMs);
    if (cached) return cached.value;

    try {
      return await this.dedupe(key, async () => {
        const results = await this.provider.searchSymbols(query);
        this.toCache(key, results);
        return results;
      });
    } catch (error) {
      const stale = this.fromCache<MarketSymbol[]>(key, this.staleMaxAgeMs);
      if (stale) return stale.value;
      throw this.asMarketDataError(error);
    }
  }

  /**
   * Cotización con estado. Lanza invalid_market_symbol para símbolos que el
   * proveedor no reconoce; para fallos de disponibilidad intenta fallback stale.
   */
  async getQuote(rawSymbol: string): Promise<QuoteResult> {
    const symbol = this.normalizeSymbol(rawSymbol);
    const key = `quote:${symbol}`;

    const cached = this.fromCache<MarketQuote>(key, this.quoteTtlMs);
    if (cached) return { symbol, quote: cached.value, status: 'fresh' };

    try {
      const quote = await this.dedupe(key, async () => {
        const value = await this.provider.getQuote(symbol);
        this.toCache(key, value);
        return value;
      });
      return { symbol, quote, status: 'fresh' };
    } catch (error) {
      if (error instanceof InvalidMarketSymbolError) throw error;

      const stale = this.fromCache<MarketQuote>(key, this.staleMaxAgeMs);
      if (stale) {
        return { symbol, quote: stale.value, status: 'stale' };
      }
      throw this.asMarketDataError(error);
    }
  }

  /**
   * Versión tolerante para enriquecer portafolios: nunca lanza; cada símbolo
   * llega con su propio estado (fresh | stale | unavailable). Limita la
   * concurrencia de llamadas al proveedor (MARKET_DATA_MAX_CONCURRENCY) y el
   * cache/dedupe garantiza una sola llamada externa por símbolo aunque distintos
   * endpoints la pidan dentro de la misma solicitud.
   */
  async getQuotes(rawSymbols: string[]): Promise<Map<string, QuoteResult>> {
    const unique = [...new Set(rawSymbols.map((s) => s.trim().toUpperCase()))];

    const results = await this.mapWithConcurrency(
      unique,
      this.maxConcurrency,
      async (symbol): Promise<QuoteResult> => {
        try {
          return await this.getQuote(symbol);
        } catch {
          return { symbol, quote: null, status: 'unavailable' };
        }
      },
    );

    return new Map(results.map((result) => [result.symbol, result]));
  }

  /** Ejecuta `worker` sobre `items` con como máximo `limit` en vuelo a la vez. */
  private async mapWithConcurrency<T, R>(
    items: T[],
    limit: number,
    worker: (item: T) => Promise<R>,
  ): Promise<R[]> {
    const results = new Array<R>(items.length);
    let cursor = 0;
    const size = Math.max(1, Math.min(limit, items.length || 1));

    const runners = Array.from({ length: size }, async () => {
      while (cursor < items.length) {
        const index = cursor;
        cursor += 1;
        results[index] = await worker(items[index]);
      }
    });

    await Promise.all(runners);
    return results;
  }

  async getHistoricalPrices(
    rawSymbol: string,
    range: MarketRange,
  ): Promise<HistoricalPricePoint[]> {
    const symbol = this.normalizeSymbol(rawSymbol);
    const key = `history:${symbol}:${range}`;

    const cached = this.fromCache<HistoricalPricePoint[]>(key, this.historyTtlMs);
    if (cached) return cached.value;

    try {
      return await this.dedupe(key, async () => {
        const points = await this.provider.getHistoricalPrices(symbol, range);
        this.toCache(key, points);
        return points;
      });
    } catch (error) {
      if (error instanceof InvalidMarketSymbolError) throw error;

      const stale = this.fromCache<HistoricalPricePoint[]>(key, this.staleMaxAgeMs);
      if (stale) return stale.value;
      throw this.asMarketDataError(error);
    }
  }

  /**
   * Comprueba si un símbolo es resoluble por el proveedor.
   * - 'valid'     el proveedor lo reconoce.
   * - 'invalid'   el proveedor lo rechaza explícitamente.
   * - 'unverified' el proveedor no está disponible (no bloquear el CRUD).
   */
  async verifySymbol(rawSymbol: string): Promise<'valid' | 'invalid' | 'unverified'> {
    const symbol = this.normalizeSymbol(rawSymbol);
    try {
      await this.getQuote(symbol);
      return 'valid';
    } catch (error) {
      if (error instanceof InvalidMarketSymbolError) return 'invalid';
      this.logger.warn(`verifySymbol degraded symbol=${symbol}`);
      return 'unverified';
    }
  }

  private sanitizeQuery(raw: string): string {
    return (raw ?? '')
      .replace(/[^A-Za-z0-9 .&-]/g, '')
      .trim()
      .slice(0, 40);
  }

  private fromCache<T>(key: string, maxAgeMs: number): CacheEntry<T> | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (Date.now() - entry.storedAt > maxAgeMs) return null;
    return entry;
  }

  private toCache<T>(key: string, value: T): void {
    this.cache.set(key, { value, storedAt: Date.now() });
    // Poda simple para evitar crecimiento sin límite.
    if (this.cache.size > 2_000) {
      const oldest = [...this.cache.entries()].sort(
        (a, b) => a[1].storedAt - b[1].storedAt,
      );
      for (const [staleKey] of oldest.slice(0, 500)) {
        this.cache.delete(staleKey);
      }
    }
  }

  private dedupe<T>(key: string, factory: () => Promise<T>): Promise<T> {
    const pending = this.inFlight.get(key) as Promise<T> | undefined;
    if (pending) return pending;

    const promise = factory().finally(() => this.inFlight.delete(key));
    this.inFlight.set(key, promise);
    return promise;
  }

  private asMarketDataError(error: unknown): MarketDataError {
    if (error instanceof MarketDataError) return error;
    this.logger.warn(`market data provider error reason=${(error as Error)?.name}`);
    return new MarketDataUnavailableError();
  }

  private readMs(config: ConfigService, key: string, fallback: number): number {
    const value = Number(config.get<string>(key));
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }
}
