'use client';

import { ArrowLeftRight, Eye, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { formatCurrency } from '@/shared/utils/format-currency';
import { CLASSIFICATION_META, type Transaction } from '../types';

type Props = {
  transactions: Transaction[];
  loading: boolean;
  onEdit: (transaction: Transaction) => void;
  onView: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
};

const CLASSIFICATION_BADGE: Record<string, string> = {
  regular_income: 'bg-emerald-50 text-emerald-700',
  extra_income: 'bg-teal-50 text-teal-700',
  fixed_expense: 'bg-rose-50 text-rose-700',
  variable_expense: 'bg-amber-50 text-amber-700',
};

const formatDate = (value: string): string => {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-DO', { day: '2-digit', month: 'short', year: 'numeric' }).format(
    date,
  );
};

function SignedAmount({ transaction }: { transaction: Transaction }) {
  const meta = CLASSIFICATION_META[transaction.classification];
  const isIncome = meta?.type === 'income';
  const amount = Number(transaction.amount);
  const formatted = formatCurrency(amount, transaction.currency);

  return (
    <span
      className={cn(
        'whitespace-nowrap font-bold tabular-nums',
        isIncome ? 'text-emerald-600' : 'text-rose-600',
      )}
    >
      {isIncome ? '+' : '-'}
      {formatted}
    </span>
  );
}

function ActionButtons({
  transaction,
  onEdit,
  onView,
  onDelete,
}: {
  transaction: Transaction;
  onEdit: Props['onEdit'];
  onView: Props['onView'];
  onDelete: Props['onDelete'];
}) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => onView(transaction)}
        aria-label="Ver detalle"
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-indigo-200 hover:text-indigo-600"
      >
        <Eye className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onEdit(transaction)}
        aria-label="Editar"
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-indigo-200 hover:text-indigo-600"
      >
        <Pencil className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onDelete(transaction)}
        aria-label="Eliminar"
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-rose-200 hover:text-rose-600"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
        <ArrowLeftRight className="h-6 w-6" />
      </span>
      <p className="text-sm font-semibold text-slate-700">Aún no hay transacciones</p>
      <p className="max-w-sm text-sm text-slate-500">
        Registra tus ingresos y gastos para llevar el control de tus finanzas personales.
      </p>
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="divide-y divide-slate-100">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="flex items-center justify-between px-5 py-4">
          <div className="space-y-2">
            <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
          </div>
          <div className="h-4 w-20 animate-pulse rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

export function TransactionList({ transactions, loading, onEdit, onView, onDelete }: Props) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      {loading && transactions.length === 0 ? (
        <SkeletonRows />
      ) : transactions.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Desktop: tabla */}
          <table className="hidden w-full text-left text-sm md:table">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3">Descripción</th>
                <th className="px-5 py-3">Categoría</th>
                <th className="px-5 py-3">Clasificación</th>
                <th className="px-5 py-3">Fecha</th>
                <th className="px-5 py-3 text-right">Monto</th>
                <th className="px-5 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="transition hover:bg-slate-50/60">
                  <td className="px-5 py-4 font-semibold text-slate-800">
                    {transaction.description || '—'}
                  </td>
                  <td className="px-5 py-4 text-slate-600">{transaction.category?.name ?? '—'}</td>
                  <td className="px-5 py-4">
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-1 text-xs font-semibold',
                        CLASSIFICATION_BADGE[transaction.classification],
                      )}
                    >
                      {CLASSIFICATION_META[transaction.classification]?.label}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-500">{formatDate(transaction.date)}</td>
                  <td className="px-5 py-4 text-right">
                    <SignedAmount transaction={transaction} />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end">
                      <ActionButtons
                        transaction={transaction}
                        onEdit={onEdit}
                        onView={onView}
                        onDelete={onDelete}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile: cards */}
          <div className="divide-y divide-slate-100 md:hidden">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="flex items-start justify-between gap-3 px-4 py-4">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-800">
                    {transaction.description || '—'}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {transaction.category?.name ? `${transaction.category.name} · ` : ''}
                    {formatDate(transaction.date)}
                  </p>
                  <span
                    className={cn(
                      'mt-2 inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold',
                      CLASSIFICATION_BADGE[transaction.classification],
                    )}
                  >
                    {CLASSIFICATION_META[transaction.classification]?.label}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <SignedAmount transaction={transaction} />
                  <ActionButtons
                    transaction={transaction}
                    onEdit={onEdit}
                    onView={onView}
                    onDelete={onDelete}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
