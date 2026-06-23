'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Modal } from '@/shared/components/Modal';
import type { Category } from '@/features/categories/services/category.service';
import { budgetSchema, type BudgetFormValues } from '../schemas/budget.schema';
import { MONTH_LABELS, type Budget } from '../types';

type Props = {
  open: boolean;
  mode: 'create' | 'edit';
  budget?: Budget | null;
  categories: Category[];
  defaultCurrency: string;
  defaultMonth: number;
  defaultYear: number;
  years: number[];
  serverError?: string | null;
  onClose: () => void;
  onSubmit: (values: BudgetFormValues) => Promise<void>;
};

const CURRENCIES = ['DOP', 'USD', 'EUR'] as const;

const normalizeCurrency = (currency: string): (typeof CURRENCIES)[number] =>
  (CURRENCIES as readonly string[]).includes(currency)
    ? (currency as (typeof CURRENCIES)[number])
    : 'DOP';

const inputClass =
  'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100';

export function BudgetFormModal({
  open,
  mode,
  budget,
  categories,
  defaultCurrency,
  defaultMonth,
  defaultYear,
  years,
  serverError,
  onClose,
  onSubmit,
}: Props) {
  const isEdit = mode === 'edit';

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      categoryId: '',
      month: defaultMonth,
      year: defaultYear,
      amountLimit: undefined,
      currency: normalizeCurrency(defaultCurrency),
      alertThresholdPct: 80,
    } as unknown as BudgetFormValues,
  });

  useEffect(() => {
    if (!open) return;
    if (isEdit && budget) {
      reset({
        categoryId: budget.categoryId ?? '',
        month: budget.month,
        year: budget.year,
        amountLimit: budget.amountLimit as unknown as BudgetFormValues['amountLimit'],
        currency: normalizeCurrency(budget.currency),
        alertThresholdPct: budget.alertThresholdPct as unknown as BudgetFormValues['alertThresholdPct'],
      } as unknown as BudgetFormValues);
    } else {
      reset({
        categoryId: '',
        month: defaultMonth,
        year: defaultYear,
        amountLimit: undefined,
        currency: normalizeCurrency(defaultCurrency),
        alertThresholdPct: 80,
      } as unknown as BudgetFormValues);
    }
  }, [open, isEdit, budget, defaultCurrency, defaultMonth, defaultYear, reset]);

  const submit = handleSubmit(async (values) => {
    await onSubmit(values);
  });

  return (
    <Modal
      open={open}
      title={isEdit ? 'Editar presupuesto' : 'Nuevo presupuesto'}
      description="Define un límite de gasto mensual por categoría."
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="budget-category" className="mb-1.5 block text-sm font-semibold text-slate-800">
            Categoría de gasto
          </label>
          {isEdit ? (
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-600">
              {budget?.category?.name ?? 'Categoría'}
            </p>
          ) : (
            <select id="budget-category" className={inputClass} {...register('categoryId')}>
              <option value="">Selecciona una categoría</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          )}
          {!isEdit && errors.categoryId ? (
            <p className="mt-1 text-xs font-medium text-rose-600">{errors.categoryId.message}</p>
          ) : null}
          {!isEdit && categories.length === 0 ? (
            <p className="mt-1 text-xs font-medium text-amber-600">
              No hay categorías de gasto disponibles. Crea transacciones para generarlas.
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="budget-month" className="mb-1.5 block text-sm font-semibold text-slate-800">
              Mes
            </label>
            {isEdit ? (
              <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-600">
                {MONTH_LABELS[(budget?.month ?? 1) - 1]}
              </p>
            ) : (
              <select id="budget-month" className={inputClass} {...register('month')}>
                {MONTH_LABELS.map((label, index) => (
                  <option key={label} value={index + 1}>
                    {label}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label htmlFor="budget-year" className="mb-1.5 block text-sm font-semibold text-slate-800">
              Año
            </label>
            {isEdit ? (
              <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-600">
                {budget?.year}
              </p>
            ) : (
              <select id="budget-year" className={inputClass} {...register('year')}>
                {years.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="budget-limit" className="mb-1.5 block text-sm font-semibold text-slate-800">
              Límite
            </label>
            <input
              id="budget-limit"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              className={inputClass}
              {...register('amountLimit')}
            />
            {errors.amountLimit ? (
              <p className="mt-1 text-xs font-medium text-rose-600">{errors.amountLimit.message}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="budget-currency" className="mb-1.5 block text-sm font-semibold text-slate-800">
              Moneda
            </label>
            <select id="budget-currency" className={inputClass} {...register('currency')}>
              {CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="budget-threshold" className="mb-1.5 block text-sm font-semibold text-slate-800">
            Umbral de alerta (%)
          </label>
          <input
            id="budget-threshold"
            type="number"
            min="1"
            max="100"
            step="1"
            placeholder="80"
            className={inputClass}
            {...register('alertThresholdPct')}
          />
          {errors.alertThresholdPct ? (
            <p className="mt-1 text-xs font-medium text-rose-600">{errors.alertThresholdPct.message}</p>
          ) : (
            <p className="mt-1 text-xs text-slate-400">
              Te avisaremos cuando el gasto alcance este porcentaje del límite.
            </p>
          )}
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
            disabled={isSubmitting || (!isEdit && categories.length === 0)}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-indigo-600/25 transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isEdit ? 'Guardar cambios' : 'Crear presupuesto'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
