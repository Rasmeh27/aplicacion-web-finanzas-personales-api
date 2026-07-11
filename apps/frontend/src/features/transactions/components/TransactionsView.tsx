'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, Plus } from 'lucide-react';
import { useAuthStore } from '@/store/slices/auth.store';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { PageHeader } from '@/shared/components/PageHeader';
import {
  categoryService,
  type Category,
} from '@/features/categories/services/category.service';
import { transactionService } from '../services/transaction.service';
import type {
  CreateTransactionPayload,
  Transaction,
  TransactionFilters,
  TransactionSummary,
} from '../types';
import { TransactionSummaryCards } from './TransactionSummaryCards';
import { TransactionFilters as FiltersBar } from './TransactionFilters';
import { TransactionList } from './TransactionList';
import { TransactionFormModal } from './TransactionFormModal';
import { TransactionDetailModal } from './TransactionDetailModal';

const PAGE_SIZE = 20;

const getErrorMessage = (error: unknown, fallback: string): string => {
  const maybe = error as { response?: { data?: { message?: string | string[] } } };
  const message = maybe?.response?.data?.message;
  if (Array.isArray(message)) return message[0] ?? fallback;
  return message ?? fallback;
};

export function TransactionsView() {
  const router = useRouter();
  const pathname = usePathname() ?? '/transactions';
  const searchParams = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const currency = user?.primaryCurrency ?? 'DOP';

  const [categories, setCategories] = useState<Category[]>([]);
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const [filters, setFilters] = useState<TransactionFilters>({ limit: PAGE_SIZE, offset: 0 });
  const [searchValue, setSearchValue] = useState('');

  const [items, setItems] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [viewing, setViewing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState(false);

  const refreshSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const data = await transactionService.getSummary();
      setSummary(data);
    } catch {
      // El resumen es secundario: no bloquea la pantalla ante un error menor.
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const reload = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const response = await transactionService.list({ ...filters, offset: 0 });
      setItems(response.items);
      setTotal(response.total);
      setHasMore(response.hasMore);
    } catch (error) {
      setListError(getErrorMessage(error, 'No se pudieron cargar las transacciones.'));
    } finally {
      setListLoading(false);
    }
  }, [filters]);

  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    try {
      const response = await transactionService.list({ ...filters, offset: items.length });
      setItems((prev) => [...prev, ...response.items]);
      setTotal(response.total);
      setHasMore(response.hasMore);
    } catch (error) {
      setActionError(getErrorMessage(error, 'No se pudieron cargar más transacciones.'));
    } finally {
      setLoadingMore(false);
    }
  }, [filters, items.length]);

  // Categorías + resumen al montar.
  useEffect(() => {
    categoryService
      .list()
      .then(setCategories)
      .catch(() => setCategories([]));
    void refreshSummary();
  }, [refreshSummary]);

  // Recarga la lista cuando cambian los filtros (clasificación, categoría, fechas, búsqueda).
  useEffect(() => {
    void reload();
  }, [reload]);

  // Búsqueda con debounce.
  useEffect(() => {
    const handle = setTimeout(() => {
      setFilters((prev) => {
        const next = searchValue.trim() || undefined;
        if (prev.search === next) return prev;
        return { ...prev, search: next, offset: 0 };
      });
    }, 400);
    return () => clearTimeout(handle);
  }, [searchValue]);

  const handleFilterChange = (next: Partial<TransactionFilters>) => {
    setFilters((prev) => ({ ...prev, ...next }));
  };

  const resetFilters = () => {
    setSearchValue('');
    setFilters({ limit: PAGE_SIZE, offset: 0 });
  };

  const openCreate = useCallback(() => {
    setModalMode('create');
    setEditing(null);
    setFormError(null);
    setModalOpen(true);
  }, []);

  useEffect(() => {
    if (searchParams.get('new') !== '1') return;

    openCreate();
    router.replace(pathname);
  }, [openCreate, pathname, router, searchParams]);

  const openEdit = (transaction: Transaction) => {
    setModalMode('edit');
    setEditing(transaction);
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (payload: CreateTransactionPayload) => {
    setFormError(null);
    try {
      if (modalMode === 'edit' && editing) {
        await transactionService.update(editing.id, payload);
      } else {
        await transactionService.create(payload);
      }
      setModalOpen(false);
      setEditing(null);
      await Promise.all([reload(), refreshSummary()]);
    } catch (error) {
      setFormError(getErrorMessage(error, 'No se pudo guardar la transacción.'));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setActionError(null);
    try {
      await transactionService.remove(deleteTarget.id);
      setDeleteTarget(null);
      await Promise.all([reload(), refreshSummary()]);
    } catch (error) {
      setActionError(getErrorMessage(error, 'No se pudo eliminar la transacción.'));
    } finally {
      setDeleting(false);
    }
  };

  const handleCreateCategory = async (payload: {
    name: string;
    type: Category['type'];
    classification: Category['classification'];
  }) => {
    const category = await categoryService.create({
      name: payload.name,
      type: payload.type,
      classification: payload.classification ?? undefined,
      icon: 'Tag',
      color: '#6366f1',
    });
    setCategories((current) => [...current, category].sort((a, b) => a.name.localeCompare(b.name)));
    return category;
  };

  return (
    <>
      <PageHeader
        title="Transacciones"
        description="Registra y organiza tus ingresos y gastos personales para entender a dónde va tu dinero."
        action={
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-indigo-600/25 transition hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-600/25 sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Nueva transacción
        </button>
        }
      />

      <div className="mt-6">
        <TransactionSummaryCards summary={summary} currency={currency} loading={summaryLoading} />
      </div>

      <div className="mt-6">
        <FiltersBar
          filters={filters}
          categories={categories}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          onChange={handleFilterChange}
          onReset={resetFilters}
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

      <div className="mt-4">
        <TransactionList
          transactions={items}
          loading={listLoading}
          onEdit={openEdit}
          onView={setViewing}
          onDelete={(transaction) => setDeleteTarget(transaction)}
        />
      </div>

      {hasMore ? (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={loadingMore}
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
          >
            {loadingMore ? 'Cargando...' : `Cargar más (${items.length}/${total})`}
          </button>
        </div>
      ) : null}

      <TransactionFormModal
        open={modalOpen}
        mode={modalMode}
        transaction={editing}
        categories={categories}
        defaultCurrency={currency}
        serverError={formError}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        onCreateCategory={handleCreateCategory}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Eliminar transacción"
        message={`¿Seguro que deseas eliminar esta transacción${
          deleteTarget?.description ? ` "${deleteTarget.description}"` : ''
        }? Se ocultará del listado, pero quedará guardada para trazabilidad.`}
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />

      <TransactionDetailModal transaction={viewing} onClose={() => setViewing(null)} />
    </>
  );
}
