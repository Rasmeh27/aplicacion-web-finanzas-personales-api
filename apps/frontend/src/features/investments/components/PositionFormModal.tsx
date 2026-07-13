'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Search } from 'lucide-react';
import { Modal } from '@/shared/components/Modal';
import { useTranslation } from '@/shared/i18n/useTranslation';
import { cn } from '@/shared/utils/cn';
import { investmentsService } from '../services/investments.service';
import { buildPositionSchema, type PositionFormValues } from '../schemas/position.schema';
import type { CreatePositionPayload, EnrichedPosition, MarketSymbol } from '../types';

type PositionFormModalProps = {
  open: boolean;
  mode: 'create' | 'edit';
  position?: EnrichedPosition | null;
  serverError?: string | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (values: CreatePositionPayload) => Promise<void>;
};

const inputClass =
  'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100';
const labelClass = 'mb-1.5 block text-sm font-semibold text-slate-800';
const errorClass = 'mt-1 text-xs font-medium text-rose-600';

/**
 * Modal de crear/editar posición (React Hook Form + Zod). En modo edición el
 * símbolo no es editable (el backend tampoco lo permite). El buscador consulta
 * /investments/symbols/search en el backend: la API key jamás toca el browser.
 */
export function PositionFormModal({
  open,
  mode,
  position,
  serverError,
  submitting,
  onClose,
  onSubmit,
}: PositionFormModalProps) {
  const { t } = useTranslation();
  const schema = useMemo(() => buildPositionSchema(t), [t]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<PositionFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { assetType: 'stock' },
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<MarketSymbol[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && position) {
      reset({
        symbol: position.symbol,
        assetType: position.assetType,
        quantity: position.quantity,
        averageCost: position.averageCost,
        purchaseDate: position.purchaseDate ?? undefined,
        notes: position.notes ?? undefined,
      });
    } else {
      reset({ assetType: 'stock', symbol: '', quantity: undefined, averageCost: undefined });
    }
    setSearchTerm('');
    setSearchResults([]);
    setSearchOpen(false);
  }, [open, mode, position, reset]);

  // Búsqueda de símbolos con debounce, siempre a través del backend.
  useEffect(() => {
    if (!open || mode === 'edit') return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const term = searchTerm.trim();
    if (term.length < 1) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    searchTimer.current = setTimeout(() => {
      investmentsService
        .searchSymbols(term)
        .then((response) => {
          setSearchResults(response.items);
          setSearchOpen(true);
        })
        .catch(() => setSearchResults([]))
        .finally(() => setSearchLoading(false));
    }, 350);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [searchTerm, open, mode]);

  const pickSymbol = (item: MarketSymbol) => {
    setValue('symbol', item.symbol, { shouldValidate: true });
    if (item.assetType === 'etf' || item.assetType === 'stock') {
      setValue('assetType', item.assetType);
    }
    setSearchOpen(false);
    setSearchTerm(`${item.symbol} — ${item.name}`);
  };

  const submit = handleSubmit(async (values) => {
    const payload: CreatePositionPayload = {
      symbol: values.symbol,
      assetType: values.assetType,
      quantity: values.quantity,
      averageCost: values.averageCost,
      ...(values.purchaseDate ? { purchaseDate: values.purchaseDate } : {}),
      ...(values.notes ? { notes: values.notes } : {}),
    };
    await onSubmit(payload);
  });

  return (
    <Modal
      open={open}
      title={mode === 'create' ? t('investments.form.createTitle') : t('investments.form.editTitle')}
      description={
        mode === 'create'
          ? t('investments.form.createDescription')
          : t('investments.form.editDescription')
      }
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        {mode === 'create' ? (
          <div className="relative">
            <label className={labelClass} htmlFor="position-symbol-search">
              {t('investments.form.symbol')}
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="position-symbol-search"
                type="text"
                autoComplete="off"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
                placeholder={t('investments.form.symbolSearchPlaceholder')}
                className={cn(inputClass, 'pl-9')}
              />
            </div>
            {searchOpen && (searchResults.length > 0 || searchLoading) ? (
              <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                {searchLoading ? (
                  <li className="flex items-center gap-2 px-3 py-2 text-xs text-slate-500">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {t('investments.form.searching')}
                  </li>
                ) : (
                  searchResults.map((item) => (
                    <li key={item.symbol}>
                      <button
                        type="button"
                        onClick={() => pickSymbol(item)}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition hover:bg-indigo-50"
                      >
                        <span className="font-bold text-slate-900">{item.symbol}</span>
                        <span className="flex-1 truncate text-xs text-slate-500">{item.name}</span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">
                          {item.assetType}
                        </span>
                      </button>
                    </li>
                  ))
                )}
                {!searchLoading && searchResults.length === 0 ? (
                  <li className="px-3 py-2 text-xs text-slate-500">
                    {t('investments.form.noResults')}
                  </li>
                ) : null}
              </ul>
            ) : null}

            <div className="mt-3">
              <label className={labelClass} htmlFor="position-symbol">
                {t('investments.form.selectedSymbol')}
              </label>
              <input
                id="position-symbol"
                type="text"
                autoComplete="off"
                {...register('symbol')}
                placeholder="AAPL"
                className={cn(inputClass, 'uppercase')}
              />
              {errors.symbol ? <p className={errorClass}>{errors.symbol.message}</p> : null}
            </div>
          </div>
        ) : (
          <div>
            <span className={labelClass}>{t('investments.form.symbol')}</span>
            <p className="flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-black text-slate-700">
              {position?.symbol}
            </p>
          </div>
        )}

        <div>
          <label className={labelClass} htmlFor="position-asset-type">
            {t('investments.form.assetType')}
          </label>
          <select id="position-asset-type" {...register('assetType')} className={inputClass}>
            <option value="stock">{t('investments.type.stock')}</option>
            <option value="etf">{t('investments.type.etf')}</option>
          </select>
          {errors.assetType ? <p className={errorClass}>{errors.assetType.message}</p> : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="position-quantity">
              {t('investments.form.quantity')}
            </label>
            <input
              id="position-quantity"
              type="number"
              step="any"
              min="0"
              inputMode="decimal"
              {...register('quantity')}
              className={inputClass}
            />
            {errors.quantity ? <p className={errorClass}>{errors.quantity.message}</p> : null}
          </div>
          <div>
            <label className={labelClass} htmlFor="position-average-cost">
              {t('investments.form.averageCost')}
            </label>
            <input
              id="position-average-cost"
              type="number"
              step="any"
              min="0"
              inputMode="decimal"
              {...register('averageCost')}
              className={inputClass}
            />
            {errors.averageCost ? <p className={errorClass}>{errors.averageCost.message}</p> : null}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="position-purchase-date">
              {t('investments.form.purchaseDate')}{' '}
              <span className="font-normal text-slate-400">({t('investments.form.optional')})</span>
            </label>
            <input
              id="position-purchase-date"
              type="date"
              {...register('purchaseDate')}
              className={inputClass}
            />
            {errors.purchaseDate ? (
              <p className={errorClass}>{errors.purchaseDate.message}</p>
            ) : null}
          </div>
          <div>
            <label className={labelClass} htmlFor="position-notes">
              {t('investments.form.notes')}{' '}
              <span className="font-normal text-slate-400">({t('investments.form.optional')})</span>
            </label>
            <input
              id="position-notes"
              type="text"
              maxLength={500}
              {...register('notes')}
              className={inputClass}
            />
            {errors.notes ? <p className={errorClass}>{errors.notes.message}</p> : null}
          </div>
        </div>

        {serverError ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-700">
            {serverError}
          </p>
        ) : null}

        <div className="flex justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
          >
            {t('investments.form.cancel')}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {mode === 'create' ? t('investments.form.create') : t('investments.form.save')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
