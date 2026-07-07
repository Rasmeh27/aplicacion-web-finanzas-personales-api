'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Tag, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { useAuthStore } from '@/store/slices/auth.store';
import { formatCurrency } from '@/shared/utils/format-currency';
import { useTranslation } from '@/shared/i18n/useTranslation';
import type { TranslationKey } from '@/shared/i18n/translations';
import {
  getDashboardSummary,
  getExpenseCategories,
  getRecentDashboardTransactions,
  getSpendingBars,
  type DashboardPeriod,
  type ExpenseCategoryKey,
  type SpendingBarKey,
} from '../utils/dashboard-data';
import { CategoryProgress } from './CategoryProgress';
import { RecentTransactionsTable } from './RecentTransactionsTable';
import { SpendingChartPlaceholder } from './SpendingChartPlaceholder';
import { StatCard } from './StatCard';

const PERIOD_KEYS = ['period.today', 'period.week', 'period.month', 'period.year'] as const satisfies readonly TranslationKey[];
type PeriodTranslationKey = (typeof PERIOD_KEYS)[number];

const PERIOD_VALUE: Record<PeriodTranslationKey, DashboardPeriod> = {
  'period.today': 'today',
  'period.week': 'week',
  'period.month': 'month',
  'period.year': 'year',
};

const PERIOD_HINT: Record<DashboardPeriod, string> = {
  today: 'Estimado de hoy',
  week: 'Estimado semanal',
  month: 'Estimado mensual',
  year: 'Estimado anual',
};

const PERIOD_CAPTION: Record<DashboardPeriod, string> = {
  today: 'Hoy',
  week: 'Esta semana',
  month: 'Este mes',
  year: 'Este año',
};

const PERIOD_CHART_TITLE: Record<DashboardPeriod, string> = {
  today: 'Distribución estimada de hoy',
  week: 'Distribución semanal estimada',
  month: 'Distribución mensual estimada',
  year: 'Distribución anual estimada',
};

const PERIOD_CHART_SUBTITLE: Record<DashboardPeriod, string> = {
  today: 'Gastos, ahorro y balance proyectados para hoy',
  week: 'Gastos, ahorro y balance proyectados para la semana',
  month: 'Gastos fijos, variables, ahorro y balance',
  year: 'Gastos, ahorro y balance proyectados para el año',
};

const CHART_BAR_LABEL: Record<SpendingBarKey, TranslationKey> = {
  fixed: 'chartBar.fixed',
  variable: 'chartBar.variable',
  savings: 'chartBar.savings',
  balance: 'chartBar.balance',
};

const CATEGORY_LABEL: Record<ExpenseCategoryKey, TranslationKey> = {
  fixedExpenses: 'category.fixedExpenses',
  variableExpenses: 'category.variableExpenses',
  savingTarget: 'category.savingTarget',
  freeBalance: 'category.freeBalance',
};

export function DashboardOverview() {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const currency = user?.primaryCurrency ?? 'DOP';
  const [activePeriod, setActivePeriod] = useState<DashboardPeriod>('month');

  const summary = useMemo(() => getDashboardSummary(user, activePeriod), [activePeriod, user]);
  const spendingBars = useMemo(() => getSpendingBars(user, activePeriod), [activePeriod, user]);
  const categories = useMemo(() => getExpenseCategories(user, activePeriod), [activePeriod, user]);
  const recentTransactions = useMemo(
    () => getRecentDashboardTransactions(user, activePeriod),
    [activePeriod, user],
  );

  const money = (value: number) => formatCurrency(value, currency);

  const chartData = spendingBars.map((bar) => ({
    label: t(CHART_BAR_LABEL[bar.key]),
    amount: bar.amount,
    highlight: bar.highlight,
  }));

  const categoryData = categories.map((category) => ({
    name: t(CATEGORY_LABEL[category.key]),
    pct: category.pct,
    amount: category.amount,
  }));

  const topCategoryLabel =
    summary.topCategoryKey === 'none'
      ? t('topCategory.none')
      : t(summary.topCategoryKey === 'fixed' ? 'category.fixedExpenses' : 'category.variableExpenses');

  return (
    <>
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-950/5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{t('dashboard.title')}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              {t('dashboard.subtitle')} Cambia entre hoy, semana, mes y año para ver cómo se mueven tus números.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push('/transactions?new=1')}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-indigo-600/25 transition hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-600/25 sm:w-auto sm:min-w-[190px]"
          >
            <Plus className="h-5 w-5" />
            {t('dashboard.addRecord')}
          </button>
        </div>
      </header>

      <div className="mt-6 inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
        {PERIOD_KEYS.map((periodKey) => {
          const period = PERIOD_VALUE[periodKey];
          return (
          <button
            key={periodKey}
            type="button"
            onClick={() => setActivePeriod(period)}
            className={
              period === activePeriod
                ? 'rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white'
                : 'rounded-xl px-4 py-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900'
            }
          >
            {t(periodKey)}
          </button>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t('card.balance')}
          value={money(summary.balanceAvailable)}
          icon={Wallet}
          accent="indigo"
          hint={PERIOD_HINT[activePeriod]}
        />
        <StatCard
          label={t('card.income')}
          value={money(summary.monthlyIncome)}
          icon={TrendingUp}
          accent="emerald"
          hint={PERIOD_CAPTION[activePeriod]}
        />
        <StatCard
          label={t('card.expenses')}
          value={money(summary.monthlyExpenses)}
          icon={TrendingDown}
          accent="rose"
          hint={PERIOD_CAPTION[activePeriod]}
        />
        <StatCard label={t('card.topCategory')} value={topCategoryLabel} icon={Tag} accent="violet" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SpendingChartPlaceholder
            data={chartData}
            currency={currency}
            title={PERIOD_CHART_TITLE[activePeriod]}
            subtitle={PERIOD_CHART_SUBTITLE[activePeriod]}
            legend={t('chart.legend')}
          />
        </div>
        <CategoryProgress
          categories={categoryData}
          currency={currency}
          title={t('category.title')}
          caption={PERIOD_CAPTION[activePeriod]}
        />
      </div>

      <div className="mt-6">
        <RecentTransactionsTable
          transactions={recentTransactions}
          currency={currency}
          title={`${t('recent.title')} · ${PERIOD_CAPTION[activePeriod]}`}
          seeAllLabel={t('recent.seeAll')}
          emptyTitle={`No hay movimientos para ${PERIOD_CAPTION[activePeriod].toLowerCase()}.`}
          emptySubtitle="Cuando registres ingresos o gastos reales para este período aparecerán aquí."
        />
      </div>
    </>
  );
}
