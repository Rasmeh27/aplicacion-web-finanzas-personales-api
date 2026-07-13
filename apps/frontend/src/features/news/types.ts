export type FinancialNewsItem = {
  title: string;
  source: string;
  url: string;
  publishedAt: string | null;
  summary: string | null;
};

export type FinancialNewsQuery = {
  q?: string;
  limit?: number;
};
