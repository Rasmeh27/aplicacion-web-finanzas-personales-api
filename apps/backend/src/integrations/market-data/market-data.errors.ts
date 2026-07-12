/**
 * Errores tipados de la integración de mercado. El módulo de inversiones los
 * traduce a códigos HTTP controlados (nunca se exponen errores crudos del
 * proveedor, URLs ni API keys).
 */

export class MarketDataError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'invalid_market_symbol'
      | 'market_data_unavailable'
      | 'market_data_rate_limited',
  ) {
    super(message);
    this.name = new.target.name;
  }
}

/** El símbolo no es válido o el proveedor no lo reconoce. */
export class InvalidMarketSymbolError extends MarketDataError {
  constructor(symbol: string) {
    super(`Unknown or invalid market symbol: ${symbol}`, 'invalid_market_symbol');
  }
}

/** El proveedor aplicó rate limiting (HTTP 429 o aviso equivalente). */
export class MarketDataRateLimitedError extends MarketDataError {
  constructor() {
    super('Market data provider rate limit reached', 'market_data_rate_limited');
  }
}

/** El proveedor no está disponible (red, timeout, 5xx o sin configuración). */
export class MarketDataUnavailableError extends MarketDataError {
  constructor() {
    super('Market data provider is unavailable', 'market_data_unavailable');
  }
}
