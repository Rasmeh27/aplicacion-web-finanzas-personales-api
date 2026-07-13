import { Injectable } from '@nestjs/common';
import { InvalidMarketSymbolError } from '../market-data.errors';
import {
  HistoricalPricePoint,
  MarketAssetType,
  MarketDataProvider,
  MarketQuote,
  MarketRange,
  MarketSymbol,
} from '../market-data.types';

interface MockCatalogEntry {
  symbol: string;
  name: string;
  assetType: MarketAssetType;
  basePrice: number;
}

/**
 * Catálogo determinista de símbolos para desarrollo/pruebas. Los precios son
 * SIEMPRE de demostración: el frontend los etiqueta como demo (source=mock).
 */
const MOCK_CATALOG: MockCatalogEntry[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', assetType: 'stock', basePrice: 228 },
  { symbol: 'MSFT', name: 'Microsoft Corporation', assetType: 'stock', basePrice: 452 },
  { symbol: 'GOOGL', name: 'Alphabet Inc. Class A', assetType: 'stock', basePrice: 186 },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', assetType: 'stock', basePrice: 205 },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', assetType: 'stock', basePrice: 132 },
  { symbol: 'META', name: 'Meta Platforms Inc.', assetType: 'stock', basePrice: 588 },
  { symbol: 'TSLA', name: 'Tesla Inc.', assetType: 'stock', basePrice: 262 },
  { symbol: 'BRK.B', name: 'Berkshire Hathaway Inc. Class B', assetType: 'stock', basePrice: 462 },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.', assetType: 'stock', basePrice: 246 },
  { symbol: 'V', name: 'Visa Inc.', assetType: 'stock', basePrice: 312 },
  { symbol: 'JNJ', name: 'Johnson & Johnson', assetType: 'stock', basePrice: 152 },
  { symbol: 'WMT', name: 'Walmart Inc.', assetType: 'stock', basePrice: 94 },
  { symbol: 'PG', name: 'Procter & Gamble Co.', assetType: 'stock', basePrice: 168 },
  { symbol: 'KO', name: 'The Coca-Cola Company', assetType: 'stock', basePrice: 63 },
  { symbol: 'DIS', name: 'The Walt Disney Company', assetType: 'stock', basePrice: 112 },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', assetType: 'etf', basePrice: 605 },
  { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', assetType: 'etf', basePrice: 556 },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust', assetType: 'etf', basePrice: 520 },
  { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', assetType: 'etf', basePrice: 298 },
  { symbol: 'SCHD', name: 'Schwab U.S. Dividend Equity ETF', assetType: 'etf', basePrice: 28 },
  { symbol: 'VXUS', name: 'Vanguard Total International Stock ETF', assetType: 'etf', basePrice: 64 },
  { symbol: 'BND', name: 'Vanguard Total Bond Market ETF', assetType: 'etf', basePrice: 73 },
];

const MS_PER_DAY = 86_400_000;

const RANGE_TRADING_DAYS: Record<MarketRange, number> = {
  '1M': 22,
  '3M': 66,
  '6M': 131,
  '1Y': 261,
  ALL: 522,
};

function hashSymbol(symbol: string): number {
  let hash = 0;
  for (let i = 0; i < symbol.length; i += 1) {
    hash = (hash * 31 + symbol.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function isWeekend(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

/** Último día hábil (UTC) anterior o igual a la fecha dada. */
function lastTradingDay(from: Date): Date {
  const date = new Date(from.getTime());
  while (isWeekend(date)) {
    date.setTime(date.getTime() - MS_PER_DAY);
  }
  return date;
}

function previousTradingDay(from: Date): Date {
  return lastTradingDay(new Date(from.getTime() - MS_PER_DAY));
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Proveedor MOCK determinista: mismo símbolo + misma fecha => mismo precio.
 * Sin red, sin aleatoriedad. Pensado para desarrollo y pruebas unitarias.
 */
@Injectable()
export class MockMarketDataProvider implements MarketDataProvider {
  async searchSymbols(query: string): Promise<MarketSymbol[]> {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];

    return MOCK_CATALOG.filter(
      (entry) =>
        entry.symbol.toLowerCase().startsWith(normalized) ||
        entry.name.toLowerCase().includes(normalized),
    )
      .slice(0, 10)
      .map((entry) => this.toMarketSymbol(entry));
  }

  async getQuote(symbol: string): Promise<MarketQuote> {
    const entry = this.findEntryOrFail(symbol);
    const today = lastTradingDay(new Date());
    const price = this.priceFor(entry, today);
    const previousClose = this.priceFor(entry, previousTradingDay(today));
    const change = round2(price - previousClose);

    return {
      symbol: entry.symbol,
      name: entry.name,
      assetType: entry.assetType,
      currency: 'USD',
      exchange: 'DEMO',
      price,
      previousClose,
      open: previousClose,
      high: round2(Math.max(price, previousClose)),
      low: round2(Math.min(price, previousClose)),
      volume: null,
      change,
      changePct: previousClose > 0 ? round2((change / previousClose) * 100) : null,
      // Mock: el timestamp es el último día hábil simulado, no un tick en vivo.
      asOf: toDateString(today) + 'T21:00:00.000Z',
      provider: 'mock',
      marketStatus: 'unknown',
      isDelayed: null,
    };
  }

  async getHistoricalPrices(
    symbol: string,
    range: MarketRange,
  ): Promise<HistoricalPricePoint[]> {
    const entry = this.findEntryOrFail(symbol);
    const tradingDays = RANGE_TRADING_DAYS[range];
    const points: HistoricalPricePoint[] = [];

    let cursor = lastTradingDay(new Date());
    for (let i = 0; i < tradingDays; i += 1) {
      points.push({ date: toDateString(cursor), close: this.priceFor(entry, cursor) });
      cursor = previousTradingDay(cursor);
    }

    return points.reverse();
  }

  private findEntryOrFail(symbol: string): MockCatalogEntry {
    const normalized = symbol.trim().toUpperCase();
    const entry = MOCK_CATALOG.find((item) => item.symbol === normalized);
    if (!entry) throw new InvalidMarketSymbolError(normalized);
    return entry;
  }

  private toMarketSymbol(entry: MockCatalogEntry): MarketSymbol {
    return {
      symbol: entry.symbol,
      name: entry.name,
      assetType: entry.assetType,
      region: 'United States',
      currency: 'USD',
    };
  }

  /**
   * Precio determinista: caminata suave en función del día (UTC) y del hash del
   * símbolo. Reproducible entre procesos y ejecuciones.
   */
  private priceFor(entry: MockCatalogEntry, date: Date): number {
    const dayOrdinal = Math.floor(date.getTime() / MS_PER_DAY);
    const hash = hashSymbol(entry.symbol);
    const slow = Math.sin(dayOrdinal / 19 + (hash % 11)) * 0.12;
    const medium = Math.sin(dayOrdinal / 7 + (hash % 5)) * 0.05;
    const fast = Math.sin(dayOrdinal / 2.3 + (hash % 3)) * 0.015;
    return round2(entry.basePrice * (1 + slow + medium + fast));
  }
}
