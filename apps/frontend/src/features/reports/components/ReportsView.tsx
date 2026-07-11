'use client';

import { useEffect, useMemo, useState } from 'react';
import { Activity, BarChart3, CircleDollarSign, Loader2, PiggyBank, Target, WalletCards } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { dashboardReportsService, type FinancialHealthResponse } from '@/features/dashboard/services/dashboard-reports.service';

type ReportState = {
  balance: { totalIncome: number; totalExpense: number; balance: number; currency: string } | null;
  savings: { savingsPercentage: number | null } | null;
  categories: Array<{ categoryId: string | null; categoryName: string; total: number; currency: string }>;
  goals: { totalGoals: number; completedGoals: number; totalTargetAmount: number; totalCurrentAmount: number; progressPercentage: number; currency: string } | null;
  debts: { totalDebts: number; activeDebts: number; totalDebtAmount: number; totalPaidAmount: number; totalRemainingAmount: number; currency: string } | null;
  health: FinancialHealthResponse | null;
};

const emptyReport: ReportState = {
  balance: null,
  savings: null,
  categories: [],
  goals: null,
  debts: null,
  health: null,
};

const HEALTH_LABEL: Record<FinancialHealthResponse['status'], string> = {
  optimal: 'Optima',
  healthy: 'Saludable',
  stable: 'Estable',
  weak: 'Debil',
  critical: 'Critica',
};

const money = (value: number | null | undefined, currency = 'DOP') =>
  new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));

function currentMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BarChart3;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
      <div className="flex items-center gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
          <Icon className="h-6 w-6" />
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-400">{label}</p>
          <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
        </div>
      </div>
    </div>
  );
}

export function ReportsView() {
  const [data, setData] = useState<ReportState>(emptyReport);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const period = useMemo(currentMonth, []);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);
    Promise.all([
      dashboardReportsService.monthlyBalance(period),
      dashboardReportsService.savingsPercentage(period),
      dashboardReportsService.expensesByCategory(period),
      dashboardReportsService.financialGoalsSummary(),
      dashboardReportsService.debtsSummary(),
      dashboardReportsService.financialHealth(period),
    ])
      .then(([balance, savings, categories, goals, debts, health]) => {
        if (!cancelled) setData({ balance, savings, categories, goals, debts, health });
      })
      .catch(() => {
        if (!cancelled) setError('No se pudieron cargar los reportes.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [period]);

  const currency = data.balance?.currency ?? data.health?.currency ?? 'DOP';

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Reportes"
        description="Consulta tus ingresos, gastos, presupuestos, metas, deudas y salud financiera en un solo lugar."
      />

      {error ? (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
          Cargando reportes...
        </div>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={CircleDollarSign} label="Ingresos del mes" value={money(data.balance?.totalIncome, currency)} />
            <StatCard icon={WalletCards} label="Gastos del mes" value={money(data.balance?.totalExpense, currency)} />
            <StatCard icon={PiggyBank} label="Ahorro mensual" value={data.savings?.savingsPercentage === null || data.savings?.savingsPercentage === undefined ? 'N/D' : `${data.savings.savingsPercentage}%`} />
            <StatCard icon={Activity} label="Salud financiera" value={data.health ? HEALTH_LABEL[data.health.status] : 'N/D'} />
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-950/5">
              <h2 className="text-lg font-black text-slate-950">Gastos por categoría</h2>
              <div className="mt-5 space-y-4">
                {data.categories.length ? data.categories.map((category) => {
                  const max = Math.max(...data.categories.map((item) => Number(item.total)), 1);
                  const percent = Math.round((Number(category.total) / max) * 100);
                  return (
                    <div key={category.categoryId ?? category.categoryName}>
                      <div className="mb-2 flex items-center justify-between text-sm font-bold">
                        <span className="text-slate-700">{category.categoryName || 'Sin categoría'}</span>
                        <span className="text-slate-500">{money(category.total, category.currency)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-indigo-600" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                }) : (
                  <p className="rounded-2xl bg-slate-50 px-4 py-5 text-sm font-semibold text-slate-400">No hay gastos para reportar este mes.</p>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-950/5">
                <h2 className="inline-flex items-center gap-2 text-lg font-black text-slate-950">
                  <Target className="h-5 w-5 text-indigo-600" />
                  Metas
                </h2>
                <p className="mt-4 text-3xl font-black text-slate-950">{data.goals?.progressPercentage ?? 0}%</p>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {money(data.goals?.totalCurrentAmount, data.goals?.currency ?? currency)} de {money(data.goals?.totalTargetAmount, data.goals?.currency ?? currency)}
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-950/5">
                <h2 className="inline-flex items-center gap-2 text-lg font-black text-slate-950">
                  <WalletCards className="h-5 w-5 text-indigo-600" />
                  Deudas
                </h2>
                <p className="mt-4 text-3xl font-black text-slate-950">{money(data.debts?.totalRemainingAmount, data.debts?.currency ?? currency)}</p>
                <p className="mt-1 text-sm font-semibold text-slate-500">{data.debts?.activeDebts ?? 0} deudas activas</p>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
