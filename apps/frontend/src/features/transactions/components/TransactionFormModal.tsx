'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Modal } from '@/shared/components/Modal';
import type { Category } from '@/features/categories/services/category.service';
import {
  transactionSchema,
  TRANSACTION_CLASSIFICATIONS,
  type TransactionFormValues,
} from '../schemas/transaction.schema';
import {
  CLASSIFICATION_META,
  CLASSIFICATION_TO_TYPE,
  type CreateTransactionPayload,
  type Transaction,
  type TransactionClassification,
} from '../types';

type Props = {
  open: boolean;
  mode: 'create' | 'edit';
  transaction?: Transaction | null;
  initialValues?: Partial<TransactionFormValues>;
  categories: Category[];
  defaultCurrency: string;
  serverError?: string | null;
  onClose: () => void;
  onSubmit: (payload: CreateTransactionPayload) => Promise<void>;
};

const CURRENCIES = ['DOP', 'USD', 'EUR'] as const;

const todayString = (): string => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate(),
  ).padStart(2, '0')}`;
};

const normalizeCurrency = (currency: string): (typeof CURRENCIES)[number] =>
  (CURRENCIES as readonly string[]).includes(currency)
    ? (currency as (typeof CURRENCIES)[number])
    : 'DOP';

const PREFERRED_CATEGORY_NAMES: Partial<Record<TransactionClassification, string[]>> = {
  regular_income: ['salario'],
  extra_income: ['ingreso extra', 'otros ingresos', 'freelance', 'bono'],
};

export function TransactionFormModal({
  open,
  mode,
  transaction,
  initialValues,
  categories,
  defaultCurrency,
  serverError,
  onClose,
  onSubmit,
}: Props) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      classification: 'variable_expense',
      amount: undefined,
      currency: normalizeCurrency(defaultCurrency),
      date: todayString(),
      categoryId: undefined,
      description: '',
      notes: '',
    } as unknown as TransactionFormValues,
  });

  const getCreateValues = useCallback(
    (): TransactionFormValues =>
      ({
        classification: initialValues?.classification ?? 'variable_expense',
        amount: initialValues?.amount,
        currency: normalizeCurrency(initialValues?.currency ?? defaultCurrency),
        date: initialValues?.date ?? todayString(),
        categoryId: initialValues?.categoryId,
        description: initialValues?.description ?? '',
        notes: initialValues?.notes ?? '',
      }) as unknown as TransactionFormValues,
    [defaultCurrency, initialValues],
  );

  useEffect(() => {
    if (open && mode === 'edit' && transaction) {
      reset({
        classification: transaction.classification,
        amount: Number(transaction.amount) as unknown as TransactionFormValues['amount'],
        currency: normalizeCurrency(transaction.currency),
        date: transaction.date,
        categoryId: transaction.categoryId ?? undefined,
        description: transaction.description ?? '',
        notes: transaction.notes ?? '',
      } as unknown as TransactionFormValues);
    } else {
      reset(getCreateValues());
    }
  }, [open, mode, transaction, getCreateValues, reset]);

  const classification = watch('classification');
  const selectedType = classification ? CLASSIFICATION_TO_TYPE[classification] : undefined;

  const visibleCategories = useMemo(
    () =>
      categories.filter(
        (category) =>
          (!selectedType || category.type === selectedType) &&
          (!classification || !category.classification || category.classification === classification),
      ),
    [categories, classification, selectedType],
  );

  useEffect(() => {
    if (mode === 'edit' || !classification || !['regular_income', 'extra_income'].includes(classification)) {
      return;
    }

    const preferredNames = PREFERRED_CATEGORY_NAMES[classification] ?? [];
    const preferred =
      visibleCategories.find((category) =>
        preferredNames.some((name) => category.name.toLowerCase().includes(name)),
      ) ?? visibleCategories[0];

    if (preferred) setValue('categoryId', preferred.id);
  }, [classification, mode, setValue, visibleCategories]);

  // Si la categoría seleccionada ya no corresponde al tipo, se limpia.
  const currentCategoryId = watch('categoryId');
  useEffect(() => {
    if (!currentCategoryId) return;
    const stillValid = visibleCategories.some((category) => category.id === currentCategoryId);
    if (!stillValid) setValue('categoryId', undefined);
  }, [visibleCategories, currentCategoryId, setValue]);

  const submit = handleSubmit(async (values) => {
    const payload: CreateTransactionPayload = {
      classification: values.classification,
      amount: Number(values.amount),
      currency: values.currency,
      date: values.date,
      categoryId: values.categoryId,
      description: values.description,
      notes: values.notes,
    };

    await onSubmit(payload);

    if (mode === 'create') {
      reset(getCreateValues());
    }
  });

  return (
    <Modal
      open={open}
      title={mode === 'create' ? 'Nueva transacción' : 'Editar transacción'}
      description="Registra un ingreso o gasto de tus finanzas personales."
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="classification" className="mb-1.5 block text-sm font-semibold text-slate-800">
            Clasificación
          </label>
          <select
            id="classification"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            {...register('classification')}
          >
            {TRANSACTION_CLASSIFICATIONS.map((value) => (
              <option key={value} value={value}>
                {CLASSIFICATION_META[value].label}
              </option>
            ))}
          </select>
          {errors.classification ? (
            <p className="mt-1 text-xs font-medium text-rose-600">{errors.classification.message}</p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="amount" className="mb-1.5 block text-sm font-semibold text-slate-800">
              Monto
            </label>
            <input
              id="amount"
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
            <label htmlFor="currency" className="mb-1.5 block text-sm font-semibold text-slate-800">
              Moneda
            </label>
            <select
              id="currency"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              {...register('currency')}
            >
              {CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
            {errors.currency ? (
              <p className="mt-1 text-xs font-medium text-rose-600">{errors.currency.message}</p>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="date" className="mb-1.5 block text-sm font-semibold text-slate-800">
              Fecha
            </label>
            <input
              id="date"
              type="date"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              {...register('date')}
            />
            {errors.date ? (
              <p className="mt-1 text-xs font-medium text-rose-600">{errors.date.message}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="categoryId" className="mb-1.5 block text-sm font-semibold text-slate-800">
              Categoría
            </label>
            <select
              id="categoryId"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              {...register('categoryId')}
            >
              <option value="">Sin categoría</option>
              {visibleCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {errors.categoryId ? (
              <p className="mt-1 text-xs font-medium text-rose-600">{errors.categoryId.message}</p>
            ) : null}
          </div>
        </div>

        <div>
          <label htmlFor="description" className="mb-1.5 block text-sm font-semibold text-slate-800">
            Descripción <span className="text-rose-500">*</span>
          </label>
          <input
            id="description"
            type="text"
            placeholder="Ej. Supermercado, salario, renta..."
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            {...register('description')}
          />
          {errors.description ? (
            <p className="mt-1 text-xs font-medium text-rose-600">{errors.description.message}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="notes" className="mb-1.5 block text-sm font-semibold text-slate-800">
            Notas <span className="font-normal text-slate-400">(opcional)</span>
          </label>
          <textarea
            id="notes"
            rows={2}
            placeholder="Detalle adicional"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            {...register('notes')}
          />
          {errors.notes ? (
            <p className="mt-1 text-xs font-medium text-rose-600">{errors.notes.message}</p>
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
            {mode === 'create' ? 'Crear transacción' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
