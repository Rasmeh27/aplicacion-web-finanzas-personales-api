import type { ReactNode } from 'react';
import { cn } from '@/shared/utils/cn';
import { formatCurrency } from '@/shared/utils/format-currency';
import type { RecentTransaction, TransactionType } from '../data/dashboard.mock';

const typeBadgeStyles: Record<TransactionType, string> = {
  'Gasto Variable': 'bg-amber-50 text-amber-700',
  'Gasto Fijo': 'bg-blue-50 text-blue-700',
  Ingreso: 'bg-emerald-50 text-emerald-700',
};

const dateStatusStyles = {
  completed: 'bg-emerald-50 text-emerald-700',
  scheduled: 'bg-indigo-50 text-indigo-700',
} as const;

function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
        className,
      )}
    >
      {children}
    </span>
  );
}

type RecentTransactionsTableProps = {
  transactions: RecentTransaction[];
  currency?: string;
  title?: string;
  seeAllLabel?: string;
  emptyTitle?: string;
  emptySubtitle?: string;
};

export function RecentTransactionsTable({
  transactions,
  currency = 'DOP',
  title = 'Movimientos recientes',
  seeAllLabel = 'Ver todos',
  emptyTitle = 'Aún no tienes movimientos registrados.',
  emptySubtitle = 'Cuando registres ingresos o gastos reales aparecerán aquí.',
}: RecentTransactionsTableProps) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between px-6 py-5">
        <h2 className="text-base font-bold text-slate-950">{title}</h2>
        <button type="button" className="text-sm font-semibold text-indigo-600 transition hover:text-indigo-700">
          {seeAllLabel}
        </button>
      </div>

      {transactions.length === 0 ? (
        <div className="px-6 pb-10 pt-4 text-center">
          <p className="text-sm font-semibold text-slate-700">{emptyTitle}</p>
          <p className="mt-1 text-sm text-slate-500">{emptySubtitle}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-6 py-3 font-semibold">Comercio / Detalle</th>
                <th className="px-6 py-3 font-semibold">Categoría</th>
                <th className="px-6 py-3 font-semibold">Fecha</th>
                <th className="px-6 py-3 font-semibold">Método</th>
                <th className="px-6 py-3 text-right font-semibold">Monto</th>
                <th className="px-6 py-3 font-semibold">Tipo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((tx) => {
                const isIncome = tx.type === 'Ingreso';

                return (
                  <tr key={tx.id} className="transition hover:bg-slate-50/70">
                    <td className="px-6 py-4 font-semibold text-slate-950">{tx.merchant}</td>
                    <td className="px-6 py-4">
                      <Badge className="bg-slate-100 text-slate-700">{tx.category}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      {tx.dateStatus ? (
                        <div className="space-y-1">
                          <Badge className={dateStatusStyles[tx.dateStatus]}>{tx.date}</Badge>
                          {tx.dateDetail ? (
                            <p className="text-xs font-medium text-slate-400">{tx.dateDetail}</p>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-slate-500">{tx.date}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Badge className="bg-violet-50 text-violet-700">{tx.method}</Badge>
                    </td>
                    <td
                      className={cn(
                        'px-6 py-4 text-right font-bold tabular-nums',
                        isIncome ? 'text-emerald-600' : 'text-slate-950',
                      )}
                    >
                      {isIncome ? '+ ' : '- '}
                      {formatCurrency(tx.amount, currency)}
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={typeBadgeStyles[tx.type]}>{tx.type}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
