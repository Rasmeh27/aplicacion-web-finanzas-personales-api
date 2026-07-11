'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Plus, Wallet } from 'lucide-react';
import { useAuthStore } from '@/store/slices/auth.store';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { PageHeader } from '@/shared/components/PageHeader';
import {
  categoryService,
  type Category,
} from '@/features/categories/services/category.service';
import { TransactionFormModal } from '@/features/transactions/components/TransactionFormModal';
import { transactionService } from '@/features/transactions/services/transaction.service';
import type { CreateTransactionPayload } from '@/features/transactions/types';
import type { TransactionFormValues } from '@/features/transactions/schemas/transaction.schema';
import { budgetService } from '../services/budget.service';
import type { Budget, BudgetSummary } from '../types';
import type { BudgetFormValues } from '../schemas/budget.schema';
import { BudgetSummaryCards } from './BudgetSummaryCards';
import { BudgetFilters, type BudgetStatusFilter } from './BudgetFilters';
import { BudgetCard } from './BudgetCard';
import { BudgetFormModal } from './BudgetFormModal';

const getErrorMessage = (error: unknown, fallback: string): string => {
  const maybe = error as { response?: { data?: { message?: string | string[] } } };
  const message = maybe?.response?.data?.message;
  if (Array.isArray(message)) return message[0] ?? fallback;
  return message ?? fallback;
};

export function BudgetsView() {
  const user = useAuthStore((state) => state.user);
  const currency = user?.primaryCurrency ?? 'DOP';

  const now = useMemo(() => new Date(), []);
  const years = useMemo(() => {
    const current = now.getFullYear();
    return [current - 2, current - 1, current, current + 1];
  }, [now]);

  const [month, setMonth] = useState<number | undefined>(now.getMonth() + 1);
  const [year, setYear] = useState<number | undefined>(now.getFullYear());
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<BudgetStatusFilter>('all');
  const [includeInactive, setIncludeInactive] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editing, setEditing] = useState<Budget | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [budgetFormRevision, setBudgetFormRevision] = useState(0);

  const [deactivateTarget, setDeactivateTarget] = useState<Budget | null>(null);
  const [deactivating, setDeactivating] = useState(false);
  const [expenseBudget, setExpenseBudget] = useState<Budget | null>(null);
  const [expenseError, setExpenseError] = useState<string | null>(null);

  const refreshSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      setSummary(await budgetService.getBudgetSummary(month, year));
    } catch {
      // Resumen secundario: no bloquea la pantalla.
    } finally {
      setSummaryLoading(false);
    }
  }, [month, year]);

  const reload = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const response = await budgetService.getBudgets({
        month,
        year,
        categoryId,
        isActive: includeInactive ? undefined : true,
      });
      setBudgets(response.items);
    } catch (error) {
      setListError(getErrorMessage(error, 'No se pudieron cargar los presupuestos.'));
    } finally {
      setListLoading(false);
    }
  }, [month, year, categoryId, includeInactive]);

  const refreshAll = useCallback(async () => {
    await Promise.all([reload(), refreshSummary()]);
  }, [reload, refreshSummary]);

  useEffect(() => {
    categoryService
      .list({ type: 'expense' })
      .then((data) => setCategories(data))
      .catch(() => setCategories([]))
      .finally(() => setCategoriesLoaded(true));
  }, []);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const visibleBudgets = useMemo(() => {
    if (statusFilter === 'all') return budgets;
    return budgets.filter((budget) => budget.status === statusFilter);
  }, [budgets, statusFilter]);

  const openCreate = () => {
    setModalMode('create');
    setEditing(null);
    setFormError(null);
    setBudgetFormRevision((value) => value + 1);
    setModalOpen(true);
  };

  const openEdit = (budget: Budget) => {
    setModalMode('edit');
    setEditing(budget);
    setFormError(null);
    setBudgetFormRevision((value) => value + 1);
    setModalOpen(true);
  };

  const closeBudgetModal = () => {
    setModalOpen(false);
    setEditing(null);
    setFormError(null);
  };

  const handleSubmit = async (values: BudgetFormValues) => {
    setFormError(null);
    try {
      if (modalMode === 'edit' && editing) {
        await budgetService.updateBudget(editing.id, {
          amountLimit: Number(values.amountLimit),
          currency: values.currency,
          alertThresholdPct: Number(values.alertThresholdPct),
        });
      } else {
        await budgetService.createBudget({
          categoryId: values.categoryId,
          month: Number(values.month),
          year: Number(values.year),
          amountLimit: Number(values.amountLimit),
          currency: values.currency,
          alertThresholdPct: Number(values.alertThresholdPct),
          repeatMonths: Number(values.repeatMonths),
        });
      }
      setModalOpen(false);
      setEditing(null);
      await refreshAll();
    } catch (error) {
      setFormError(getErrorMessage(error, 'No se pudo guardar el presupuesto.'));
    }
  };

  const confirmDeactivate = async () => {
    if (!deactivateTarget) return;
    setDeactivating(true);
    setActionError(null);
    try {
      await budgetService.deleteBudget(deactivateTarget.id);
      setDeactivateTarget(null);
      await refreshAll();
    } catch (error) {
      setActionError(getErrorMessage(error, 'No se pudo desactivar el presupuesto.'));
    } finally {
      setDeactivating(false);
    }
  };

  const handleReactivate = async (budget: Budget) => {
    setActionError(null);
    try {
      await budgetService.updateBudget(budget.id, { isActive: true });
      await refreshAll();
    } catch (error) {
      setActionError(getErrorMessage(error, 'No se pudo reactivar el presupuesto.'));
    }
  };

  const resetFilters = () => {
    setMonth(now.getMonth() + 1);
    setYear(now.getFullYear());
    setCategoryId(undefined);
    setStatusFilter('all');
    setIncludeInactive(false);
  };

  const showAllBudgets = () => {
    setMonth(undefined);
    setYear(undefined);
    setCategoryId(undefined);
    setStatusFilter('all');
    setIncludeInactive(true);
  };

  const openRegisterExpense = (budget: Budget) => {
    setExpenseBudget(budget);
    setExpenseError(null);
  };

  const expenseTransactionInitialValues = useMemo<Partial<TransactionFormValues> | undefined>(() => {
    if (!expenseBudget) return undefined;

    return {
      classification:
        expenseBudget.category?.classification === 'fixed_expense'
          ? 'fixed_expense'
          : 'variable_expense',
      categoryId: expenseBudget.categoryId ?? undefined,
      description: expenseBudget.category?.name
        ? `Gasto en ${expenseBudget.category.name}`
        : 'Gasto de presupuesto',
    };
  }, [expenseBudget]);

  const handleExpenseSubmit = async (payload: CreateTransactionPayload) => {
    setExpenseError(null);
    try {
      await transactionService.create(payload);
      setExpenseBudget(null);
      await refreshAll();
    } catch (error) {
      setExpenseError(getErrorMessage(error, 'No se pudo registrar el gasto del presupuesto.'));
    }
  };

  const noExpenseCategories = categoriesLoaded && categories.length === 0;

  return (
    <>
      <PageHeader
        title="Presupuestos"
        description="Define límites de gasto por categoría y controla tu avance mensual."
        action={
        <button
          type="button"
          onClick={openCreate}
          disabled={noExpenseCategories}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-indigo-600/25 transition hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-600/25 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Nuevo presupuesto
        </button>
        }
      />

      <div className="mt-6">
        <BudgetSummaryCards summary={summary} currency={currency} loading={summaryLoading} />
      </div>

      <div className="mt-6">
        <BudgetFilters
          month={month}
          year={year}
          categoryId={categoryId}
          statusFilter={statusFilter}
          includeInactive={includeInactive}
          categories={categories}
          years={years}
          onMonthChange={setMonth}
          onYearChange={setYear}
          onCategoryChange={setCategoryId}
          onStatusChange={setStatusFilter}
          onIncludeInactiveChange={setIncludeInactive}
          onReset={resetFilters}
          onShowAll={showAllBudgets}
        />
      </div>

      {actionError ? (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          <AlertCircle className="h-4 w-4" />
          {actionError}
        </div>
      ) : null}

      {listError ? (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {listError}
          </span>
          <button
            type="button"
            onClick={() => void reload()}
            className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-rose-700"
          >
            Reintentar
          </button>
        </div>
      ) : null}

      {noExpenseCategories ? (
        <div className="mt-6 flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <Wallet className="h-6 w-6" />
          </span>
          <p className="text-sm font-semibold text-slate-700">Necesitas categorías de gasto</p>
          <p className="max-w-sm text-sm text-slate-500">
            Los presupuestos se definen sobre categorías de gasto. Registra transacciones para
            generar tus categorías y luego crea presupuestos.
          </p>
        </div>
      ) : listLoading && budgets.length === 0 ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-60 animate-pulse rounded-3xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : visibleBudgets.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <Wallet className="h-6 w-6" />
          </span>
          <p className="text-sm font-semibold text-slate-700">
            {budgets.length === 0
              ? 'No hay presupuestos para este periodo'
              : 'Ningún presupuesto coincide con el filtro'}
          </p>
          <p className="max-w-sm text-sm text-slate-500">
            {budgets.length === 0
              ? 'Crea un presupuesto para empezar a controlar tu gasto por categoría.'
              : 'Ajusta el estado o la categoría para ver más presupuestos.'}
          </p>
          {budgets.length === 0 ? (
            <button
              type="button"
              onClick={openCreate}
              className="mt-2 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              Nuevo presupuesto
            </button>
          ) : null}
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleBudgets.map((budget) => (
            <BudgetCard
              key={budget.id}
              budget={budget}
              onEdit={openEdit}
              onRegisterExpense={openRegisterExpense}
              onDeactivate={(b) => setDeactivateTarget(b)}
              onReactivate={(b) => void handleReactivate(b)}
            />
          ))}
        </div>
      )}

      <BudgetFormModal
        key={`budget-form-${budgetFormRevision}-${modalMode}-${editing?.id ?? 'new'}`}
        open={modalOpen}
        mode={modalMode}
        budget={editing}
        categories={categories}
        defaultCurrency={currency}
        defaultMonth={month ?? now.getMonth() + 1}
        defaultYear={year ?? now.getFullYear()}
        years={years}
        serverError={formError}
        onClose={closeBudgetModal}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={Boolean(deactivateTarget)}
        title="Desactivar presupuesto"
        message={`¿Seguro que deseas desactivar el presupuesto de "${
          deactivateTarget?.category?.name ?? 'esta categoría'
        }"? No se eliminarán tus transacciones y podrás reactivarlo después.`}
        confirmLabel="Desactivar"
        loading={deactivating}
        onConfirm={confirmDeactivate}
        onClose={() => setDeactivateTarget(null)}
      />

      <TransactionFormModal
        open={Boolean(expenseBudget)}
        mode="create"
        categories={categories}
        defaultCurrency={currency}
        initialValues={expenseTransactionInitialValues}
        serverError={expenseError}
        onClose={() => setExpenseBudget(null)}
        onSubmit={handleExpenseSubmit}
      />
    </>
  );
}
