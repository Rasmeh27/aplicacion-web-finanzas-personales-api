'use client';

import { RotateCcw } from 'lucide-react';
import type { Category } from '@/features/categories/services/category.service';
import { MONTH_LABELS } from '../types';

export type BudgetStatusFilter = 'all' | 'safe' | 'warning' | 'exceeded';

type Props = {
  month?: number;
  year?: number;
  categoryId?: string;
  statusFilter: BudgetStatusFilter;
  includeInactive: boolean;
  categories: Category[];
  years: number[];
  onMonthChange: (month?: number) => void;
  onYearChange: (year?: number) => void;
  onCategoryChange: (categoryId?: string) => void;
  onStatusChange: (status: BudgetStatusFilter) => void;
  onIncludeInactiveChange: (include: boolean) => void;
  onReset: () => void;
  onShowAll: () => void;
};

const STATUS_OPTIONS: { value: BudgetStatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'safe', label: 'En control' },
  { value: 'warning', label: 'Cerca del límite' },
  { value: 'exceeded', label: 'Excedidos' },
];

const selectClass =
  'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100';

export function BudgetFilters({
  month,
  year,
  categoryId,
  statusFilter,
  includeInactive,
  categories,
  years,
  onMonthChange,
  onYearChange,
  onCategoryChange,
  onStatusChange,
  onIncludeInactiveChange,
  onReset,
  onShowAll,
}: Props) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">Mes</label>
          <select
            className={selectClass}
            value={month ?? ''}
            onChange={(event) =>
              onMonthChange(event.target.value ? Number(event.target.value) : undefined)
            }
          >
            <option value="">Todos los meses</option>
            {MONTH_LABELS.map((label, index) => (
              <option key={label} value={index + 1}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">Año</label>
          <select
            className={selectClass}
            value={year ?? ''}
            onChange={(event) =>
              onYearChange(event.target.value ? Number(event.target.value) : undefined)
            }
          >
            <option value="">Todos los años</option>
            {years.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">Categoría</label>
          <select
            className={selectClass}
            value={categoryId ?? ''}
            onChange={(event) => onCategoryChange(event.target.value || undefined)}
          >
            <option value="">Todas las categorías</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">Estado</label>
          <select
            className={selectClass}
            value={statusFilter}
            onChange={(event) => onStatusChange(event.target.value as BudgetStatusFilter)}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-600">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(event) => onIncludeInactiveChange(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          Mostrar presupuestos inactivos
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onShowAll}
            className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100"
          >
            Mostrar todos
          </button>
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
    </div>
  );
}
