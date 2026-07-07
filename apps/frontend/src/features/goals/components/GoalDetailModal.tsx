'use client';

import { CalendarDays, Loader2, StickyNote } from 'lucide-react';
import { Modal } from '@/shared/components/Modal';
import { formatCurrency } from '@/shared/utils/format-currency';
import { GOAL_STATUS_META, type FinancialGoal, type GoalContribution } from '../types';

type Props = {
  open: boolean;
  goal: FinancialGoal | null;
  contributions: GoalContribution[];
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
};

const formatDate = (value?: string | null): string => {
  if (!value) return 'Sin fecha';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-DO', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
};

export function GoalDetailModal({ open, goal, contributions, loading = false, error, onClose }: Props) {
  const target = goal ? Number(goal.targetAmount) : 0;
  const current = goal ? Number(goal.currentAmount) : 0;
  const progress = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
  const statusMeta = goal ? GOAL_STATUS_META[goal.status] : null;

  return (
    <Modal
      open={open}
      title={goal?.name ?? 'Detalle de la meta'}
      description="Consulta los datos, fechas, notas y aportes registrados."
      onClose={onClose}
    >
      {goal ? (
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-black text-slate-950">
                {formatCurrency(current, goal.currency)} / {formatCurrency(target, goal.currency)}
              </span>
              {statusMeta ? (
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusMeta.badge}`}>
                  {statusMeta.label}
                </span>
              ) : null}
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white">
              <div className="h-full rounded-full bg-indigo-600" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <p className="flex items-center gap-2 text-slate-600">
                <CalendarDays className="h-4 w-4 text-indigo-500" />
                Fecha objetivo: {formatDate(goal.targetDate)}
              </p>
              <p className="flex items-center gap-2 text-slate-600">
                <CalendarDays className="h-4 w-4 text-indigo-500" />
                Creada: {formatDate(goal.createdAt?.slice(0, 10))}
              </p>
            </div>
          </div>

          <section>
            <h3 className="text-sm font-black text-slate-950">Historial de aportes</h3>
            {loading ? (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                Cargando aportes...
              </div>
            ) : error ? (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                {error}
              </div>
            ) : contributions.length === 0 ? (
              <div className="mt-3 rounded-xl border border-dashed border-slate-200 px-4 py-5 text-center text-sm text-slate-500">
                Esta meta todavía no tiene aportes registrados.
              </div>
            ) : (
              <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
                {contributions.map((contribution) => (
                  <article key={contribution.id} className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-slate-950">
                          {formatCurrency(Number(contribution.amount), contribution.currency)}
                        </p>
                        <p className="mt-0.5 text-xs font-semibold text-slate-400">
                          {formatDate(contribution.contributionDate)}
                        </p>
                      </div>
                      {contribution.note ? (
                        <p className="flex max-w-[60%] items-start gap-1.5 text-xs text-slate-500">
                          <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-500" />
                          {contribution.note}
                        </p>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}
    </Modal>
  );
}
