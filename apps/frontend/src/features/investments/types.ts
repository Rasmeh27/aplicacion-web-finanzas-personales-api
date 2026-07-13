export type InvestmentAssetType = 'stock' | 'etf';

export type MarketDataStatus = 'fresh' | 'partial' | 'stale' | 'unavailable' | 'empty';
export type MarketProviderId = 'mock' | 'twelve_data' | 'alphavantage';
export type MarketStatus = 'open' | 'closed' | 'unknown';
export type WeightBasis = 'market_value' | 'cost_basis';
export type MarketRange = '1M' | '3M' | '6M' | '1Y' | 'ALL';

/** Metadata de mercado que acompaña las respuestas de inversiones. */
export type MarketDataMeta = {
  provider: MarketProviderId;
  status: MarketDataStatus;
  isMock: boolean;
  asOf: string | null;
  marketStatus: MarketStatus;
  failedSymbols: string[];
};

export type InvestmentPortfolio = {
  id: string;
  name: string;
  baseCurrency: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type EnrichedPosition = {
  id: string;
  symbol: string;
  displayName: string | null;
  assetType: InvestmentAssetType;
  quantity: number;
  averageCost: number;
  currency: string;
  purchaseDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  costBasis: number;
  currentPrice: number | null;
  marketValue: number | null;
  unrealizedGainLoss: number | null;
  unrealizedGainLossPct: number | null;
  dayChange: number | null;
  dayChangePct: number | null;
  weight: number | null;
  priceAsOf: string | null;
  priceStatus: 'fresh' | 'stale' | 'unavailable';
};

export type PositionsListResponse = {
  portfolioId: string | null;
  baseCurrency: string;
  items: EnrichedPosition[];
  marketDataStatus: MarketDataStatus;
  marketDataSource: MarketProviderId;
  weightsBasis: WeightBasis | null;
  asOf: string | null;
  marketData: MarketDataMeta;
};

export type PortfolioSummary = {
  portfolioId: string;
  baseCurrency: string;
  positionsCount: number;
  costBasis: number;
  marketValue: number | null;
  unrealizedGainLoss: number | null;
  unrealizedGainLossPct: number | null;
  dayChange: number | null;
  dayChangePct: number | null;
  topPosition: { symbol: string; weight: number } | null;
  topThreeConcentration: number | null;
  weightsBasis: WeightBasis | null;
  marketDataStatus: MarketDataStatus;
  marketDataSource: MarketProviderId;
  asOf: string | null;
  updatedAt: string;
  marketData: MarketDataMeta;
};

export type AllocationItem = {
  symbol: string;
  displayName: string | null;
  assetType: InvestmentAssetType;
  value: number;
  weight: number;
};

export type AllocationResponse = {
  portfolioId: string;
  basis: WeightBasis | null;
  items: AllocationItem[];
  byAssetType: { assetType: string; value: number; weight: number }[];
  marketDataStatus: MarketDataStatus;
  marketDataSource: MarketProviderId;
  asOf: string | null;
  marketData: MarketDataMeta;
};

export type PerformancePoint = {
  date: string;
  costBasis: number;
  marketValue: number | null;
  unrealizedGainLoss: number | null;
  marketDataStatus: string;
};

export type PerformanceResponse = {
  portfolioId: string;
  range: MarketRange;
  points: PerformancePoint[];
  insufficientData: boolean;
  historyStartsAt: string | null;
};

export type MarketSymbol = {
  symbol: string;
  name: string;
  assetType: InvestmentAssetType | 'other';
  region: string;
  currency: string;
  exchange?: string | null;
  micCode?: string | null;
};

export type SymbolSearchResponse = {
  items: MarketSymbol[];
  marketDataSource: MarketProviderId;
};

export type SymbolHistoryResponse = {
  symbol: string;
  range: Exclude<MarketRange, 'ALL'>;
  points: { date: string; close: number; open?: number | null; high?: number | null; low?: number | null; volume?: number | null }[];
  marketDataSource: MarketProviderId;
};

export type CreatePositionPayload = {
  symbol: string;
  assetType: InvestmentAssetType;
  quantity: number;
  averageCost: number;
  purchaseDate?: string;
  notes?: string;
};

export type UpdatePositionPayload = Partial<Omit<CreatePositionPayload, 'symbol'>>;

export type CreatePositionResponse = {
  position: EnrichedPosition;
  warnings: string[];
};
