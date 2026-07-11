'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Plus } from 'lucide-react';
import { Modal } from '@/shared/components/Modal';
import type { Category } from '@/features/categories/services/category.service';
import {
  transactionSchema,
  TRANSACTION_CLASSIFICATIONS,
  TRANSACTION_RECURRENCE_FREQUENCIES,
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
  onCreateCategory?: (payload: {
    name: string;
    type: 'income' | 'expense';
    classification: TransactionClassification;
  }) => Promise<Category>;
};

const CURRENCIES = ['DOP', 'USD', 'EUR'] as const;

const RECURRENCE_LABELS: Record<(typeof TRANSACTION_RECURRENCE_FREQUENCIES)[number], string> = {
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
  yearly: 'Anual',
};

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
  onCreateCategory,
}: Props) {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [creatingCategory, setCreatingCategory] = useState(false);
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
      isRecurring: false,
      recurrenceFrequency: undefined,
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
        isRecurring: initialValues?.isRecurring ?? false,
        recurrenceFrequency: initialValues?.recurrenceFrequency,
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
        isRecurring: transaction.isRecurring ?? false,
        recurrenceFrequency: transaction.recurrenceFrequency ?? undefined,
      } as unknown as TransactionFormValues);
    } else {
      reset(getCreateValues());
    }
  }, [open, mode, transaction, getCreateValues, reset]);

  const classification = watch('classification');
  const isRecurring = watch('isRecurring');
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

  const createCategory = async () => {
    if (!classification || !selectedType || !onCreateCategory) return;
    const name = newCategoryName.trim();
    if (name.length < 2) {
      setCategoryError('Escribe un nombre de al menos 2 caracteres.');
      return;
    }

    setCreatingCategory(true);
    setCategoryError(null);
    try {
      const category = await onCreateCategory({
        name,
        type: selectedType,
        classification,
      });
      setValue('categoryId', category.id);
      setNewCategoryName('');
    } catch (error) {
      const maybe = error as { response?: { data?: { message?: string | string[] } } };
      const message = maybe.response?.data?.message;
      setCategoryError(Array.isArray(message) ? message[0] : message ?? 'No se pudo crear la categoría.');
    } finally {
      setCreatingCategory(false);
    }
  };

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
      isRecurring: values.isRecurring,
      recurrenceFrequency: values.isRecurring ? values.recurrenceFrequency : undefined,
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

        {onCreateCategory ? (
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-3">
            <p className="text-xs font-bold text-indigo-700">Crear categoría personalizada</p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
                placeholder="Ej. Mascotas, delivery, inversiones..."
                className="h-11 min-w-0 flex-1 rounded-xl border border-indigo-100 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              />
              <button
                type="button"
                onClick={() => void createCategory()}
                disabled={creatingCategory || !classification}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-black text-white transition hover:bg-indigo-700 disabled:opacity-60"
              >
                {creatingCategory ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Crear
              </button>
            </div>
            <p className="mt-2 text-xs font-semibold text-indigo-600">
              Se creará para la clasificación seleccionada arriba.
            </p>
            {categoryError ? <p className="mt-2 text-xs font-bold text-rose-600">{categoryError}</p> : null}
          </div>
        ) : null}

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

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <label className="flex items-start gap-3 text-sm font-bold text-slate-800">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              {...register('isRecurring')}
            />
            <span>
              Movimiento recurrente
              <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">
                Úsalo para gastos o ingresos que se repiten, como renta, suscripciones, salario o cuotas.
              </span>
            </span>
          </label>
          {isRecurring ? (
            <div className="mt-3">
              <label htmlFor="recurrenceFrequency" className="mb-1.5 block text-sm font-semibold text-slate-800">
                Frecuencia
              </label>
              <select
                id="recurrenceFrequency"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                {...register('recurrenceFrequency')}
              >
                <option value="">Selecciona una frecuencia</option>
                {TRANSACTION_RECURRENCE_FREQUENCIES.map((frequency) => (
                  <option key={frequency} value={frequency}>
                    {RECURRENCE_LABELS[frequency]}
                  </option>
                ))}
              </select>
              {errors.recurrenceFrequency ? (
                <p className="mt-1 text-xs font-medium text-rose-600">{errors.recurrenceFrequency.message}</p>
              ) : null}
            </div>
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
