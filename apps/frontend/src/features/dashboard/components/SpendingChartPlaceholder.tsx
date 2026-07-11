import { cn } from '@/shared/utils/cn';
import { formatCurrency } from '@/shared/utils/format-currency';
import type { SpendingBar } from '../data/dashboard.mock';

type SpendingChartPlaceholderProps = {
  data: SpendingBar[];
  title?: string;
  subtitle?: string;
  currency?: string;
  legend?: string;
};

export function SpendingChartPlaceholder({
  data,
  title = 'Gastos del período',
  subtitle = 'Distribución estimada por hora',
  currency = 'DOP',
  legend = 'Mayor monto',
}: SpendingChartPlaceholderProps) {
  const max = Math.max(...data.map((bar) => Math.max(bar.amount, 0)), 1);
  const total = data.reduce((sum, bar) => sum + Math.max(bar.amount, 0), 0);
  const topItem = data.reduce(
    (current, bar) => (Math.max(bar.amount, 0) > Math.max(current.amount, 0) ? bar : current),
    data[0] ?? { label: '-', amount: 0 },
  );

  const styles = [
    { dot: 'bg-rose-500', fill: 'bg-rose-500', soft: 'bg-rose-50 text-rose-600' },
    { dot: 'bg-amber-400', fill: 'bg-amber-400', soft: 'bg-amber-50 text-amber-700' },
    { dot: 'bg-emerald-500', fill: 'bg-emerald-500', soft: 'bg-emerald-50 text-emerald-700' },
    { dot: 'bg-indigo-600', fill: 'bg-indigo-600', soft: 'bg-indigo-50 text-indigo-600' },
  ];

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
        <span className="hidden items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-500 sm:inline-flex">
          <span className="h-2.5 w-2.5 rounded-full bg-indigo-600 shadow-sm shadow-indigo-600/25" />
          {legend}: {topItem.label}
        </span>
      </div>

      {total <= 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center">
          <p className="text-sm font-black text-slate-600">Aún no hay datos para graficar.</p>
          <p className="mt-1 text-xs font-semibold text-slate-400">Registra ingresos y gastos para ver la distribución.</p>
        </div>
      ) : (
        <>
          <div className="mt-6 flex h-3 overflow-hidden rounded-full bg-slate-100">
            {data.map((bar, index) => {
              const pct = total > 0 ? (Math.max(bar.amount, 0) / total) * 100 : 0;
              if (pct <= 0) return null;
              return (
                <span
                  key={bar.label}
                  className={cn('h-full', styles[index % styles.length].fill)}
                  style={{ width: `${pct}%` }}
                />
              );
            })}
          </div>

          <div className="mt-6 space-y-4">
            {data.map((bar, index) => {
              const style = styles[index % styles.length];
              const positiveAmount = Math.max(bar.amount, 0);
              const widthPct = positiveAmount > 0 ? Math.max((positiveAmount / max) * 100, 5) : 0;
              const totalPct = total > 0 ? Math.round((positiveAmount / total) * 100) : 0;

              return (
                <div key={bar.label} className="grid gap-2 sm:grid-cols-[120px_minmax(0,1fr)_130px] sm:items-center">
                  <div className="flex items-center gap-2">
                    <span className={cn('h-2.5 w-2.5 rounded-full', style.dot)} />
                    <span className="text-sm font-black text-slate-700">{bar.label}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={cn('h-full rounded-full transition-all', bar.highlight ? 'bg-indigo-600' : style.fill)}
                      style={{ width: `${widthPct}%` }}
                      title={formatCurrency(bar.amount, currency)}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2 sm:justify-end">
                    <span className="text-sm font-black text-slate-950">{formatCurrency(bar.amount, currency)}</span>
                    <span className={cn('min-w-11 rounded-full px-2 py-1 text-center text-xs font-black', style.soft)}>
                      {totalPct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
