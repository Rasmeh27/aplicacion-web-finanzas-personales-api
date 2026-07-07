import type { SpendingCategory } from '../data/dashboard.mock';
import { formatCurrency } from '@/shared/utils/format-currency';

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
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-950">{title}</h2>
        <span className="text-xs font-semibold text-slate-400">{caption}</span>
      </div>

      <ul className="mt-5 space-y-4">
        {categories.map((category) => (
          <li key={category.name}>
            <div className="flex items-start justify-between gap-3 text-sm">
              <span className="font-medium text-slate-700">{category.name}</span>
              <span className="text-right">
                {category.amount !== undefined ? (
                  <span className="block text-xs font-bold text-slate-400">
                    {formatCurrency(category.amount, currency)}
                  </span>
                ) : null}
                <span className="font-semibold text-slate-500">{category.pct}%</span>
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-indigo-600"
                style={{ width: `${category.pct}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
