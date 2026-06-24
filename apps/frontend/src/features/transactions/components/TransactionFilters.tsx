'use client';

import { RotateCcw, Search } from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import type { Category } from '@/features/categories/services/category.service';
import type { TransactionClassification, TransactionFilters } from '../types';

type Props = {
  filters: TransactionFilters;
  categories: Category[];
  searchValue: string;
  onSearchChange: (value: string) => void;
  onChange: (next: Partial<TransactionFilters>) => void;
  onReset: () => void;
};

const CLASSIFICATION_CHIPS: { label: string; value?: TransactionClassification }[] = [
  { label: 'Todos', value: undefined },
  { label: 'Ingresos', value: 'regular_income' },
  { label: 'Ingresos extras', value: 'extra_income' },
  { label: 'Gastos fijos', value: 'fixed_expense' },
  { label: 'Gastos variables', value: 'variable_expense' },
];

export function TransactionFilters({
  filters,
  categories,
  searchValue,
  onSearchChange,
  onChange,
  onReset,
}: Props) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap gap-2">
        {CLASSIFICATION_CHIPS.map((chip) => {
          const active = filters.classification === chip.value;
          return (
            <button
              key={chip.label}
              type="button"
              onClick={() => onChange({ classification: chip.value, offset: 0 })}
              className={cn(
                'rounded-xl px-4 py-2 text-sm font-semibold transition',
                active
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/25'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
              )}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(260px,1.6fr)_minmax(170px,1fr)_minmax(150px,0.85fr)_minmax(150px,0.85fr)]">
        <div className="relative min-w-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar descripción o comercio"
            className="h-11 w-full min-w-0 truncate rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          />
        </div>

        <select
          value={filters.categoryId ?? ''}
          onChange={(event) => onChange({ categoryId: event.target.value || undefined, offset: 0 })}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
        >
          <option value="">Todas las categorías</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>

        <div>
          <label className="sr-only" htmlFor="filter-start-date">
            Desde
          </label>
          <input
            id="filter-start-date"
            type="date"
            value={filters.startDate ?? ''}
            onChange={(event) => onChange({ startDate: event.target.value || undefined, offset: 0 })}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          />
        </div>

        <div>
          <label className="sr-only" htmlFor="filter-end-date">
            Hasta
          </label>
          <input
            id="filter-end-date"
            type="date"
            value={filters.endDate ?? ''}
            onChange={(event) => onChange({ endDate: event.target.value || undefined, offset: 0 })}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          />
        </div>
      </div>

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
        >
          <RotateCcw className="h-4 w-4" />
          Limpiar filtros
        </button>
      </div>
    </div>
  );
}
