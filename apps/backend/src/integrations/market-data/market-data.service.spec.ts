import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  InvalidMarketSymbolError,
  MarketDataRateLimitedError,
  MarketDataUnavailableError,
} from './market-data.errors';
import { MarketDataService } from './market-data.service';
import { MarketDataProvider, MarketQuote } from './market-data.types';

function quote(symbol: string, price: number): MarketQuote {
  return {
    symbol,
    name: `${symbol} Inc`,
    assetType: 'stock',
    currency: 'USD',
    exchange: 'NASDAQ',
    price,
    previousClose: price - 1,
    open: price - 1,
    high: price,
    low: price - 1,
    volume: 1000,
    change: 1,
    changePct: 0.5,
    asOf: '2026-07-11T15:00:00.000Z',
    provider: 'twelve_data',
    marketStatus: 'open',
    isDelayed: null,
  };
}

function configWith(values: Record<string, string> = {}): ConfigService {
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}

describe('MarketDataService (cache + dedupe + fallback stale)', () => {
  let provider: {
    searchSymbols: jest.Mock;
    getQuote: jest.Mock;
    getHistoricalPrices: jest.Mock;
  };

  beforeEach(() => {
    provider = {
      searchSymbols: jest.fn(),
      getQuote: jest.fn(),
      getHistoricalPrices: jest.fn(),
    };
  });

  function service(
    values: Record<string, string> = {},
    meta: { id: 'mock' | 'twelve_data' | 'alphavantage'; isMock: boolean } = {
      id: 'twelve_data',
      isMock: false,
    },
  ): MarketDataService {
    return new MarketDataService(
      provider as unknown as MarketDataProvider,
      meta,
      configWith(values),
    );
  }

  describe('normalizeSymbol', () => {
    it('normaliza a mayúsculas y recorta espacios', () => {
      expect(service().normalizeSymbol('  aapl ')).toBe('AAPL');
      expect(service().normalizeSymbol('brk.b')).toBe('BRK.B');
    });

    it('rechaza símbolos con formato inválido', () => {
      const svc = service();
      expect(() => svc.normalizeSymbol('AAPL; DROP TABLE')).toThrow(
        InvalidMarketSymbolError,
      );
      expect(() => svc.normalizeSymbol('')).toThrow(InvalidMarketSymbolError);
      expect(() => svc.normalizeSymbol('TOOLONGSYMBOL123')).toThrow(
        InvalidMarketSymbolError,
      );
      expect(() => svc.normalizeSymbol('../etc')).toThrow(InvalidMarketSymbolError);
    });
  });

  describe('cache de quotes', () => {
    it('reutiliza la cotización dentro del TTL (una sola llamada al proveedor)', async () => {
      provider.getQuote.mockResolvedValue(quote('AAPL', 100) as never);
      const svc = service();

      const first = await svc.getQuote('AAPL');
      const second = await svc.getQuote('aapl');

      expect(first.status).toBe('fresh');
      expect(second.status).toBe('fresh');
      expect(second.quote?.price).toBe(100);
      expect(provider.getQuote).toHaveBeenCalledTimes(1);
    });

    it('TTL vencido vuelve a llamar al proveedor', async () => {
      provider.getQuote
        .mockResolvedValueOnce(quote('AAPL', 100) as never)
        .mockResolvedValueOnce(quote('AAPL', 105) as never);
      // TTL de 1 ms para forzar expiración inmediata.
      const svc = service({ MARKET_DATA_QUOTE_CACHE_TTL_MS: '1' });

      await svc.getQuote('AAPL');
      await new Promise((resolve) => setTimeout(resolve, 5));
      const second = await svc.getQuote('AAPL');

      expect(second.quote?.price).toBe(105);
      expect(provider.getQuote).toHaveBeenCalledTimes(2);
    });
  });

  describe('dedupe de solicitudes simultáneas', () => {
    it('varias solicitudes concurrentes comparten una sola llamada', async () => {
      let resolveQuote: (value: MarketQuote) => void = () => undefined;
      provider.getQuote.mockReturnValue(
        new Promise<MarketQuote>((resolve) => {
          resolveQuote = resolve;
        }) as never,
      );
      const svc = service();

      const pending = Promise.all([
        svc.getQuote('AAPL'),
        svc.getQuote('AAPL'),
        svc.getQuote('AAPL'),
      ]);
      resolveQuote(quote('AAPL', 100));
      const results = await pending;

      expect(results.every((r) => r.quote?.price === 100)).toBe(true);
      expect(provider.getQuote).toHaveBeenCalledTimes(1);
    });
  });

  describe('proveedor caído', () => {
    it('sin cache previa: lanza MarketDataUnavailableError', async () => {
      provider.getQuote.mockRejectedValue(new MarketDataUnavailableError() as never);
      await expect(service().getQuote('AAPL')).rejects.toThrow(
        MarketDataUnavailableError,
      );
    });

    it('con cache previa: devuelve el último dato marcado como stale', async () => {
      provider.getQuote
        .mockResolvedValueOnce(quote('AAPL', 100) as never)
        .mockRejectedValueOnce(new MarketDataUnavailableError() as never);
      const svc = service({ MARKET_DATA_QUOTE_CACHE_TTL_MS: '1' });

      await svc.getQuote('AAPL');
      await new Promise((resolve) => setTimeout(resolve, 5));
      const stale = await svc.getQuote('AAPL');

      expect(stale.status).toBe('stale');
      expect(stale.quote?.price).toBe(100);
    });

    it('rate limit sin cache: propaga MarketDataRateLimitedError', async () => {
      provider.getQuote.mockRejectedValue(new MarketDataRateLimitedError() as never);
      await expect(service().getQuote('AAPL')).rejects.toThrow(
        MarketDataRateLimitedError,
      );
    });

    it('getQuotes nunca lanza: cada símbolo lleva su propio estado', async () => {
      provider.getQuote.mockImplementation(((symbol: string) => {
        if (symbol === 'AAPL') return Promise.resolve(quote('AAPL', 100));
        return Promise.reject(new MarketDataUnavailableError());
      }) as never);

      const results = await service().getQuotes(['AAPL', 'MSFT']);

      expect(results.get('AAPL')?.status).toBe('fresh');
      expect(results.get('MSFT')?.status).toBe('unavailable');
      expect(results.get('MSFT')?.quote).toBeNull();
    });

    it('proveedor real caído NO produce datos mock (nunca hay fallback silencioso)', async () => {
      provider.getQuote.mockRejectedValue(new MarketDataUnavailableError() as never);
      const svc = service({}, { id: 'twelve_data', isMock: false });

      const results = await svc.getQuotes(['AMZN', 'NVDA']);

      expect(svc.isMock).toBe(false);
      expect(results.get('AMZN')?.quote).toBeNull();
      expect(results.get('NVDA')?.quote).toBeNull();
      expect(results.get('AMZN')?.status).toBe('unavailable');
    });

    it('símbolo inválido dentro de getQuote individual se propaga', async () => {
      provider.getQuote.mockRejectedValue(new InvalidMarketSymbolError('NOPE') as never);
      await expect(service().getQuote('NOPE')).rejects.toThrow(InvalidMarketSymbolError);
    });
  });

  describe('search e histórico', () => {
    it('search cachea resultados y sanea la query', async () => {
      provider.searchSymbols.mockResolvedValue([] as never);
      const svc = service();

      await svc.searchSymbols('apple<script>');
      expect(provider.searchSymbols).toHaveBeenCalledWith('applescript');

      await svc.searchSymbols('apple<script>');
      expect(provider.searchSymbols).toHaveBeenCalledTimes(1);
    });

    it('search con query vacía no llama al proveedor', async () => {
      expect(await service().searchSymbols('!!!')).toEqual([]);
      expect(provider.searchSymbols).not.toHaveBeenCalled();
    });

    it('histórico usa cache por símbolo+rango', async () => {
      provider.getHistoricalPrices.mockResolvedValue([
        { date: '2026-07-10', close: 100 },
      ] as never);
      const svc = service();

      await svc.getHistoricalPrices('AAPL', '1M');
      await svc.getHistoricalPrices('AAPL', '1M');
      await svc.getHistoricalPrices('AAPL', '3M');

      expect(provider.getHistoricalPrices).toHaveBeenCalledTimes(2);
    });
  });

  describe('verifySymbol', () => {
    it('valid cuando el proveedor lo reconoce', async () => {
      provider.getQuote.mockResolvedValue(quote('AAPL', 100) as never);
      expect(await service().verifySymbol('aapl')).toBe('valid');
    });

    it('invalid cuando el proveedor lo rechaza', async () => {
      provider.getQuote.mockRejectedValue(new InvalidMarketSymbolError('XXXX') as never);
      expect(await service().verifySymbol('XXXX')).toBe('invalid');
    });

    it('unverified cuando el proveedor está caído (no bloquea el CRUD)', async () => {
      provider.getQuote.mockRejectedValue(new MarketDataUnavailableError() as never);
      expect(await service().verifySymbol('AAPL')).toBe('unverified');
    });
  });

  describe('metadata del proveedor', () => {
    it('expone providerId e isMock del proveedor inyectado', () => {
      const real = service({}, { id: 'twelve_data', isMock: false });
      expect(real.providerId).toBe('twelve_data');
      expect(real.isMock).toBe(false);

      const demo = service({}, { id: 'mock', isMock: true });
      expect(demo.providerId).toBe('mock');
      expect(demo.isMock).toBe(true);
    });
  });

  describe('concurrencia', () => {
    it('getQuotes respeta MARKET_DATA_MAX_CONCURRENCY (no supera el límite en vuelo)', async () => {
      let inFlight = 0;
      let maxInFlight = 0;
      provider.getQuote.mockImplementation((async (symbol: string) => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 5));
        inFlight -= 1;
        return quote(symbol, 100);
      }) as never);

      const svc = service({ MARKET_DATA_MAX_CONCURRENCY: '2' });
      const symbols = ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'SPY', 'QQQ'];
      const results = await svc.getQuotes(symbols);

      expect(results.size).toBe(6);
      expect(maxInFlight).toBeLessThanOrEqual(2);
    });
  });
});
