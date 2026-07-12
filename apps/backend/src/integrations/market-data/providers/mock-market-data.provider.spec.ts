import { describe, expect, it } from '@jest/globals';
import { InvalidMarketSymbolError } from '../market-data.errors';
import { MockMarketDataProvider } from './mock-market-data.provider';

describe('MockMarketDataProvider (determinista, sin red)', () => {
  const provider = new MockMarketDataProvider();

  it('search encuentra por prefijo de símbolo y por nombre', async () => {
    const bySymbol = await provider.searchSymbols('AAP');
    expect(bySymbol.map((s) => s.symbol)).toContain('AAPL');

    const byName = await provider.searchSymbols('vanguard');
    expect(byName.length).toBeGreaterThan(0);
    expect(byName.every((s) => s.currency === 'USD')).toBe(true);
  });

  it('search con query vacía devuelve lista vacía', async () => {
    expect(await provider.searchSymbols('   ')).toEqual([]);
  });

  it('getQuote es determinista para el mismo símbolo y día', async () => {
    const first = await provider.getQuote('AAPL');
    const second = await provider.getQuote('AAPL');

    expect(first.price).toBe(second.price);
    expect(first.previousClose).toBe(second.previousClose);
    expect(first.currency).toBe('USD');
    expect(first.price).toBeGreaterThan(0);
  });

  it('getQuote calcula change y changePct coherentes', async () => {
    const quote = await provider.getQuote('VOO');
    expect(quote.change).toBe(
      Math.round((quote.price - (quote.previousClose ?? 0)) * 100) / 100,
    );
    expect(quote.changePct).not.toBeNull();
  });

  it('getQuote de símbolo desconocido lanza InvalidMarketSymbolError', async () => {
    await expect(provider.getQuote('NOPE123')).rejects.toThrow(InvalidMarketSymbolError);
  });

  it('histórico: cantidad de puntos por rango, orden ascendente y sin fines de semana', async () => {
    const points = await provider.getHistoricalPrices('MSFT', '1M');

    expect(points).toHaveLength(22);
    for (let i = 1; i < points.length; i += 1) {
      expect(points[i].date > points[i - 1].date).toBe(true);
    }
    for (const point of points) {
      const day = new Date(`${point.date}T00:00:00.000Z`).getUTCDay();
      expect(day).not.toBe(0);
      expect(day).not.toBe(6);
      expect(point.close).toBeGreaterThan(0);
    }
  });

  it('histórico es reproducible entre llamadas', async () => {
    const a = await provider.getHistoricalPrices('SPY', '3M');
    const b = await provider.getHistoricalPrices('SPY', '3M');
    expect(a).toEqual(b);
  });
});
