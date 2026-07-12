'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock, FlaskConical, Plus, Sparkles } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { useTranslation } from '@/shared/i18n/useTranslation';
import type { TranslationKey } from '@/shared/i18n/translations';
import { useSubscriptionStore, selectIsPremium } from '@/store/slices/subscription.store';
import {
  investmentErrorKey,
  investmentsService,
  isPremiumRequiredError,
} from '../services/investments.service';
import type {
  AllocationResponse,
  CreatePositionPayload,
  EnrichedPosition,
  PerformanceResponse,
  PortfolioSummary,
  PositionsListResponse,
} from '../types';
import { InvestmentsLocked } from './InvestmentsLocked';
import { PositionFormModal } from './PositionFormModal';
import { PositionsTable } from './PositionsTable';
import { SummaryCards } from './SummaryCards';
import { AllocationChart } from './charts/AllocationChart';
import { GainLossChart } from './charts/GainLossChart';
import { PortfolioEvolutionChart } from './charts/PortfolioEvolutionChart';
import { SymbolHistoryChart } from './charts/SymbolHistoryChart';

type ModalState =
  | { open: false }
  | { open: true; mode: 'create' }
  | { open: true; mode: 'edit'; position: EnrichedPosition };

/** Página /investments (solo Premium; Basic ve la pantalla bloqueada). */
export function InvestmentsView() {
  const { t } = useTranslation();
  const subscription = useSubscriptionStore((state) => state.subscription);
  const subscriptionLoading = useSubscriptionStore((state) => state.loading);
  const refreshSubscription = useSubscriptionStore((state) => state.refresh);
  const isPremium = useSubscriptionStore(selectIsPremium);

  const [positions, setPositions] = useState<PositionsListResponse | null>(null);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [allocation, setAllocation] = useState<AllocationResponse | null>(null);
  const [performance, setPerformance] = useState<PerformanceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null);

  const [modal, setModal] = useState<ModalState>({ open: false });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<EnrichedPosition | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showValidationWarning, setShowValidationWarning] = useState(false);

  // El plan se refresca SIEMPRE al entrar (nunca se confía en un estado viejo).
  useEffect(() => {
    void refreshSubscription({ force: true });
  }, [refreshSubscription]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setErrorKey(null);
    try {
      // El resumen registra el snapshot del día; el resto llega en paralelo.
      const [positionsRes, summaryRes, allocationRes, performanceRes] = await Promise.all([
        investmentsService.listPositions(),
        investmentsService.getSummary(),
        investmentsService.getAllocation(),
        investmentsService.getPerformance('ALL'),
      ]);
      setPositions(positionsRes);
      setSummary(summaryRes);
      setAllocation(allocationRes);
      setPerformance(performanceRes);
    } catch (error) {
      if (isPremiumRequiredError(error)) {
        // El backend manda: si dice basic, se refresca el gating visual.
        void refreshSubscription({ force: true });
      }
      setErrorKey(investmentErrorKey(error));
    } finally {
      setLoading(false);
    }
  }, [refreshSubscription]);

  useEffect(() => {
    if (isPremium) void loadAll();
  }, [isPremium, loadAll]);

  const symbols = useMemo(
    () => (positions?.items ?? []).map((position) => position.symbol),
    [positions],
  );

  const openCreate = () => {
    setFormError(null);
    setShowValidationWarning(false);
    setModal({ open: true, mode: 'create' });
  };

  const openEdit = (position: EnrichedPosition) => {
    setFormError(null);
    setModal({ open: true, mode: 'edit', position });
  };

  const submitPosition = async (payload: CreatePositionPayload) => {
    setSubmitting(true);
    setFormError(null);
    try {
      if (modal.open && modal.mode === 'edit') {
        // El símbolo no es editable; solo se envían los campos actualizables.
        await investmentsService.updatePosition(modal.position.id, {
          assetType: payload.assetType,
          quantity: payload.quantity,
          averageCost: payload.averageCost,
          purchaseDate: payload.purchaseDate,
          notes: payload.notes,
        });
      } else {
        const created = await investmentsService.createPosition(payload);
        if (created.warnings.includes('market_validation_skipped')) {
          setShowValidationWarning(true);
        }
      }
      setModal({ open: false });
      await loadAll();
    } catch (error) {
      setFormError(t(investmentErrorKey(error)));
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await investmentsService.removePosition(deleting.id);
      setDeleting(null);
      await loadAll();
    } catch (error) {
      setErrorKey(investmentErrorKey(error));
      setDeleting(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Gating visual: mientras no se confirme premium se muestra el bloqueo.
  if (subscriptionLoading && !subscription) {
    return (
      <div className="space-y-6">
        <div className="h-32 animate-pulse rounded-3xl border border-slate-200 bg-white" />
        <div className="h-64 animate-pulse rounded-3xl border border-slate-200 bg-white" />
      </div>
    );
  }
  if (!isPremium) {
    return <InvestmentsLocked />;
  }

  // Demo SOLO cuando el backend confirma isMock=true (nunca por marketDataSource suelto).
  const marketMeta = positions?.marketData ?? summary?.marketData ?? null;
  const isDemoData = marketMeta?.isMock === true;
  const marketClosed = !isDemoData && marketMeta?.marketStatus === 'closed';
  const failedSymbols = marketMeta?.failedSymbols ?? [];

  return (
    <div>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {t('investments.title')}
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
              <Sparkles className="h-3 w-3" />
              {t('investments.premiumBadge')}
            </span>
          </span>
        }
        description={t('investments.subtitle')}
        action={
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-indigo-600/25 transition hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-xl"
          >
            <Plus className="h-4 w-4" />
            {t('investments.addPosition')}
          </button>
        }
      />

      {isDemoData ? (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-800">
          <FlaskConical className="h-4 w-4" />
          {t('investments.demoData')}
        </div>
      ) : marketClosed ? (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-600">
          <Clock className="h-4 w-4" />
          {t('investments.marketClosed')}
        </div>
      ) : null}

      {!isDemoData && failedSymbols.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-800">
          {t('investments.partialData', { symbols: failedSymbols.join(', ') })}
        </div>
      ) : null}

      {showValidationWarning ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-800">
          {t('investments.warning.validationSkipped')}
        </div>
      ) : null}

      {errorKey && positions === null ? (
        <div className="mt-6 flex flex-col items-start gap-3 rounded-3xl border border-rose-200 bg-rose-50 px-5 py-5">
          <p className="text-sm font-medium text-rose-700">{t(errorKey)}</p>
          <button
            type="button"
            onClick={() => void loadAll()}
            className="rounded-xl border border-rose-300 bg-white px-3 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
          >
            {t('investments.retry')}
          </button>
        </div>
      ) : null}

      <div className="mt-6">
        <SummaryCards summary={summary} loading={loading} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <AllocationChart allocation={allocation} />
        <GainLossChart positions={positions?.items ?? []} />
        <PortfolioEvolutionChart performance={performance} />
        <SymbolHistoryChart symbols={symbols} />
      </div>

      <div className="mt-6">
        <PositionsTable
          data={positions}
          loading={loading}
          errorKey={errorKey}
          onRetry={() => void loadAll()}
          onAdd={openCreate}
          onEdit={openEdit}
          onDelete={setDeleting}
        />
      </div>

      <PositionFormModal
        open={modal.open}
        mode={modal.open ? modal.mode : 'create'}
        position={modal.open && modal.mode === 'edit' ? modal.position : null}
        serverError={formError}
        submitting={submitting}
        onClose={() => setModal({ open: false })}
        onSubmit={submitPosition}
      />

      <ConfirmDialog
        open={deleting !== null}
        title={t('investments.delete.title')}
        message={t('investments.delete.message', { symbol: deleting?.symbol ?? '' })}
        confirmLabel={t('investments.delete.confirm')}
        cancelLabel={t('investments.form.cancel')}
        loading={deleteLoading}
        onConfirm={() => void confirmDelete()}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
