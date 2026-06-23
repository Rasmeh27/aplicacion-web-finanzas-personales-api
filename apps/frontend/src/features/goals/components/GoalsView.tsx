'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Plus, Target } from 'lucide-react';
import { useAuthStore } from '@/store/slices/auth.store';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { goalService } from '../services/goal.service';
import type {
  CreateContributionPayload,
  FinancialGoal,
  GoalsSummary,
} from '../types';
import { GoalSummaryCards } from './GoalSummaryCards';
import { GoalCard } from './GoalCard';
import { EmergencyFundCard } from './EmergencyFundCard';
import { GoalFormModal, type GoalFormPayload } from './GoalFormModal';
import { ContributionModal } from './ContributionModal';

type GoalModalIntent = 'create' | 'edit' | 'emergency';

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
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [goalIntent, setGoalIntent] = useState<GoalModalIntent>('create');
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null);
  const [goalFormError, setGoalFormError] = useState<string | null>(null);

  const [contributionGoal, setContributionGoal] = useState<FinancialGoal | null>(null);
  const [contributionError, setContributionError] = useState<string | null>(null);

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
    setGoalModalOpen(true);
  };

  const openEdit = (goal: FinancialGoal) => {
    setGoalIntent('edit');
    setEditingGoal(goal);
    setGoalFormError(null);
    setGoalModalOpen(true);
  };

  const openEmergencyConfig = () => {
    setGoalIntent('emergency');
    setEditingGoal(null);
    setGoalFormError(null);
    setGoalModalOpen(true);
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

  const handleContribution = async (payload: CreateContributionPayload) => {
    if (!contributionGoal) return;
    setContributionError(null);
    try {
      await goalService.addContribution(contributionGoal.id, payload);
      setContributionGoal(null);
      await refreshAll();
    } catch (error) {
      setContributionError(getErrorMessage(error, 'No se pudo registrar el aporte.'));
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
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Metas</h1>
          <p className="mt-1 text-sm text-slate-500">
            Crea metas de ahorro, aporta dinero y sigue tu progreso hacia cada objetivo.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-sm shadow-indigo-600/25 transition hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Nueva meta
        </button>
      </header>

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
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onAddFunds={(g) => {
                setContributionError(null);
                setContributionGoal(g);
              }}
              onEdit={openEdit}
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
