'use client';

import { Archive, CalendarDays, Eye, Pencil, ShieldCheck, Trash2, WalletCards } from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { formatCurrency } from '@/shared/utils/format-currency';
import { GOAL_STATUS_META, type FinancialGoal } from '../types';

type Props = {
  goal: FinancialGoal;
  onAddFunds: (goal: FinancialGoal) => void;
  onView: (goal: FinancialGoal) => void;
  onEdit: (goal: FinancialGoal) => void;
  onMarkInactive: (goal: FinancialGoal) => void;
  onDelete: (goal: FinancialGoal) => void;
};

const formatDate = (value: string): string => {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-DO', { day: '2-digit', month: 'long', year: 'numeric' }).format(
    date,
  );
};

export function GoalCard({ goal, onAddFunds, onView, onEdit, onMarkInactive, onDelete }: Props) {
  const target = Number(goal.targetAmount);
  const current = Number(goal.currentAmount);
  const remaining = Math.max(target - current, 0);
  const pct = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
  const statusMeta = GOAL_STATUS_META[goal.status];
  const canContribute = goal.status === 'active' || goal.status === 'paused';
  const canMarkInactive = !goal.isDefault && goal.status !== 'cancelled';

  return (
    <div
      className={cn(
        'flex flex-col rounded-3xl border bg-white p-6 shadow-sm transition',
        goal.isDefault ? 'border-indigo-200 ring-1 ring-indigo-100' : 'border-slate-200',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-black tracking-tight text-slate-950">
              {goal.name}
            </h3>
            {goal.isDefault ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
                <ShieldCheck className="h-3 w-3" />
                Predeterminada
              </span>
            ) : null}
          </div>
          <span
            className={cn(
              'mt-2 inline-block rounded-full px-2.5 py-1 text-xs font-semibold',
              statusMeta.badge,
            )}
          >
            {statusMeta.label}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onView(goal)}
            aria-label="Ver detalle de la meta"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-indigo-200 hover:text-indigo-600"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onEdit(goal)}
            aria-label="Editar meta"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-indigo-200 hover:text-indigo-600"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(goal)}
            aria-label="Eliminar meta"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-rose-200 hover:text-rose-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-end justify-between">
          <p className="text-2xl font-black tracking-tight text-slate-950">
            {formatCurrency(current, goal.currency)}
          </p>
          <p className="text-sm font-semibold text-slate-400">
            / {formatCurrency(target, goal.currency)}
          </p>
        </div>

        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="mt-2 flex items-center justify-between text-xs font-semibold">
          <span className="text-indigo-600">{pct}% completado</span>
          <span className="text-slate-500">Faltan {formatCurrency(remaining, goal.currency)}</span>
        </div>
      </div>

      {goal.targetDate ? (
        <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-500">
          <CalendarDays className="h-3.5 w-3.5" />
          Meta para {formatDate(goal.targetDate)}
        </p>
      ) : null}

      <div className="mt-5 flex-1" />

      <div className="mt-2 grid gap-2">
        <button
          type="button"
          onClick={() => onAddFunds(goal)}
          disabled={!canContribute}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-indigo-600/25 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <WalletCards className="h-4 w-4" />
          Gestionar fondos
        </button>
        {canMarkInactive ? (
          <button
            type="button"
            onClick={() => onMarkInactive(goal)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700"
          >
            <Archive className="h-4 w-4" />
            Pasar a inactiva
          </button>
        ) : null}
      </div>
    </div>
  );
}
