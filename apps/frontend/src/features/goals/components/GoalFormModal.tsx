'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Modal } from '@/shared/components/Modal';
import { goalSchema, type GoalFormValues } from '../schemas/goal.schema';

export type GoalFormPayload = {
  name: string;
  targetAmount: number;
  currentAmount?: number;
  currency: 'DOP' | 'USD' | 'EUR';
  targetDate?: string;
};

export type GoalFormInitialValues = {
  name?: string;
  targetAmount?: number;
  currentAmount?: number;
  currency?: string;
  targetDate?: string;
};

type Props = {
  open: boolean;
  title: string;
  description?: string;
  submitLabel: string;
  lockName?: boolean;
  initialValues?: GoalFormInitialValues;
  defaultCurrency: string;
  serverError?: string | null;
  onClose: () => void;
  onSubmit: (payload: GoalFormPayload) => Promise<void>;
};

const CURRENCIES = ['DOP', 'USD', 'EUR'] as const;

const normalizeCurrency = (currency: string): (typeof CURRENCIES)[number] =>
  (CURRENCIES as readonly string[]).includes(currency)
    ? (currency as (typeof CURRENCIES)[number])
    : 'DOP';

export function GoalFormModal({
  open,
  title,
  description,
  submitLabel,
  lockName = false,
  initialValues,
  defaultCurrency,
  serverError,
  onClose,
  onSubmit,
}: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      name: '',
      targetAmount: undefined,
      currentAmount: undefined,
      currency: normalizeCurrency(defaultCurrency),
      targetDate: undefined,
    } as unknown as GoalFormValues,
  });

  useEffect(() => {
    if (!open) return;
    reset({
      name: initialValues?.name ?? '',
      targetAmount: (initialValues?.targetAmount ?? undefined) as GoalFormValues['targetAmount'],
      currentAmount: (initialValues?.currentAmount ?? undefined) as GoalFormValues['currentAmount'],
      currency: normalizeCurrency(initialValues?.currency ?? defaultCurrency),
      targetDate: initialValues?.targetDate ?? undefined,
    } as unknown as GoalFormValues);
  }, [open, initialValues, defaultCurrency, reset]);

  const submit = handleSubmit(async (values) => {
    await onSubmit({
      name: values.name.trim(),
      targetAmount: Number(values.targetAmount),
      currentAmount: values.currentAmount === undefined ? undefined : Number(values.currentAmount),
      currency: values.currency,
      targetDate: values.targetDate,
    });
  });

  return (
    <Modal open={open} title={title} description={description} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="goal-name" className="mb-1.5 block text-sm font-semibold text-slate-800">
            Nombre
          </label>
          <input
            id="goal-name"
            type="text"
            readOnly={lockName}
            placeholder="Ej. Viaje, Laptop, Fondo de emergencia"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 read-only:bg-slate-50 read-only:text-slate-500"
            {...register('name')}
          />
          {errors.name ? (
            <p className="mt-1 text-xs font-medium text-rose-600">{errors.name.message}</p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="goal-target" className="mb-1.5 block text-sm font-semibold text-slate-800">
              Monto objetivo
            </label>
            <input
              id="goal-target"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              {...register('targetAmount')}
            />
            {errors.targetAmount ? (
              <p className="mt-1 text-xs font-medium text-rose-600">{errors.targetAmount.message}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="goal-current" className="mb-1.5 block text-sm font-semibold text-slate-800">
              Monto actual <span className="font-normal text-slate-400">(opcional)</span>
            </label>
            <input
              id="goal-current"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              {...register('currentAmount')}
            />
            {errors.currentAmount ? (
              <p className="mt-1 text-xs font-medium text-rose-600">{errors.currentAmount.message}</p>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="goal-currency" className="mb-1.5 block text-sm font-semibold text-slate-800">
              Moneda
            </label>
            <select
              id="goal-currency"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              {...register('currency')}
            >
              {CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="goal-date" className="mb-1.5 block text-sm font-semibold text-slate-800">
              Fecha objetivo <span className="font-normal text-slate-400">(opcional)</span>
            </label>
            <input
              id="goal-date"
              type="date"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              {...register('targetDate')}
            />
            {errors.targetDate ? (
              <p className="mt-1 text-xs font-medium text-rose-600">{errors.targetDate.message}</p>
            ) : null}
          </div>
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
            {submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
