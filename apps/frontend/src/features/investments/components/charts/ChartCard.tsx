'use client';

import type { ReactNode } from 'react';
import { BarChart3 } from 'lucide-react';
import { useTranslation } from '@/shared/i18n/useTranslation';

type ChartCardProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  /** Sin datos: muestra empty state en lugar de un gráfico vacío/falso. */
  empty?: boolean;
  emptyMessage?: string;
  footnote?: ReactNode;
  children: ReactNode;
};

/** Tarjeta contenedora estándar para los gráficos del portafolio. */
export function ChartCard({
  title,
  subtitle,
  action,
  empty = false,
  emptyMessage,
  footnote,
  children,
}: ChartCardProps) {
  const { t } = useTranslation();

  return (
    <section className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-black tracking-tight text-slate-950">{title}</h3>
          {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      {empty ? (
        <div className="mt-4 flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-10 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
            <BarChart3 className="h-5 w-5" />
          </span>
          <p className="text-xs font-semibold text-slate-500">
            {emptyMessage ?? t('investments.charts.empty')}
          </p>
        </div>
      ) : (
        <div className="mt-4 flex-1">{children}</div>
      )}

      {footnote ? <p className="mt-3 text-[11px] font-medium text-slate-400">{footnote}</p> : null}
    </section>
  );
}
