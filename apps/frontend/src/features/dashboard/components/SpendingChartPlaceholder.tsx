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
  const max = Math.max(...data.map((bar) => bar.amount), 1);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
        <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400">
          <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" />
          {legend}
        </span>
      </div>

      <div className="mt-8 flex h-48 items-stretch gap-3">
        {data.map((bar) => {
          const heightPct = Math.max((bar.amount / max) * 100, 3);

          return (
            <div key={bar.label} className="flex flex-1 flex-col items-center gap-2">
              <div className="relative w-full flex-1">
                <div
                  className={cn(
                    'absolute inset-x-0 bottom-0 rounded-t-lg transition-all',
                    bar.highlight ? 'bg-indigo-600' : 'bg-indigo-100',
                  )}
                  style={{ height: `${heightPct}%` }}
                  title={formatCurrency(bar.amount, currency)}
                />
              </div>
              <span className="text-[11px] font-medium text-slate-400">{bar.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
