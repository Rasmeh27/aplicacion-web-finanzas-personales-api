'use client';

import { useMemo } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useLocaleStore } from '@/store/slices/locale.store';
import { useTranslation } from '@/shared/i18n/useTranslation';
import { formatDate, formatUsd } from '../../utils/format';
import type { PerformanceResponse } from '../../types';
import { ChartCard } from './ChartCard';
import {
  AXIS_TICK,
  CATEGORICAL_COLORS,
  GRID_COLOR,
  REFERENCE_COLOR,
  TOOLTIP_WRAPPER_CLASS,
} from './chart-theme';

const MARKET_COLOR = CATEGORICAL_COLORS[0];

type EvolutionChartProps = {
  performance: PerformanceResponse | null;
};

type EvolutionDatum = {
  date: string;
  marketValue: number | null;
  costBasis: number;
};

function EvolutionTooltip({
  active,
  payload,
  label,
  locale,
  marketLabel,
  costLabel,
  notAvailable,
}: {
  active?: boolean;
  payload?: { payload: EvolutionDatum }[];
  label?: string;
  locale: string;
  marketLabel: string;
  costLabel: string;
  notAvailable: string;
}) {
  if (!active || !payload?.length) return null;
  const datum = payload[0].payload;
  return (
    <div className={TOOLTIP_WRAPPER_CLASS}>
      <p className="font-bold text-slate-900">{formatDate(label ?? datum.date, locale)}</p>
      <p className="mt-0.5 text-slate-600">
        {marketLabel}:{' '}
        <span className="font-semibold text-slate-900">
          {datum.marketValue !== null ? formatUsd(datum.marketValue) : notAvailable}
        </span>
      </p>
      <p className="text-slate-600">
        {costLabel}: <span className="font-semibold text-slate-900">{formatUsd(datum.costBasis)}</span>
      </p>
    </div>
  );
}

/**
 * Evolución del portafolio a partir de snapshots diarios REALES. Con menos de
 * dos snapshots muestra el aviso de datos insuficientes: nunca fabrica curva.
 */
export function PortfolioEvolutionChart({ performance }: EvolutionChartProps) {
  const { t } = useTranslation();
  const locale = useLocaleStore((state) => state.locale) === 'es' ? 'es-DO' : 'en-US';

  const data = useMemo<EvolutionDatum[]>(
    () =>
      (performance?.points ?? []).map((point) => ({
        date: point.date,
        marketValue: point.marketValue,
        costBasis: point.costBasis,
      })),
    [performance],
  );

  const insufficient = performance?.insufficientData ?? true;
  const startNote = performance?.historyStartsAt
    ? t('investments.charts.evolution.startNote', {
        date: formatDate(performance.historyStartsAt, locale),
      })
    : undefined;

  return (
    <ChartCard
      title={t('investments.charts.evolution.title')}
      subtitle={t('investments.charts.evolution.subtitle')}
      empty={insufficient}
      emptyMessage={t('investments.charts.evolution.insufficient')}
      footnote={startNote}
    >
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
            <defs>
              <linearGradient id="marketValueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={MARKET_COLOR} stopOpacity={0.22} />
                <stop offset="100%" stopColor={MARKET_COLOR} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={{ stroke: GRID_COLOR }}
              tickFormatter={(value: string) => formatDate(value, locale)}
              minTickGap={28}
            />
            <YAxis
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={78}
              tickFormatter={(value: number) => formatUsd(value)}
              domain={['auto', 'auto']}
            />
            <Tooltip
              content={
                <EvolutionTooltip
                  locale={locale}
                  marketLabel={t('investments.charts.marketValue')}
                  costLabel={t('investments.charts.costBasis')}
                  notAvailable={t('investments.notAvailable')}
                />
              }
            />
            <Legend
              formatter={(value: string) => (
                <span className="text-xs font-semibold text-slate-600">{value}</span>
              )}
            />
            <Area
              type="monotone"
              dataKey="marketValue"
              name={t('investments.charts.marketValue')}
              stroke={MARKET_COLOR}
              strokeWidth={2}
              fill="url(#marketValueFill)"
              connectNulls={false}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="costBasis"
              name={t('investments.charts.costBasis')}
              stroke={REFERENCE_COLOR}
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
