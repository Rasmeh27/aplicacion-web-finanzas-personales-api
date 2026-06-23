'use client';

import { AlertTriangle, Gauge, PiggyBank, TrendingDown, Wallet } from 'lucide-react';
import { StatCard } from '@/features/dashboard/components/StatCard';
import { formatCurrency } from '@/shared/utils/format-currency';
import type { BudgetSummary } from '../types';

type Props = {
  summary: BudgetSummary | null;
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

export function BudgetSummaryCards({ summary, currency, loading }: Props) {
  if (loading && !summary) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
    );
  }

  const money = (value: number) => formatCurrency(value, currency);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <StatCard
        label="Presupuesto total"
        value={money(summary?.totalBudgeted ?? 0)}
        icon={Wallet}
        accent="indigo"
        hint={`${summary?.activeBudgetsCount ?? 0} activos`}
      />
      <StatCard
        label="Gastado"
        value={money(summary?.totalSpent ?? 0)}
        icon={TrendingDown}
        accent="rose"
      />
      <StatCard
        label="Disponible"
        value={money(summary?.totalRemaining ?? 0)}
        icon={PiggyBank}
        accent="emerald"
      />
      <StatCard
        label="Excedidos"
        value={String(summary?.exceededBudgetsCount ?? 0)}
        icon={AlertTriangle}
        accent="rose"
        hint={`${summary?.warningBudgetsCount ?? 0} cerca`}
      />
      <StatCard
        label="Uso global"
        value={`${summary?.overallUsagePct ?? 0}%`}
        icon={Gauge}
        accent="violet"
      />
    </div>
  );
}
