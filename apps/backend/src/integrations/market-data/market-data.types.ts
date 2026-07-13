/**
 * Contratos de la integración de datos de mercado (US stock market).
 *
 * El módulo de inversiones NUNCA habla HTTP con el proveedor: siempre pasa por
 * `MarketDataService`, que delega en una implementación de `MarketDataProvider`
 * (mock determinista o proveedor real) y agrega cache + dedupe.
 *
 * El modelo `MarketQuote` es un contrato NORMALIZADO: el dominio no depende del
 * JSON particular de ningún proveedor. Cada provider mapea su respuesta cruda a
 * este modelo (validando números, conservando el timestamp real, etc.).
 */

export type MarketRange = '1M' | '3M' | '6M' | '1Y' | 'ALL';

export const MARKET_RANGES: readonly MarketRange[] = ['1M', '3M', '6M', '1Y', 'ALL'];

export type MarketAssetType = 'stock' | 'etf' | 'other';

/** Identificador del proveedor activo. `mock` => datos de demostración. */
export type MarketProviderId = 'mock' | 'twelve_data' | 'alphavantage';

/** Estado del mercado según el proveedor. */
export type MarketStatus = 'open' | 'closed' | 'unknown';

/** Metadatos del proveedor resuelto en el arranque (inyectados). */
export interface MarketDataProviderMeta {
  id: MarketProviderId;
  /** true solo para el proveedor mock; el frontend lo usa para el badge demo. */
  isMock: boolean;
}

export interface MarketSymbol {
  symbol: string;
  name: string;
  assetType: MarketAssetType;
  region: string;
  currency: string;
  exchange?: string | null;
  micCode?: string | null;
}

export interface MarketQuote {
  symbol: string;
  name: string | null;
  assetType: MarketAssetType;
  currency: string;
  exchange: string | null;
  /** Último precio conocido (currentPrice) en la moneda indicada. */
  price: number;
  previousClose: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  /** Cambio absoluto del día (price - previousClose). */
  change: number | null;
  /** Cambio porcentual del día. */
  changePct: number | null;
  /** Fecha/hora ISO REAL del dato de precio (del proveedor, nunca `new Date()`). */
  asOf: string;
  /** Proveedor que originó el dato. */
  provider: MarketProviderId;
  /** Estado del mercado para el activo. */
  marketStatus: MarketStatus;
  /** true si el dato es demorado; null si el proveedor no lo informa. */
  isDelayed: boolean | null;
}

export interface HistoricalPricePoint {
  /** Fecha de cierre YYYY-MM-DD. */
  date: string;
  close: number;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  volume?: number | null;
}

export interface MarketDataProvider {
  searchSymbols(query: string): Promise<MarketSymbol[]>;
  getQuote(symbol: string): Promise<MarketQuote>;
  getHistoricalPrices(symbol: string, range: MarketRange): Promise<HistoricalPricePoint[]>;
  /** Opcional: estado del mercado sin cotizar un símbolo concreto. */
  getMarketStatus?(): Promise<MarketStatus>;
}

/** Token de inyección para la implementación concreta del proveedor. */
export const MARKET_DATA_PROVIDER_TOKEN = 'MARKET_DATA_PROVIDER_IMPL';

/** Token de inyección para los metadatos del proveedor resuelto. */
export const MARKET_DATA_META_TOKEN = 'MARKET_DATA_PROVIDER_META';

/** Estado del dato devuelto por el facade con cache. */
export type QuoteFreshness = 'fresh' | 'stale' | 'unavailable';

export interface QuoteResult {
  symbol: string;
  quote: MarketQuote | null;
  status: QuoteFreshness;
}
