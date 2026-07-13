import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type FinancialNewsItem = {
  title: string;
  source: string;
  url: string;
  publishedAt: string | null;
  summary: string | null;
};

@Injectable()
export class FinancialNewsService {
  constructor(private readonly config: ConfigService) {}

  async search(query = 'personal finance OR stock market', limit = 10): Promise<FinancialNewsItem[]> {
    const apiKey = this.config.get<string>('NEWS_API_KEY');
    if (!apiKey) {
      throw new ServiceUnavailableException({
        code: 'news_provider_not_configured',
        message: 'El proveedor de noticias financieras no está configurado.',
      });
    }

    const params = new URLSearchParams({
      q: query,
      language: 'es',
      sortBy: 'publishedAt',
      pageSize: String(Math.min(Math.max(limit, 1), 20)),
      apiKey,
    });

    const response = await fetch(`https://newsapi.org/v2/everything?${params.toString()}`);
    if (!response.ok) {
      throw new ServiceUnavailableException({
        code: 'news_provider_unavailable',
        message: 'No pudimos obtener noticias financieras ahora mismo.',
      });
    }

    const payload = (await response.json()) as {
      articles?: Array<{
        title?: string;
        source?: { name?: string };
        url?: string;
        publishedAt?: string;
        description?: string;
      }>;
    };

    return (payload.articles ?? [])
      .filter((article) => article.title && article.url)
      .map((article) => ({
        title: article.title as string,
        source: article.source?.name ?? 'Fuente no disponible',
        url: article.url as string,
        publishedAt: article.publishedAt ?? null,
        summary: article.description ?? null,
      }));
  }
}
