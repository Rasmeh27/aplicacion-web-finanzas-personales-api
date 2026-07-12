import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MarketDataService } from './market-data.service';
import {
  MARKET_DATA_META_TOKEN,
  MARKET_DATA_PROVIDER_TOKEN,
  MarketDataProvider,
  MarketDataProviderMeta,
} from './market-data.types';
import { AlphaVantageMarketDataProvider } from './providers/alpha-vantage.provider';
import { MockMarketDataProvider } from './providers/mock-market-data.provider';
import { TwelveDataMarketDataProvider } from './providers/twelve-data.provider';

export interface ResolvedMarketProvider {
  provider: MarketDataProvider;
  meta: MarketDataProviderMeta;
}

const PLACEHOLDER_KEYS = new Set(['', 'change-me', 'your-api-key']);

function requireKey(config: ConfigService, keys: string[], providerLabel: string): string {
  for (const key of keys) {
    const value = (config.get<string>(key) ?? '').trim();
    if (value && !PLACEHOLDER_KEYS.has(value)) return value;
  }
  // Fallo CLARO en el arranque: nunca se cae silenciosamente a mock.
  throw new Error(
    `MARKET_DATA_PROVIDER=${providerLabel} requires ${keys[0]} to be set in apps/backend/.env`,
  );
}

/**
 * Selección EXPLÍCITA del proveedor según MARKET_DATA_PROVIDER. Reglas:
 *  - 'mock': solo datos de demostración (isMock=true).
 *  - 'twelve_data' / 'alphavantage': requieren API key; si falta, se lanza un
 *    error de configuración durante la inicialización (NUNCA fallback a mock).
 *  - Valor no soportado: error de configuración.
 *  - Sin valor: en producción es error; en desarrollo se asume 'mock' (demo).
 *
 * Un fallo del proveedor real en tiempo de ejecución NO cae a mock: se refleja
 * como marketDataStatus unavailable/stale/partial en la capa de servicio.
 */
export function resolveProvider(config: ConfigService): ResolvedMarketProvider {
  const logger = new Logger('MarketDataModule');
  const isProduction = (config.get<string>('NODE_ENV') ?? '').toLowerCase() === 'production';
  let requested = (config.get<string>('MARKET_DATA_PROVIDER') ?? '').trim().toLowerCase();

  if (!requested) {
    if (isProduction) {
      throw new Error('MARKET_DATA_PROVIDER must be set explicitly in production');
    }
    requested = 'mock';
  }

  const timeoutMs = Number(config.get<string>('MARKET_DATA_TIMEOUT_MS')) || undefined;
  const baseUrlOverride = (config.get<string>('MARKET_DATA_BASE_URL') ?? '').trim() || undefined;

  switch (requested) {
    case 'twelve_data':
    case 'twelvedata':
    case 'twelve-data': {
      const apiKey = requireKey(config, ['TWELVE_DATA_API_KEY'], 'twelve_data');
      logger.log('Market data provider: twelve_data (datos reales).');
      return {
        provider: new TwelveDataMarketDataProvider({
          apiKey,
          baseUrl: config.get<string>('TWELVE_DATA_BASE_URL')?.trim() || baseUrlOverride,
          timeoutMs,
        }),
        meta: { id: 'twelve_data', isMock: false },
      };
    }

    case 'alphavantage':
    case 'alpha_vantage': {
      // ALPHA_VANTAGE_API_KEY es el nombre CANÓNICO; MARKET_DATA_API_KEY se
      // acepta solo como alias heredado. El error nombra la variable canónica.
      const apiKey = requireKey(
        config,
        ['ALPHA_VANTAGE_API_KEY', 'MARKET_DATA_API_KEY'],
        'alphavantage',
      );
      logger.log('Market data provider: alphavantage (datos reales).');
      return {
        provider: new AlphaVantageMarketDataProvider({ apiKey, baseUrl: baseUrlOverride, timeoutMs }),
        meta: { id: 'alphavantage', isMock: false },
      };
    }

    case 'mock':
      logger.warn('Market data provider: mock (DATOS DE DEMOSTRACIÓN, no reales).');
      return { provider: new MockMarketDataProvider(), meta: { id: 'mock', isMock: true } };

    default:
      throw new Error(`Unsupported MARKET_DATA_PROVIDER='${requested}'`);
  }
}

const RESOLVED_PROVIDER_TOKEN = 'MARKET_DATA_RESOLVED';

@Module({
  providers: [
    {
      provide: RESOLVED_PROVIDER_TOKEN,
      useFactory: (config: ConfigService) => resolveProvider(config),
      inject: [ConfigService],
    },
    {
      provide: MARKET_DATA_PROVIDER_TOKEN,
      useFactory: (resolved: ResolvedMarketProvider) => resolved.provider,
      inject: [RESOLVED_PROVIDER_TOKEN],
    },
    {
      provide: MARKET_DATA_META_TOKEN,
      useFactory: (resolved: ResolvedMarketProvider) => resolved.meta,
      inject: [RESOLVED_PROVIDER_TOKEN],
    },
    MarketDataService,
  ],
  exports: [MarketDataService],
})
export class MarketDataModule {}
