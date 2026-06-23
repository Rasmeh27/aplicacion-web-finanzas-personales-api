'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Modal } from '@/shared/components/Modal';
import { formatCurrency } from '@/shared/utils/format-currency';
import { contributionSchema, type ContributionFormValues } from '../schemas/goal.schema';
import type { CreateContributionPayload, FinancialGoal } from '../types';

type Props = {
  open: boolean;
  goal: FinancialGoal | null;
  serverError?: string | null;
  onClose: () => void;
  onSubmit: (payload: CreateContributionPayload) => Promise<void>;
};

const todayString = (): string => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate(),
  ).padStart(2, '0')}`;
};

export function ContributionModal({ open, goal, serverError, onClose, onSubmit }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContributionFormValues>({
    resolver: zodResolver(contributionSchema),
    defaultValues: {
      amount: undefined,
      contributionDate: todayString(),
      note: '',
    } as unknown as ContributionFormValues,
  });

  useEffect(() => {
    if (!open) return;
    reset({
      amount: undefined,
      contributionDate: todayString(),
      note: '',
    } as unknown as ContributionFormValues);
  }, [open, reset]);

  const submit = handleSubmit(async (values) => {
    await onSubmit({
      amount: Number(values.amount),
      contributionDate: values.contributionDate,
      note: values.note,
    });
  });

  const remaining = goal
    ? Math.max(Number(goal.targetAmount) - Number(goal.currentAmount), 0)
    : 0;

  return (
    <Modal
      open={open}
      title="Agregar fondos"
      description={goal ? `Aporte a "${goal.name}"` : undefined}
      onClose={onClose}
    >
      {goal ? (
        <p className="mb-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Falta {formatCurrency(remaining, goal.currency)} para completar esta meta.
        </p>
      ) : null}

      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="contribution-amount" className="mb-1.5 block text-sm font-semibold text-slate-800">
            Monto
          </label>
          <input
            id="contribution-amount"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            {...register('amount')}
          />
          {errors.amount ? (
            <p className="mt-1 text-xs font-medium text-rose-600">{errors.amount.message}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="contribution-date" className="mb-1.5 block text-sm font-semibold text-slate-800">
            Fecha
          </label>
          <input
            id="contribution-date"
            type="date"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            {...register('contributionDate')}
          />
          {errors.contributionDate ? (
            <p className="mt-1 text-xs font-medium text-rose-600">{errors.contributionDate.message}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="contribution-note" className="mb-1.5 block text-sm font-semibold text-slate-800">
            Nota <span className="font-normal text-slate-400">(opcional)</span>
          </label>
          <input
            id="contribution-note"
            type="text"
            placeholder="Ej. Ahorro de la quincena"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            {...register('note')}
          />
          {errors.note ? (
            <p className="mt-1 text-xs font-medium text-rose-600">{errors.note.message}</p>
          ) : null}
        </div>

        {serverError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {serverError}
          </div>
        ) : null}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-indigo-600/25 transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Agregar fondos
          </button>
        </div>
      </form>
    </Modal>
  );
}
