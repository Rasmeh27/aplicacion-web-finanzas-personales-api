'use client';

import { Briefcase, DollarSign, TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react';
import { useLocaleStore } from '@/store/slices/locale.store';
import { useTranslation } from '@/shared/i18n/useTranslation';
import { cn } from '@/shared/utils/cn';
import {
  formatPct,
  formatSignedUsd,
  formatTime,
  formatUsd,
  gainLossTone,
} from '../utils/format';
import type { PortfolioSummary } from '../types';

type SummaryCardsProps = {
  summary: PortfolioSummary | null;
  loading: boolean;
};

const TONE_TEXT: Record<'positive' | 'negative' | 'neutral', string> = {
  positive: 'text-emerald-600',
  negative: 'text-rose-600',
  neutral: 'text-slate-950',
};

function SummaryCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint: string;
  tone?: 'positive' | 'negative' | 'neutral';
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </span>
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className={cn('mt-3 text-2xl font-black tracking-tight', TONE_TEXT[tone])}>{value}</p>
      <p className="mt-1 text-[11px] font-medium text-slate-400">{hint}</p>
    </div>
  );
}

/** Tarjetas de resumen en USD; los null se muestran como no disponibles. */
export function SummaryCards({ summary, loading }: SummaryCardsProps) {
  const { t } = useTranslation();
  const locale = useLocaleStore((state) => state.locale) === 'es' ? 'es-DO' : 'en-US';

  if (loading && !summary) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-32 animate-pulse rounded-3xl border border-slate-200 bg-white" />
        ))}
      </div>
    );
  }
  if (!summary) return null;

  const updatedHint = t('investments.updatedAt', {
    time: formatTime(summary.asOf ?? summary.updatedAt, locale),
  });
  const notAvailable = t('investments.notAvailable');

  const gainTone = gainLossTone(summary.unrealizedGainLoss);
  const dayTone = gainLossTone(summary.dayChange);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryCard
        icon={Briefcase}
        label={`${t('investments.summary.portfolioValue')} (USD)`}
        value={summary.marketValue !== null ? formatUsd(summary.marketValue) : notAvailable}
        hint={updatedHint}
      />
      <SummaryCard
        icon={DollarSign}
        label={`${t('investments.summary.totalInvested')} (USD)`}
        value={formatUsd(summary.costBasis)}
        hint={`${summary.positionsCount} ${t('investments.summary.positions')}`}
      />
      <SummaryCard
        icon={summary.unrealizedGainLoss !== null && summary.unrealizedGainLoss < 0 ? TrendingDown : TrendingUp}
        label={`${t('investments.summary.unrealizedGainLoss')} (USD)`}
        value={
          summary.unrealizedGainLoss !== null
            ? `${formatSignedUsd(summary.unrealizedGainLoss)} (${formatPct(summary.unrealizedGainLossPct)})`
            : notAvailable
        }
        hint={updatedHint}
        tone={gainTone}
      />
      <SummaryCard
        icon={summary.dayChange !== null && summary.dayChange < 0 ? TrendingDown : TrendingUp}
        label={`${t('investments.summary.dayChange')} (USD)`}
        value={summary.dayChange !== null ? formatSignedUsd(summary.dayChange) : notAvailable}
        hint={updatedHint}
        tone={dayTone}
      />
    </div>
  );
}
