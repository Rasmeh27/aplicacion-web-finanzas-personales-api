import type { SpendingCategory } from '../data/dashboard.mock';
import { formatCurrency } from '@/shared/utils/format-currency';
import { cn } from '@/shared/utils/cn';

type CategoryProgressProps = {
  categories: Array<SpendingCategory & { amount?: number }>;
  title?: string;
  caption?: string;
  currency?: string;
};

export function CategoryProgress({
  categories,
  title = 'Gastos por categoría',
  caption = 'Este mes',
  currency = 'DOP',
}: CategoryProgressProps) {
  const styles = [
    { bar: 'bg-indigo-600', badge: 'bg-indigo-50 text-indigo-600' },
    { bar: 'bg-rose-500', badge: 'bg-rose-50 text-rose-600' },
    { bar: 'bg-amber-400', badge: 'bg-amber-50 text-amber-700' },
    { bar: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700' },
  ];

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-950">{title}</h2>
        <span className="text-xs font-semibold text-slate-400">{caption}</span>
      </div>

      {categories.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center">
          <p className="text-sm font-semibold text-slate-600">No hay gastos registrados en este período.</p>
          <p className="mt-1 text-xs text-slate-400">Cuando registres gastos reales, aparecerán aquí por categoría.</p>
        </div>
      ) : (
        <ul className="mt-5 space-y-4">
          {categories.map((category, index) => {
            const style = styles[index % styles.length];
            const pct = Math.min(Math.max(category.pct, 0), 100);

            return (
              <li key={category.name}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black', style.badge)}>
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-700">{category.name}</p>
                      {category.amount !== undefined ? (
                        <p className="mt-0.5 text-xs font-bold text-slate-400">
                          {formatCurrency(category.amount, currency)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <span className="text-sm font-black text-slate-600">{pct}%</span>
                </div>
                <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={cn('h-full rounded-full transition-all', style.bar)}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
