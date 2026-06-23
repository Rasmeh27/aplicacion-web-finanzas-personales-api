'use client';

import { PiggyBank, ShieldCheck, Target, TrendingUp } from 'lucide-react';
import { StatCard } from '@/features/dashboard/components/StatCard';
import { formatCurrency } from '@/shared/utils/format-currency';
import type { GoalsSummary } from '../types';

type Props = {
  summary: GoalsSummary | null;
  currency: string;
  loading: boolean;
};

function SkeletonCard() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="h-11 w-11 animate-pulse rounded-2xl bg-slate-100" />
      <div className="mt-5 h-4 w-24 animate-pulse rounded bg-slate-100" />
      <div className="mt-2 h-7 w-28 animate-pulse rounded bg-slate-100" />
    </div>
  );
}

const emergencyFundValue = (summary: GoalsSummary | null, currency: string) => {
  const info = summary?.emergencyFund;
  if (!info) return { value: '—', hint: undefined as string | undefined };

  if (info.status === 'active') {
    return { value: `${info.progressPct ?? 0}%`, hint: 'Configurado' };
  }
  if (info.status === 'suggested' && info.suggestedTargetAmount) {
    return { value: formatCurrency(info.suggestedTargetAmount, currency), hint: 'Sugerido' };
  }
  return { value: 'Por configurar', hint: undefined };
};

export function GoalSummaryCards({ summary, currency, loading }: Props) {
  if (loading && !summary) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
    );
  }

  const emergency = emergencyFundValue(summary, currency);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Total ahorrado"
        value={formatCurrency(summary?.totalSaved ?? 0, currency)}
        icon={PiggyBank}
        accent="emerald"
        hint={`de ${formatCurrency(summary?.totalTarget ?? 0, currency)}`}
      />
      <StatCard
        label="Progreso global"
        value={`${summary?.overallProgressPct ?? 0}%`}
        icon={TrendingUp}
        accent="indigo"
      />
      <StatCard
        label="Metas activas"
        value={String(summary?.activeGoalsCount ?? 0)}
        icon={Target}
        accent="violet"
        hint={`${summary?.completedGoalsCount ?? 0} completadas`}
      />
      <StatCard
        label="Fondo de emergencia"
        value={emergency.value}
        icon={ShieldCheck}
        accent="indigo"
        hint={emergency.hint}
      />
    </div>
  );
}
