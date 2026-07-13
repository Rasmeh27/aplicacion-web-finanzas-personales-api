import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  InvalidMarketSymbolError,
  MarketDataRateLimitedError,
  MarketDataUnavailableError,
} from '../market-data.errors';
import { TwelveDataMarketDataProvider } from './twelve-data.provider';

const API_KEY = 'test-secret-key-do-not-log';
const BASE_URL = 'https://td.test';

/** Respuesta HTTP simulada al estilo fetch. */
function httpResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

function quoteBody(overrides: Record<string, unknown> = {}) {
  return {
    symbol: 'AMZN',
    name: 'Amazon.com Inc',
    exchange: 'NASDAQ',
    mic_code: 'XNGS',
    currency: 'USD',
    datetime: '2026-07-10',
    timestamp: 1_783_800_000,
    open: '243.00',
    high: '246.50',
    low: '242.10',
    close: '245.34',
    volume: '38000000',
    previous_close: '243.00',
    change: '2.34',
    percent_change: '0.9630',
    is_market_open: false,
    type: 'Common Stock',
    ...overrides,
  };
}

type FetchLike = (input: unknown, init?: unknown) => Promise<Response>;

describe('TwelveDataMarketDataProvider', () => {
  let fetchMock: jest.MockedFunction<FetchLike>;
  let provider: TwelveDataMarketDataProvider;

  beforeEach(() => {
    fetchMock = jest.fn<FetchLike>();
    (global as unknown as { fetch: unknown }).fetch = fetchMock;
    provider = new TwelveDataMarketDataProvider({ apiKey: API_KEY, baseUrl: BASE_URL });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('exige API key en el constructor', () => {
    expect(() => new TwelveDataMarketDataProvider({ apiKey: '' })).toThrow();
  });

  describe('getQuote', () => {
    it('mapea /quote a MarketQuote normalizado (strings numéricos -> number)', async () => {
      fetchMock.mockResolvedValueOnce(httpResponse(quoteBody()));

      const quote = await provider.getQuote('AMZN');

      expect(quote.symbol).toBe('AMZN');
      expect(quote.price).toBe(245.34);
      expect(quote.previousClose).toBe(243);
      expect(quote.open).toBe(243);
      expect(quote.high).toBe(246.5);
      expect(quote.low).toBe(242.1);
      expect(quote.volume).toBe(38_000_000);
      expect(quote.change).toBe(2.34);
      expect(quote.changePct).toBe(0.963);
      expect(quote.currency).toBe('USD');
      expect(quote.exchange).toBe('NASDAQ');
      expect(quote.provider).toBe('twelve_data');
      expect(quote.marketStatus).toBe('closed');
      expect(quote.assetType).toBe('stock');
    });

    it('conserva el timestamp REAL del proveedor (no new Date())', async () => {
      fetchMock.mockResolvedValueOnce(httpResponse(quoteBody()));
      const quote = await provider.getQuote('AMZN');
      expect(quote.asOf).toBe(new Date(1_783_800_000 * 1000).toISOString());
    });

    it('NVDA con su propio precio (no un valor mock hardcodeado)', async () => {
      fetchMock.mockResolvedValueOnce(
        httpResponse(quoteBody({ symbol: 'NVDA', name: 'NVIDIA Corp', close: '210.96', previous_close: '208.00' })),
      );
      const quote = await provider.getQuote('NVDA');
      expect(quote.symbol).toBe('NVDA');
      expect(quote.price).toBe(210.96);
      expect(quote.price).not.toBe(133.72);
    });

    it('rechaza precio inválido (<= 0) como no disponible', async () => {
      fetchMock.mockResolvedValueOnce(httpResponse(quoteBody({ close: '0' })));
      await expect(provider.getQuote('AMZN')).rejects.toThrow(MarketDataUnavailableError);
    });

    it('rechaza precio NaN como no disponible', async () => {
      fetchMock.mockResolvedValueOnce(httpResponse(quoteBody({ close: 'not-a-number' })));
      await expect(provider.getQuote('AMZN')).rejects.toThrow(MarketDataUnavailableError);
    });

    it('error de símbolo (body code 404) -> InvalidMarketSymbolError', async () => {
      fetchMock.mockResolvedValueOnce(
        httpResponse({ code: 404, message: 'symbol not found', status: 'error' }),
      );
      await expect(provider.getQuote('ZZZZ')).rejects.toThrow(InvalidMarketSymbolError);
    });

    it('rate limit (body code 429) -> MarketDataRateLimitedError, sin retry', async () => {
      fetchMock.mockResolvedValueOnce(
        httpResponse({ code: 429, message: 'API credits', status: 'error' }),
      );
      await expect(provider.getQuote('AMZN')).rejects.toThrow(MarketDataRateLimitedError);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('HTTP 429 -> MarketDataRateLimitedError', async () => {
      fetchMock.mockResolvedValueOnce(httpResponse({}, 429));
      await expect(provider.getQuote('AMZN')).rejects.toThrow(MarketDataRateLimitedError);
    });

    it('HTTP 500 reintenta una vez y luego lanza unavailable', async () => {
      fetchMock
        .mockResolvedValueOnce(httpResponse({}, 500))
        .mockResolvedValueOnce(httpResponse({}, 500));
      await expect(provider.getQuote('AMZN')).rejects.toThrow(MarketDataUnavailableError);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('timeout / error de red reintenta una vez y luego unavailable', async () => {
      fetchMock
        .mockRejectedValueOnce(new Error('AbortError'))
        .mockRejectedValueOnce(new Error('AbortError'));
      await expect(provider.getQuote('AMZN')).rejects.toThrow(MarketDataUnavailableError);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('NUNCA incluye la API key en el mensaje de error', async () => {
      fetchMock.mockResolvedValue(httpResponse({}, 500));
      try {
        await provider.getQuote('AMZN');
        throw new Error('should have thrown');
      } catch (error) {
        expect((error as Error).message).not.toContain(API_KEY);
      }
      // La key sí viaja como query param de la request al proveedor.
      const calledUrl = String(fetchMock.mock.calls[0][0]);
      expect(calledUrl).toContain('apikey=');
    });
  });

  describe('searchSymbols', () => {
    it('mapea symbol_search y filtra a EE. UU./USD stock|etf', async () => {
      fetchMock.mockResolvedValueOnce(
        httpResponse({
          data: [
            {
              symbol: 'AMZN',
              instrument_name: 'Amazon.com Inc',
              exchange: 'NASDAQ',
              mic_code: 'XNGS',
              instrument_type: 'Common Stock',
              country: 'United States',
              currency: 'USD',
            },
            {
              symbol: 'AMZN',
              instrument_name: 'Amazon (foreign listing)',
              exchange: 'FSX',
              mic_code: 'XFRA',
              instrument_type: 'Common Stock',
              country: 'Germany',
              currency: 'EUR',
            },
          ],
          status: 'ok',
        }),
      );

      const results = await provider.searchSymbols('amazon');
      expect(results).toHaveLength(1);
      expect(results[0].symbol).toBe('AMZN');
      expect(results[0].currency).toBe('USD');
      expect(results[0].region).toBe('United States');
      expect(results[0].assetType).toBe('stock');
    });
  });

  describe('getHistoricalPrices', () => {
    it('mapea time_series y ordena ascendente por fecha', async () => {
      fetchMock.mockResolvedValueOnce(
        httpResponse({
          meta: { symbol: 'AMZN', interval: '1day' },
          values: [
            { datetime: '2026-07-10', open: '243.0', high: '246.5', low: '242.1', close: '245.34', volume: '38000000' },
            { datetime: '2026-07-09', open: '240.0', high: '244.0', low: '239.0', close: '243.00', volume: '35000000' },
          ],
          status: 'ok',
        }),
      );

      const points = await provider.getHistoricalPrices('AMZN', '1M');
      expect(points).toHaveLength(2);
      expect(points[0].date).toBe('2026-07-09');
      expect(points[1].date).toBe('2026-07-10');
      expect(points[1].close).toBe(245.34);
    });

    it('body de error en time_series -> InvalidMarketSymbolError', async () => {
      fetchMock.mockResolvedValueOnce(
        httpResponse({ code: 400, message: 'bad symbol', status: 'error' }),
      );
      await expect(provider.getHistoricalPrices('ZZZZ', '1M')).rejects.toThrow(
        InvalidMarketSymbolError,
      );
    });
  });
});
