'use client';

import { useMemo } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useTranslation } from '@/shared/i18n/useTranslation';
import { formatUsd, formatWeight } from '../../utils/format';
import type { AllocationResponse } from '../../types';
import { ChartCard } from './ChartCard';
import { colorForIndex, OTHER_COLOR, TOOLTIP_WRAPPER_CLASS } from './chart-theme';

const MAX_SLICES = 7;

type SliceDatum = {
  name: string;
  value: number;
  weight: number;
  color: string;
};

type AllocationChartProps = {
  allocation: AllocationResponse | null;
};

function AllocationTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: SliceDatum }[];
}) {
  if (!active || !payload?.length) return null;
  const datum = payload[0].payload;
  return (
    <div className={TOOLTIP_WRAPPER_CLASS}>
      <p className="font-bold text-slate-900">{datum.name}</p>
      <p className="mt-0.5 text-slate-600">
        {formatUsd(datum.value)} · {formatWeight(datum.weight)}
      </p>
    </div>
  );
}

/** Distribución del portafolio por símbolo (dona con leyenda). */
export function AllocationChart({ allocation }: AllocationChartProps) {
  const { t } = useTranslation();

  const slices = useMemo<SliceDatum[]>(() => {
    const items = allocation?.items ?? [];
    // Hues por orden fijo sobre las posiciones ya ordenadas por peso;
    // el excedente se agrupa en "Otros" con neutro intencional.
    const head = items.slice(0, MAX_SLICES).map((item, index) => ({
      name: item.symbol,
      value: item.value,
      weight: item.weight,
      color: colorForIndex(index),
    }));
    const tail = items.slice(MAX_SLICES);
    if (tail.length > 0) {
      head.push({
        name: 'Otros',
        value: tail.reduce((acc, item) => acc + item.value, 0),
        weight: tail.reduce((acc, item) => acc + item.weight, 0),
        color: OTHER_COLOR,
      });
    }
    return head;
  }, [allocation]);

  const basisNote =
    allocation?.basis === 'cost_basis' ? t('investments.weightsOnCost') : undefined;

  return (
    <ChartCard
      title={t('investments.charts.allocation.title')}
      subtitle={t('investments.charts.allocation.subtitle')}
      empty={slices.length === 0}
      footnote={basisNote}
    >
      <div className="flex flex-col items-center gap-4 sm:flex-row">
        <div className="h-52 w-full max-w-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices}
                dataKey="value"
                nameKey="name"
                innerRadius="62%"
                outerRadius="95%"
                paddingAngle={2}
                stroke="#ffffff"
                strokeWidth={2}
              >
                {slices.map((slice) => (
                  <Cell key={slice.name} fill={slice.color} />
                ))}
              </Pie>
              <Tooltip content={<AllocationTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Leyenda con identidad textual: nunca color solo. */}
        <ul className="w-full flex-1 space-y-1.5">
          {slices.map((slice) => (
            <li key={slice.name} className="flex items-center gap-2 text-xs">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: slice.color }}
                aria-hidden
              />
              <span className="flex-1 truncate font-semibold text-slate-700">{slice.name}</span>
              <span className="font-medium text-slate-500">{formatWeight(slice.weight)}</span>
            </li>
          ))}
        </ul>
      </div>
    </ChartCard>
  );
}
