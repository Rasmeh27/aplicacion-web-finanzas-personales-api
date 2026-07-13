import axios from 'axios';
import apiClient from '@/lib/api/client';
import type { FinancialNewsItem, FinancialNewsQuery } from '../types';

export const newsService = {
  async search(params: FinancialNewsQuery = {}): Promise<FinancialNewsItem[]> {
    const { data } = await apiClient.get<FinancialNewsItem[]>('/financial-news', {
      params: {
        q: params.q,
        limit: params.limit ?? 10,
      },
    });
    return data;
  },
};

export function isPremiumRequiredNewsError(error: unknown): boolean {
  return (
    axios.isAxiosError(error) &&
    (error.response?.status === 403 ||
      (error.response?.data as { code?: string } | undefined)?.code === 'premium_required')
  );
}

export function getNewsErrorMessage(error: unknown): string {
  if (isPremiumRequiredNewsError(error)) {
    return 'Esta sección requiere el Plan Premium.';
  }

  if (axios.isAxiosError(error)) {
    const code = (error.response?.data as { code?: string } | undefined)?.code;
    if (code === 'news_provider_not_configured') {
      return 'El proveedor de noticias financieras no está configurado.';
    }
    if (code === 'news_provider_unavailable') {
      return 'No pudimos obtener noticias financieras ahora mismo.';
    }
  }

  return 'No se pudieron cargar las noticias. Intenta nuevamente.';
}
