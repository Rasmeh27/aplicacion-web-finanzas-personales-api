'use client';

import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTranslation } from '@/shared/i18n/useTranslation';
import { formatSignedUsd } from '../../utils/format';
import type { EnrichedPosition } from '../../types';
import { ChartCard } from './ChartCard';
import {
  AXIS_TICK,
  GAIN_COLOR,
  GRID_COLOR,
  LOSS_COLOR,
  TOOLTIP_WRAPPER_CLASS,
} from './chart-theme';

type GainLossDatum = {
  symbol: string;
  gainLoss: number;
};

type GainLossChartProps = {
  positions: EnrichedPosition[];
};

function GainLossTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: GainLossDatum }[];
}) {
  if (!active || !payload?.length) return null;
  const datum = payload[0].payload;
  return (
    <div className={TOOLTIP_WRAPPER_CLASS}>
      <p className="font-bold text-slate-900">{datum.symbol}</p>
      <p className="mt-0.5 text-slate-600">{formatSignedUsd(datum.gainLoss)}</p>
    </div>
  );
}

/**
 * Ganancia/pérdida NO realizada por posición. Solo se grafican posiciones con
 * cotización disponible; la polaridad usa el par divergente (verde/rosa).
 */
export function GainLossChart({ positions }: GainLossChartProps) {
  const { t } = useTranslation();

  const data = useMemo<GainLossDatum[]>(
    () =>
      positions
        .filter((position) => position.unrealizedGainLoss !== null)
        .map((position) => ({
          symbol: position.symbol,
          gainLoss: position.unrealizedGainLoss as number,
        })),
    [positions],
  );

  return (
    <ChartCard
      title={t('investments.charts.gainLoss.title')}
      subtitle={t('investments.charts.gainLoss.subtitle')}
      empty={data.length === 0}
    >
      <div className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 8 }} barCategoryGap="28%">
            <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="symbol"
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={{ stroke: GRID_COLOR }}
            />
            <YAxis
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={70}
              tickFormatter={(value: number) => formatSignedUsd(value)}
            />
            <Tooltip content={<GainLossTooltip />} cursor={{ fill: 'rgba(148,163,184,0.12)' }} />
            <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1} />
            <Bar dataKey="gainLoss" radius={[4, 4, 0, 0]} maxBarSize={42}>
              {data.map((datum) => (
                <Cell
                  key={datum.symbol}
                  fill={datum.gainLoss >= 0 ? GAIN_COLOR : LOSS_COLOR}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
