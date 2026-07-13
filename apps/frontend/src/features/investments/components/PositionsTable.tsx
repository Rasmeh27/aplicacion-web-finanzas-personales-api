'use client';

import { LineChart, Pencil, Trash2 } from 'lucide-react';
import { useLocaleStore } from '@/store/slices/locale.store';
import { useTranslation } from '@/shared/i18n/useTranslation';
import { cn } from '@/shared/utils/cn';
import {
  formatQuantity,
  formatSignedUsd,
  formatTime,
  formatUsd,
  formatWeight,
  gainLossTone,
} from '../utils/format';
import type { EnrichedPosition, PositionsListResponse } from '../types';

type PositionsTableProps = {
  data: PositionsListResponse | null;
  loading: boolean;
  errorKey: string | null;
  onRetry: () => void;
  onAdd: () => void;
  onEdit: (position: EnrichedPosition) => void;
  onDelete: (position: EnrichedPosition) => void;
};

const TONE_TEXT: Record<'positive' | 'negative' | 'neutral', string> = {
  positive: 'text-emerald-600',
  negative: 'text-rose-600',
  neutral: 'text-slate-700',
};

/** Tabla de posiciones con skeleton, empty, error y estado de mercado. */
export function PositionsTable({
  data,
  loading,
  errorKey,
  onRetry,
  onAdd,
  onEdit,
  onDelete,
}: PositionsTableProps) {
  const { t } = useTranslation();
  const locale = useLocaleStore((state) => state.locale) === 'es' ? 'es-DO' : 'en-US';

  const items = data?.items ?? [];
  const notAvailable = t('investments.notAvailable');

  return (
    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
        <h3 className="text-sm font-black tracking-tight text-slate-950">
          {t('investments.table.title')}
        </h3>
        {data && data.marketDataStatus !== 'fresh' && data.marketDataStatus !== 'empty' ? (
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
            {t(`investments.marketStatus.${data.marketDataStatus}`)}
          </span>
        ) : null}
      </div>

      {loading && items.length === 0 ? (
        <div className="space-y-3 p-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-12 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : errorKey && items.length === 0 ? (
        <div className="m-6 flex flex-col items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4">
          <p className="text-sm font-medium text-rose-700">{t('investments.table.error')}</p>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-xl border border-rose-300 bg-white px-3 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
          >
            {t('investments.retry')}
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="m-6 flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-14 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <LineChart className="h-6 w-6" />
          </span>
          <p className="text-sm font-semibold text-slate-700">{t('investments.table.emptyTitle')}</p>
          <p className="max-w-sm text-sm text-slate-500">{t('investments.table.emptySubtitle')}</p>
          <button
            type="button"
            onClick={onAdd}
            className="mt-1 rounded-2xl bg-indigo-600 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-700"
          >
            {t('investments.addPosition')}
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                <th className="px-6 py-3">{t('investments.table.asset')}</th>
                <th className="px-3 py-3">{t('investments.table.type')}</th>
                <th className="px-3 py-3 text-right">{t('investments.table.quantity')}</th>
                <th className="px-3 py-3 text-right">{t('investments.table.avgCost')}</th>
                <th className="px-3 py-3 text-right">{t('investments.table.price')}</th>
                <th className="px-3 py-3 text-right">{t('investments.table.value')}</th>
                <th className="px-3 py-3 text-right">{t('investments.table.gainLoss')}</th>
                <th className="px-3 py-3 text-right">{t('investments.table.weight')}</th>
                <th className="px-3 py-3">{t('investments.table.updated')}</th>
                <th className="px-6 py-3 text-right">{t('investments.table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((position) => {
                const tone = gainLossTone(position.unrealizedGainLoss);
                const unavailable = position.priceStatus === 'unavailable';
                return (
                  <tr key={position.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                    <td className="px-6 py-3.5">
                      <p className="font-black tracking-tight text-slate-950">{position.symbol}</p>
                      <p className="max-w-[180px] truncate text-xs text-slate-500">
                        {position.displayName ?? '—'}
                      </p>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold uppercase text-slate-600">
                        {t(position.assetType === 'etf' ? 'investments.type.etf' : 'investments.type.stock')}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-right font-medium text-slate-700">
                      {formatQuantity(position.quantity)}
                    </td>
                    <td className="px-3 py-3.5 text-right font-medium text-slate-700">
                      {formatUsd(position.averageCost)}
                    </td>
                    <td className="px-3 py-3.5 text-right font-medium text-slate-700">
                      {position.currentPrice !== null ? formatUsd(position.currentPrice) : notAvailable}
                    </td>
                    <td className="px-3 py-3.5 text-right font-semibold text-slate-900">
                      {position.marketValue !== null ? formatUsd(position.marketValue) : notAvailable}
                    </td>
                    <td className={cn('px-3 py-3.5 text-right font-semibold', TONE_TEXT[tone])}>
                      {position.unrealizedGainLoss !== null
                        ? formatSignedUsd(position.unrealizedGainLoss)
                        : notAvailable}
                    </td>
                    <td className="px-3 py-3.5 text-right font-medium text-slate-700">
                      {formatWeight(position.weight)}
                    </td>
                    <td className="px-3 py-3.5 text-xs text-slate-500">
                      {unavailable ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">
                          {t('investments.marketStatus.unavailable')}
                        </span>
                      ) : (
                        formatTime(position.priceAsOf, locale)
                      )}
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => onEdit(position)}
                          title={t('investments.table.edit')}
                          aria-label={`${t('investments.table.edit')} ${position.symbol}`}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(position)}
                          title={t('investments.table.delete')}
                          aria-label={`${t('investments.table.delete')} ${position.symbol}`}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
