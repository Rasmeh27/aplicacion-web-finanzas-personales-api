import { describe, expect, it } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { resolveProvider } from './market-data.module';
import { TwelveDataMarketDataProvider } from './providers/twelve-data.provider';
import { MockMarketDataProvider } from './providers/mock-market-data.provider';
import { AlphaVantageMarketDataProvider } from './providers/alpha-vantage.provider';

function config(values: Record<string, string | undefined>): ConfigService {
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}

describe('resolveProvider (selección explícita, sin fallback silencioso)', () => {
  it('twelve_data con API key selecciona TwelveDataMarketDataProvider (isMock=false)', () => {
    const resolved = resolveProvider(
      config({ MARKET_DATA_PROVIDER: 'twelve_data', TWELVE_DATA_API_KEY: 'real-key' }),
    );
    expect(resolved.provider).toBeInstanceOf(TwelveDataMarketDataProvider);
    expect(resolved.meta).toEqual({ id: 'twelve_data', isMock: false });
  });

  it('twelve_data SIN API key lanza error de configuración (nunca cae a mock)', () => {
    expect(() =>
      resolveProvider(config({ MARKET_DATA_PROVIDER: 'twelve_data' })),
    ).toThrow(/TWELVE_DATA_API_KEY/);
  });

  it('twelve_data con placeholder change-me también falla', () => {
    expect(() =>
      resolveProvider(config({ MARKET_DATA_PROVIDER: 'twelve_data', TWELVE_DATA_API_KEY: 'change-me' })),
    ).toThrow(/TWELVE_DATA_API_KEY/);
  });

  it('mock explícito selecciona MockMarketDataProvider (isMock=true)', () => {
    const resolved = resolveProvider(config({ MARKET_DATA_PROVIDER: 'mock' }));
    expect(resolved.provider).toBeInstanceOf(MockMarketDataProvider);
    expect(resolved.meta).toEqual({ id: 'mock', isMock: true });
  });

  it('alphavantage sin key lanza (no fallback a mock)', () => {
    expect(() =>
      resolveProvider(config({ MARKET_DATA_PROVIDER: 'alphavantage' })),
    ).toThrow(/ALPHA_VANTAGE_API_KEY/);
  });

  it('alphavantage con ALPHA_VANTAGE_API_KEY (canónica) selecciona AlphaVantageMarketDataProvider', () => {
    const resolved = resolveProvider(
      config({ MARKET_DATA_PROVIDER: 'alphavantage', ALPHA_VANTAGE_API_KEY: 'k' }),
    );
    expect(resolved.provider).toBeInstanceOf(AlphaVantageMarketDataProvider);
    expect(resolved.meta.isMock).toBe(false);
  });

  it('alphavantage acepta MARKET_DATA_API_KEY como alias heredado', () => {
    const resolved = resolveProvider(
      config({ MARKET_DATA_PROVIDER: 'alphavantage', MARKET_DATA_API_KEY: 'legacy-key' }),
    );
    expect(resolved.provider).toBeInstanceOf(AlphaVantageMarketDataProvider);
    expect(resolved.meta.isMock).toBe(false);
  });

  it('valor no soportado lanza error', () => {
    expect(() => resolveProvider(config({ MARKET_DATA_PROVIDER: 'yahoo' }))).toThrow(
      /Unsupported/,
    );
  });

  it('sin provider en producción lanza (mock no permitido implícitamente)', () => {
    expect(() =>
      resolveProvider(config({ NODE_ENV: 'production', MARKET_DATA_PROVIDER: undefined })),
    ).toThrow(/must be set explicitly/);
  });

  it('sin provider en desarrollo usa mock (demo)', () => {
    const resolved = resolveProvider(config({ NODE_ENV: 'development' }));
    expect(resolved.meta).toEqual({ id: 'mock', isMock: true });
  });
});
