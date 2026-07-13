import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  InvalidMarketSymbolError,
  MarketDataUnavailableError,
} from '../../integrations/market-data/market-data.errors';
import { MarketDataService } from '../../integrations/market-data/market-data.service';
import { MarketQuote } from '../../integrations/market-data/market-data.types';
import { InvestmentsController } from './investments.controller';

function realQuote(): MarketQuote {
  return {
    symbol: 'AMZN',
    name: 'Amazon.com Inc',
    assetType: 'stock',
    currency: 'USD',
    exchange: 'NASDAQ',
    price: 245.34,
    previousClose: 243,
    open: 243,
    high: 246.5,
    low: 242.1,
    volume: 38_000_000,
    change: 2.34,
    changePct: 0.963,
    asOf: '2026-07-10T20:00:00.000Z',
    provider: 'twelve_data',
    marketStatus: 'closed',
    isDelayed: null,
  };
}

describe('InvestmentsController (endpoints de mercado)', () => {
  let controller: InvestmentsController;
  let marketData: {
    getQuote: jest.Mock;
    searchSymbols: jest.Mock;
    getHistoricalPrices: jest.Mock;
    normalizeSymbol: jest.Mock;
    providerId: string;
    isMock: boolean;
  };

  beforeEach(() => {
    marketData = {
      getQuote: jest.fn(),
      searchSymbols: jest.fn(),
      getHistoricalPrices: jest.fn(),
      normalizeSymbol: jest.fn((s: string) => s.toUpperCase()),
      providerId: 'twelve_data',
      isMock: false,
    };
    controller = new InvestmentsController(
      {} as never,
      {} as never,
      {} as never,
      marketData as unknown as MarketDataService,
    );
  });

  it('quote devuelve modelo normalizado con currentPrice e isMock=false', async () => {
    marketData.getQuote.mockResolvedValue({
      symbol: 'AMZN',
      status: 'fresh',
      quote: realQuote(),
    } as never);

    const response = (await controller.getQuote('amzn')) as any;

    expect(response.quote.currentPrice).toBe(245.34);
    expect(response.quote.changePercent).toBe(0.963);
    expect(response.quote.provider).toBe('twelve_data');
    expect(response.quote.isMock).toBe(false);
    expect(response.quote.asOf).toBe('2026-07-10T20:00:00.000Z');
    expect(response.marketData).toEqual({
      provider: 'twelve_data',
      isMock: false,
      status: 'fresh',
      marketStatus: 'closed',
      asOf: '2026-07-10T20:00:00.000Z',
    });
  });

  it('quote de símbolo inválido -> 400 controlado', async () => {
    marketData.getQuote.mockRejectedValue(new InvalidMarketSymbolError('ZZZZ') as never);
    await expect(controller.getQuote('ZZZZ')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('quote con proveedor caído -> 503 controlado (sin datos crudos)', async () => {
    marketData.getQuote.mockRejectedValue(new MarketDataUnavailableError() as never);
    await expect(controller.getQuote('AMZN')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('search expone provider e isMock sin la key', async () => {
    marketData.searchSymbols.mockResolvedValue([] as never);
    const response = (await controller.searchSymbols({ query: 'amazon' } as never)) as any;
    expect(response.marketData).toEqual({ provider: 'twelve_data', isMock: false });
  });
});
