'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Loader2 } from 'lucide-react';
import { useLocaleStore } from '@/store/slices/locale.store';
import { useTranslation } from '@/shared/i18n/useTranslation';
import { cn } from '@/shared/utils/cn';
import { investmentsService } from '../../services/investments.service';
import { formatDate, formatUsd } from '../../utils/format';
import type { MarketRange, SymbolHistoryResponse } from '../../types';
import { ChartCard } from './ChartCard';
import { AXIS_TICK, CATEGORICAL_COLORS, GRID_COLOR, TOOLTIP_WRAPPER_CLASS } from './chart-theme';

const LINE_COLOR = CATEGORICAL_COLORS[0];
const RANGES: Exclude<MarketRange, 'ALL'>[] = ['1M', '3M', '6M', '1Y'];

type SymbolHistoryChartProps = {
  symbols: string[];
};

function HistoryTooltip({
  active,
  payload,
  label,
  locale,
  closeLabel,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  locale: string;
  closeLabel: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className={TOOLTIP_WRAPPER_CLASS}>
      <p className="font-bold text-slate-900">{formatDate(label ?? '', locale)}</p>
      <p className="mt-0.5 text-slate-600">
        {closeLabel}: <span className="font-semibold text-slate-900">{formatUsd(payload[0].value)}</span>
      </p>
    </div>
  );
}

/** Histórico de cierre diario del símbolo seleccionado del portafolio. */
export function SymbolHistoryChart({ symbols }: SymbolHistoryChartProps) {
  const { t } = useTranslation();
  const locale = useLocaleStore((state) => state.locale) === 'es' ? 'es-DO' : 'en-US';

  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(symbols[0] ?? null);
  const [range, setRange] = useState<Exclude<MarketRange, 'ALL'>>('3M');
  const [history, setHistory] = useState<SymbolHistoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  // Mantiene una selección válida cuando cambian las posiciones.
  useEffect(() => {
    if (symbols.length === 0) {
      setSelectedSymbol(null);
      return;
    }
    if (!selectedSymbol || !symbols.includes(selectedSymbol)) {
      setSelectedSymbol(symbols[0]);
    }
  }, [symbols, selectedSymbol]);

  useEffect(() => {
    if (!selectedSymbol) {
      setHistory(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    investmentsService
      .getSymbolHistory(selectedSymbol, range)
      .then((response) => {
        if (!cancelled) setHistory(response);
      })
      .catch(() => {
        if (!cancelled) {
          setHistory(null);
          setFailed(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedSymbol, range]);

  const points = useMemo(() => history?.points ?? [], [history]);
  const empty = !loading && (symbols.length === 0 || points.length === 0);

  return (
    <ChartCard
      title={t('investments.charts.history.title')}
      subtitle={t('investments.charts.history.subtitle')}
      empty={empty}
      emptyMessage={
        failed ? t('investments.error.marketUnavailable') : t('investments.charts.empty')
      }
      action={
        symbols.length > 0 ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <select
              value={selectedSymbol ?? ''}
              onChange={(event) => setSelectedSymbol(event.target.value)}
              aria-label={t('investments.form.selectedSymbol')}
              className="h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            >
              {symbols.map((symbol) => (
                <option key={symbol} value={symbol}>
                  {symbol}
                </option>
              ))}
            </select>
            <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-0.5">
              {RANGES.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setRange(option)}
                  className={cn(
                    'rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition',
                    range === option
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800',
                  )}
                >
                  {t(`investments.range.${option}`)}
                </button>
              ))}
            </div>
          </div>
        ) : null
      }
    >
      {loading ? (
        <div className="flex h-60 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
        </div>
      ) : (
        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
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
                width={70}
                tickFormatter={(value: number) => formatUsd(value)}
                domain={['auto', 'auto']}
              />
              <Tooltip
                content={
                  <HistoryTooltip locale={locale} closeLabel={t('investments.charts.close')} />
                }
              />
              <Line
                type="monotone"
                dataKey="close"
                stroke={LINE_COLOR}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
