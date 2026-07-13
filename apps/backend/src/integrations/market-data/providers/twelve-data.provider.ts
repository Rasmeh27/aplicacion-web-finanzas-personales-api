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
  MarketStatus,
  MarketSymbol,
} from '../market-data.types';

export interface TwelveDataOptions {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
}

const DEFAULT_BASE_URL = 'https://api.twelvedata.com';
const DEFAULT_TIMEOUT_MS = 8_000;

/** Puntos diarios (outputsize) por rango solicitado. */
const RANGE_OUTPUTSIZE: Record<Exclude<MarketRange, 'ALL'>, number> = {
  '1M': 23,
  '3M': 66,
  '6M': 130,
  '1Y': 260,
};

const RANGE_CALENDAR_DAYS: Record<MarketRange, number | null> = {
  '1M': 31,
  '3M': 93,
  '6M': 186,
  '1Y': 372,
  ALL: null,
};

interface TwelveDataError {
  code?: number;
  message?: string;
  status?: string;
}

/**
 * Proveedor real basado en la API oficial de Twelve Data
 * (https://twelvedata.com/docs). Sin scraping ni endpoints no oficiales.
 *
 * Seguridad: la API key nunca se registra en logs ni aparece en los mensajes de
 * error (que solo llevan el endpoint y el status HTTP). El dominio nunca ve el
 * JSON crudo: todo se normaliza a `MarketQuote` / `HistoricalPricePoint`.
 */
export class TwelveDataMarketDataProvider implements MarketDataProvider {
  private readonly logger = new Logger(TwelveDataMarketDataProvider.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(options: TwelveDataOptions) {
    if (!options.apiKey) {
      throw new Error('TwelveDataMarketDataProvider requires an API key');
    }
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async searchSymbols(query: string): Promise<MarketSymbol[]> {
    const payload = await this.request('/symbol_search', {
      symbol: query,
      outputsize: '30',
    });
    const rows = Array.isArray(payload['data'])
      ? (payload['data'] as Record<string, unknown>[])
      : [];

    return rows
      .map((row) => this.mapSearchRow(row))
      .filter((item): item is MarketSymbol => item !== null)
      // Priorizar cotizaciones de EE. UU. en USD (evita elegir un ticker
      // extranjero homónimo cuando existe la cotización estadounidense).
      .filter((item) => item.currency === 'USD' && item.region === 'United States')
      .filter((item) => item.assetType === 'stock' || item.assetType === 'etf')
      .slice(0, 10);
  }

  async getQuote(symbol: string): Promise<MarketQuote> {
    const payload = await this.request('/quote', { symbol });

    const price = this.toPositiveNumber(payload['close']);
    if (price === null) {
      // Símbolo resuelto pero sin precio válido => dato no disponible.
      throw new MarketDataUnavailableError();
    }

    const isMarketOpen = payload['is_market_open'];
    const marketStatus: MarketStatus =
      typeof isMarketOpen === 'boolean' ? (isMarketOpen ? 'open' : 'closed') : 'unknown';

    return {
      symbol: String(payload['symbol'] ?? symbol).toUpperCase(),
      name: typeof payload['name'] === 'string' ? (payload['name'] as string) : null,
      assetType: this.mapInstrumentType(payload['type'] as string | undefined),
      currency: typeof payload['currency'] === 'string' ? (payload['currency'] as string) : 'USD',
      exchange: typeof payload['exchange'] === 'string' ? (payload['exchange'] as string) : null,
      price,
      previousClose: this.toNumberOrNull(payload['previous_close']),
      open: this.toNumberOrNull(payload['open']),
      high: this.toNumberOrNull(payload['high']),
      low: this.toNumberOrNull(payload['low']),
      volume: this.toNumberOrNull(payload['volume']),
      change: this.toNumberOrNull(payload['change']),
      changePct: this.toNumberOrNull(payload['percent_change']),
      asOf: this.resolveTimestamp(payload),
      provider: 'twelve_data',
      marketStatus,
      // El plan gratuito sirve datos EOD/demorados; el flag preciso depende del
      // plan contratado y Twelve Data no lo expone de forma fiable aquí.
      isDelayed: null,
    };
  }

  async getHistoricalPrices(
    symbol: string,
    range: MarketRange,
  ): Promise<HistoricalPricePoint[]> {
    const outputsize = range === 'ALL' ? 5000 : RANGE_OUTPUTSIZE[range];
    const payload = await this.request('/time_series', {
      symbol,
      interval: '1day',
      outputsize: String(outputsize),
      order: 'ASC',
    });

    const values = Array.isArray(payload['values'])
      ? (payload['values'] as Record<string, unknown>[])
      : null;
    if (!values) {
      throw new MarketDataUnavailableError();
    }

    const days = RANGE_CALENDAR_DAYS[range];
    const cutoff = days === null ? null : Date.now() - days * 86_400_000;

    return values
      .map((row): HistoricalPricePoint | null => {
        const close = this.toPositiveNumber(row['close']);
        const date = typeof row['datetime'] === 'string' ? (row['datetime'] as string) : null;
        if (close === null || !date) return null;
        return {
          date: date.slice(0, 10),
          close,
          open: this.toNumberOrNull(row['open']),
          high: this.toNumberOrNull(row['high']),
          low: this.toNumberOrNull(row['low']),
          volume: this.toNumberOrNull(row['volume']),
        };
      })
      .filter((point): point is HistoricalPricePoint => point !== null)
      .filter(
        (point) =>
          cutoff === null || new Date(`${point.date}T00:00:00.000Z`).getTime() >= cutoff,
      )
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Llama a un endpoint con timeout explícito y un único retry ante fallos de
   * red o 5xx. Traduce errores de Twelve Data (HTTP o body) a errores tipados.
   */
  private async request(
    path: string,
    params: Record<string, string>,
    attempt = 0,
  ): Promise<Record<string, unknown>> {
    const url = new URL(`${this.baseUrl}${path}`);
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
      // Timeout / error de red: un solo retry.
      if (attempt === 0) return this.request(path, params, 1);
      this.logger.warn(
        `twelve-data network error path=${path} reason=${(error as Error)?.name}`,
      );
      throw new MarketDataUnavailableError();
    } finally {
      clearTimeout(timer);
    }

    if (response.status === 429) {
      throw new MarketDataRateLimitedError();
    }
    if (!response.ok) {
      if (response.status >= 500 && attempt === 0) return this.request(path, params, 1);
      // 4xx permanentes no se reintentan.
      if (response.status === 404) {
        throw new InvalidMarketSymbolError(params.symbol ?? 'unknown');
      }
      this.logger.warn(`twelve-data http error path=${path} status=${response.status}`);
      throw new MarketDataUnavailableError();
    }

    let payload: Record<string, unknown>;
    try {
      payload = (await response.json()) as Record<string, unknown>;
    } catch {
      throw new MarketDataUnavailableError();
    }

    // Twelve Data suele devolver errores con HTTP 200 y body { code, status:'error' }.
    if (payload['status'] === 'error' || typeof payload['code'] === 'number') {
      this.throwForBodyError(payload as TwelveDataError, params.symbol);
    }

    return payload;
  }

  private throwForBodyError(error: TwelveDataError, symbol?: string): never {
    const code = error.code;
    if (code === 429) {
      throw new MarketDataRateLimitedError();
    }
    if (code === 400 || code === 404) {
      throw new InvalidMarketSymbolError(symbol ?? 'unknown');
    }
    // Nunca propagamos el mensaje crudo del proveedor (puede incluir detalles).
    this.logger.warn(`twelve-data body error code=${code ?? 'unknown'}`);
    throw new MarketDataUnavailableError();
  }

  private mapSearchRow(row: Record<string, unknown>): MarketSymbol | null {
    const symbol = typeof row['symbol'] === 'string' ? row['symbol'].toUpperCase() : '';
    if (!symbol) return null;
    return {
      symbol,
      name: typeof row['instrument_name'] === 'string' ? (row['instrument_name'] as string) : symbol,
      assetType: this.mapInstrumentType(row['instrument_type'] as string | undefined),
      region: typeof row['country'] === 'string' ? (row['country'] as string) : '',
      currency: typeof row['currency'] === 'string' ? (row['currency'] as string) : '',
      exchange: typeof row['exchange'] === 'string' ? (row['exchange'] as string) : null,
      micCode: typeof row['mic_code'] === 'string' ? (row['mic_code'] as string) : null,
    };
  }

  private mapInstrumentType(raw: string | undefined): MarketAssetType {
    const value = (raw ?? '').toLowerCase();
    if (value.includes('etf')) return 'etf';
    if (value.includes('stock') || value.includes('common') || value.includes('equity')) {
      return 'stock';
    }
    return 'other';
  }

  /**
   * Conserva el timestamp REAL del proveedor. Prefiere `timestamp` (epoch s);
   * si no, usa `datetime`; nunca cae a `new Date()` como hora del precio.
   */
  private resolveTimestamp(payload: Record<string, unknown>): string {
    const epoch = Number(payload['timestamp']);
    if (Number.isFinite(epoch) && epoch > 0) {
      return new Date(epoch * 1000).toISOString();
    }
    const datetime = payload['datetime'];
    if (typeof datetime === 'string' && datetime.length > 0) {
      const iso = datetime.length <= 10 ? `${datetime}T21:00:00.000Z` : datetime.replace(' ', 'T');
      const parsed = new Date(iso);
      if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
    }
    // Sin timestamp del proveedor: devolvemos cadena vacía en vez de inventar hora.
    return '';
  }

  /** Convierte strings numéricos de forma segura. Rechaza NaN/Infinity. */
  private toNumberOrNull(raw: unknown): number | null {
    if (raw === null || raw === undefined || raw === '') return null;
    const value = typeof raw === 'number' ? raw : Number(raw);
    return Number.isFinite(value) ? value : null;
  }

  /** Igual que toNumberOrNull pero además exige > 0 (precios válidos). */
  private toPositiveNumber(raw: unknown): number | null {
    const value = this.toNumberOrNull(raw);
    return value !== null && value > 0 ? value : null;
  }
}
