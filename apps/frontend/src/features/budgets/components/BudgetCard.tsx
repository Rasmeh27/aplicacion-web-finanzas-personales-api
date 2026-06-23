'use client';

import { Pencil, Power, RotateCcw, Tag } from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { formatCurrency } from '@/shared/utils/format-currency';
import { BUDGET_STATUS_META, MONTH_LABELS, type Budget } from '../types';
import { BudgetProgressBar } from './BudgetProgressBar';

type Props = {
  budget: Budget;
  onEdit: (budget: Budget) => void;
  onDeactivate: (budget: Budget) => void;
  onReactivate: (budget: Budget) => void;
};

export function BudgetCard({ budget, onEdit, onDeactivate, onReactivate }: Props) {
  const statusMeta = BUDGET_STATUS_META[budget.status];
  const monthLabel = MONTH_LABELS[budget.month - 1] ?? `Mes ${budget.month}`;
  const isExceeded = budget.remainingAmount < 0;

  return (
    <div
      className={cn(
        'flex flex-col rounded-3xl border bg-white p-6 shadow-sm transition',
        budget.isActive ? 'border-slate-200' : 'border-slate-200 opacity-70',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Tag className="h-4 w-4" />
            </span>
            <h3 className="truncate text-base font-black tracking-tight text-slate-950">
              {budget.category?.name ?? 'Categoría'}
            </h3>
          </div>
          <p className="mt-1.5 text-xs font-medium text-slate-500">
            {monthLabel} {budget.year}
          </p>
        </div>
        <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', statusMeta.badge)}>
          {budget.isActive ? statusMeta.label : 'Inactivo'}
        </span>
      </div>

      <div className="mt-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Gastado</p>
            <p className="text-2xl font-black tracking-tight text-slate-950">
              {formatCurrency(budget.spentAmount, budget.currency)}
            </p>
          </div>
          <p className="text-sm font-semibold text-slate-400">
            / {formatCurrency(budget.amountLimit, budget.currency)}
          </p>
        </div>

        <div className="mt-3">
          <BudgetProgressBar usagePct={budget.usagePct} status={budget.status} />
        </div>

        <p className="mt-3 text-sm font-semibold">
          {isExceeded ? (
            <span className="text-rose-600">
              Excedido por {formatCurrency(Math.abs(budget.remainingAmount), budget.currency)}
            </span>
          ) : (
            <span className="text-slate-600">
              Disponible {formatCurrency(budget.remainingAmount, budget.currency)}
            </span>
          )}
        </p>
      </div>

      <div className="mt-5 flex-1" />

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onEdit(budget)}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <Pencil className="h-4 w-4" />
          Editar
        </button>
        {budget.isActive ? (
          <button
            type="button"
            onClick={() => onDeactivate(budget)}
            aria-label="Desactivar presupuesto"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-600 transition hover:border-rose-200 hover:bg-rose-50"
          >
            <Power className="h-4 w-4" />
            Desactivar
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onReactivate(budget)}
            aria-label="Reactivar presupuesto"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-600 transition hover:border-emerald-200 hover:bg-emerald-50"
          >
            <RotateCcw className="h-4 w-4" />
            Reactivar
          </button>
        )}
      </div>
    </div>
  );
}
