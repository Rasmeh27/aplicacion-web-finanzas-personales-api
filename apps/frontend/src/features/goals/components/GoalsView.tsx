'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Plus, Target } from 'lucide-react';
import { useAuthStore } from '@/store/slices/auth.store';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { PageHeader } from '@/shared/components/PageHeader';
import { goalService } from '../services/goal.service';
import type {
  CreateContributionPayload,
  FinancialGoal,
  GoalContribution,
  GoalsSummary,
  ManageFundsPayload,
} from '../types';
import { GoalSummaryCards } from './GoalSummaryCards';
import { GoalCard } from './GoalCard';
import { EmergencyFundCard } from './EmergencyFundCard';
import { GoalFormModal, type GoalFormPayload } from './GoalFormModal';
import { ContributionModal } from './ContributionModal';
import { GoalDetailModal } from './GoalDetailModal';

type GoalModalIntent = 'create' | 'edit' | 'emergency';
type GoalFilter = 'all' | 'active' | 'completed' | 'inactive';

const getErrorMessage = (error: unknown, fallback: string): string => {
  const maybe = error as { response?: { data?: { message?: string | string[] } } };
  const message = maybe?.response?.data?.message;
  if (Array.isArray(message)) return message[0] ?? fallback;
  return message ?? fallback;
};

export function GoalsView() {
  const user = useAuthStore((state) => state.user);
  const currency = user?.primaryCurrency ?? 'DOP';

  const [summary, setSummary] = useState<GoalsSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [goalFilter, setGoalFilter] = useState<GoalFilter>('all');
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [goalFormRevision, setGoalFormRevision] = useState(0);
  const [goalIntent, setGoalIntent] = useState<GoalModalIntent>('create');
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null);
  const [goalFormError, setGoalFormError] = useState<string | null>(null);

  const [contributionGoal, setContributionGoal] = useState<FinancialGoal | null>(null);
  const [contributionError, setContributionError] = useState<string | null>(null);
  const [detailGoal, setDetailGoal] = useState<FinancialGoal | null>(null);
  const [detailContributions, setDetailContributions] = useState<GoalContribution[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<FinancialGoal | null>(null);
  const [deleting, setDeleting] = useState(false);

  const refreshSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      setSummary(await goalService.getSummary());
    } catch {
      // Resumen secundario: no bloquea la pantalla.
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const reload = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      setGoals(await goalService.list());
    } catch (error) {
      setListError(getErrorMessage(error, 'No se pudieron cargar tus metas.'));
    } finally {
      setListLoading(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([reload(), refreshSummary()]);
  }, [reload, refreshSummary]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const openCreate = () => {
    setGoalIntent('create');
    setEditingGoal(null);
    setGoalFormError(null);
    setGoalFormRevision((current) => current + 1);
    setGoalModalOpen(true);
  };

  const openEdit = (goal: FinancialGoal) => {
    setGoalIntent('edit');
    setEditingGoal(goal);
    setGoalFormError(null);
    setGoalFormRevision((current) => current + 1);
    setGoalModalOpen(true);
  };

  const openEmergencyConfig = () => {
    setGoalIntent('emergency');
    setEditingGoal(null);
    setGoalFormError(null);
    setGoalFormRevision((current) => current + 1);
    setGoalModalOpen(true);
  };

  const openDetail = async (goal: FinancialGoal) => {
    setDetailGoal(goal);
    setDetailContributions([]);
    setDetailError(null);
    setDetailLoading(true);
    try {
      setDetailContributions(await goalService.listContributions(goal.id));
    } catch (error) {
      setDetailError(getErrorMessage(error, 'No se pudieron cargar los aportes de esta meta.'));
    } finally {
      setDetailLoading(false);
    }
  };

  const handleGoalSubmit = async (payload: GoalFormPayload) => {
    setGoalFormError(null);
    try {
      if (goalIntent === 'edit' && editingGoal) {
        await goalService.update(editingGoal.id, payload);
      } else if (goalIntent === 'emergency') {
        await goalService.configureEmergencyFund({
          targetAmount: payload.targetAmount,
          currentAmount: payload.currentAmount,
          currency: payload.currency,
          targetDate: payload.targetDate,
        });
      } else {
        await goalService.create(payload);
      }
      setGoalModalOpen(false);
      setEditingGoal(null);
      await refreshAll();
    } catch (error) {
      setGoalFormError(getErrorMessage(error, 'No se pudo guardar la meta.'));
    }
  };

  const handleContribution = async (payload: ManageFundsPayload) => {
    if (!contributionGoal) return;
    setContributionError(null);
    try {
      if (payload.action === 'add') {
        const contributionPayload: CreateContributionPayload = {
          amount: payload.amount,
          currency: payload.currency,
          contributionDate: payload.contributionDate,
          note: payload.note,
        };
        await goalService.addContribution(contributionGoal.id, contributionPayload);
      } else {
        const currentAmount = Math.max(
          Number(contributionGoal.currentAmount) - Number(payload.amount),
          0,
        );
        await goalService.update(contributionGoal.id, { currentAmount });
      }
      setContributionGoal(null);
      await refreshAll();
    } catch (error) {
      setContributionError(getErrorMessage(error, 'No se pudo gestionar el movimiento.'));
    }
  };

  const markInactive = async (goal: FinancialGoal) => {
    setActionError(null);
    try {
      await goalService.update(goal.id, { status: 'cancelled' });
      await refreshAll();
    } catch (error) {
      setActionError(getErrorMessage(error, 'No se pudo pasar la meta a inactiva.'));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setActionError(null);
    try {
      await goalService.remove(deleteTarget.id);
      setDeleteTarget(null);
      await refreshAll();
    } catch (error) {
      setActionError(getErrorMessage(error, 'No se pudo eliminar la meta.'));
    } finally {
      setDeleting(false);
    }
  };

  const emergencyInfo = summary?.emergencyFund;
  const showEmergencyCard = emergencyInfo && emergencyInfo.status !== 'active';
  const filteredGoals = useMemo(() => {
    if (goalFilter === 'active') return goals.filter((goal) => goal.status === 'active');
    if (goalFilter === 'completed') return goals.filter((goal) => goal.status === 'completed');
    if (goalFilter === 'inactive') {
      return goals.filter((goal) => goal.status === 'cancelled' || goal.status === 'paused');
    }
    return goals;
  }, [goalFilter, goals]);

  const filterOptions: Array<{ value: GoalFilter; label: string }> = [
    { value: 'all', label: 'Todas' },
    { value: 'active', label: 'Activas' },
    { value: 'completed', label: 'Completadas' },
    { value: 'inactive', label: 'Inactivas' },
  ];

  const goalModalConfig = (() => {
    if (goalIntent === 'emergency') {
      return {
        title: 'Configurar fondo de emergencia',
        description: 'Esta meta queda marcada como tu fondo predeterminado.',
        submitLabel: 'Crear fondo',
        lockName: true,
        initialValues: {
          name: 'Fondo de emergencia',
          targetAmount: emergencyInfo?.suggestedTargetAmount ?? undefined,
          currency,
        },
      };
    }
    if (goalIntent === 'edit' && editingGoal) {
      return {
        title: 'Editar meta',
        description: undefined,
        submitLabel: 'Guardar cambios',
        lockName: false,
        initialValues: {
          name: editingGoal.name,
          targetAmount: Number(editingGoal.targetAmount),
          currentAmount: Number(editingGoal.currentAmount),
          currency: editingGoal.currency,
          targetDate: editingGoal.targetDate ?? undefined,
        },
      };
    }
    return {
      title: 'Nueva meta',
      description: 'Define cuánto quieres ahorrar y para cuándo.',
      submitLabel: 'Crear meta',
      lockName: false,
      initialValues: { currency },
    };
  })();

  return (
    <>
      <PageHeader
        title="Metas"
        description="Crea metas de ahorro, aporta dinero y sigue tu progreso hacia cada objetivo."
        action={
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-indigo-600/25 transition hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-600/25 sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Nueva meta
        </button>
        }
      />

      <div className="mt-6">
        <GoalSummaryCards summary={summary} currency={currency} loading={summaryLoading} />
      </div>

      {showEmergencyCard && emergencyInfo ? (
        <div className="mt-6">
          <EmergencyFundCard
            info={emergencyInfo}
            currency={currency}
            onConfigure={openEmergencyConfig}
          />
        </div>
      ) : null}

      {actionError ? (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          <AlertCircle className="h-4 w-4" />
          {actionError}
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2">
        {filterOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setGoalFilter(option.value)}
            className={`rounded-xl px-4 py-2 text-sm font-black transition ${
              goalFilter === option.value
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                : 'border border-slate-200 bg-white text-slate-500 hover:border-indigo-200 hover:text-indigo-600'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {listError ? (
        <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
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

      {listLoading && goals.length === 0 ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-56 animate-pulse rounded-3xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : goals.length === 0 ? (
        !showEmergencyCard ? (
          <div className="mt-6 flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <Target className="h-6 w-6" />
            </span>
            <p className="text-sm font-semibold text-slate-700">Aún no tienes metas</p>
            <p className="max-w-sm text-sm text-slate-500">
              Crea tu primera meta de ahorro y empieza a construir tu futuro financiero.
            </p>
            <button
              type="button"
              onClick={openCreate}
              className="mt-2 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              Nueva meta
            </button>
          </div>
        ) : null
      ) : filteredGoals.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center text-sm font-semibold text-slate-500">
          No hay metas en este filtro.
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredGoals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onAddFunds={(g) => {
                setContributionError(null);
                setContributionGoal(g);
              }}
              onView={(g) => void openDetail(g)}
              onEdit={openEdit}
              onMarkInactive={(g) => void markInactive(g)}
              onDelete={(g) => setDeleteTarget(g)}
            />
          ))}
        </div>
      )}

      <GoalFormModal
        open={goalModalOpen}
        title={goalModalConfig.title}
        description={goalModalConfig.description}
        submitLabel={goalModalConfig.submitLabel}
        lockName={goalModalConfig.lockName}
        initialValues={goalModalConfig.initialValues}
        resetKey={goalFormRevision}
        defaultCurrency={currency}
        serverError={goalFormError}
        onClose={() => setGoalModalOpen(false)}
        onSubmit={handleGoalSubmit}
      />

      <ContributionModal
        open={Boolean(contributionGoal)}
        goal={contributionGoal}
        serverError={contributionError}
        onClose={() => setContributionGoal(null)}
        onSubmit={handleContribution}
      />

      <GoalDetailModal
        open={Boolean(detailGoal)}
        goal={detailGoal}
        contributions={detailContributions}
        loading={detailLoading}
        error={detailError}
        onClose={() => setDetailGoal(null)}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Eliminar meta"
        message={`¿Seguro que deseas eliminar la meta${
          deleteTarget?.name ? ` "${deleteTarget.name}"` : ''
        }? Se eliminarán también sus aportes registrados.`}
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  );
}
