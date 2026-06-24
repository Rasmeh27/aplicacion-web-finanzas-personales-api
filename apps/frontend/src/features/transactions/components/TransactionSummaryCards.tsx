'use client';

import { Banknote, Gift, Home, ShoppingCart, Wallet } from 'lucide-react';
import { StatCard } from '@/features/dashboard/components/StatCard';
import { formatCurrency } from '@/shared/utils/format-currency';
import type { TransactionSummary } from '../types';

type Props = {
  summary: TransactionSummary | null;
  currency: string;
  loading: boolean;
};

function SkeletonCard() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="h-11 w-11 animate-pulse rounded-2xl bg-slate-100" />
      <div className="mt-5 h-4 w-24 animate-pulse rounded bg-slate-100" />
      <div className="mt-2 h-7 w-32 animate-pulse rounded bg-slate-100" />
    </div>
  );
}

export function TransactionSummaryCards({ summary, currency, loading }: Props) {
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
  const s = summary;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <StatCard
        label="Ingresos"
        value={money(s?.totalRegularIncome ?? 0)}
        icon={Banknote}
        accent="emerald"
        hint="Mes"
      />
      <StatCard
        label="Ingresos extras"
        value={money(s?.totalExtraIncome ?? 0)}
        icon={Gift}
        accent="emerald"
        hint="Mes"
      />
      <StatCard
        label="Gastos fijos"
        value={money(s?.totalFixedExpenses ?? 0)}
        icon={Home}
        accent="rose"
        hint="Mes"
      />
      <StatCard
        label="Gastos variables"
        value={money(s?.totalVariableExpenses ?? 0)}
        icon={ShoppingCart}
        accent="rose"
        hint="Mes"
      />
      <StatCard
        label="Balance del mes"
        value={money(s?.balance ?? 0)}
        icon={Wallet}
        accent="indigo"
        hint={`${s?.transactionCount ?? 0} mov.`}
      />
    </div>
  );
}
