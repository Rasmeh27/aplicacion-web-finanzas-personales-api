'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, Plus, Tag, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { useAuthStore } from '@/store/slices/auth.store';
import { formatCurrency } from '@/shared/utils/format-currency';
import { useTranslation } from '@/shared/i18n/useTranslation';
import type { TranslationKey } from '@/shared/i18n/translations';
import {
  getDashboardSummary,
  getExpenseCategories,
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
  const user = useAuthStore((state) => state.user);
  const currency = user?.primaryCurrency ?? 'DOP';
  const [activePeriod, setActivePeriod] = useState<DashboardPeriod>('month');

  const summary = useMemo(() => getDashboardSummary(user, activePeriod), [activePeriod, user]);
  const spendingBars = useMemo(() => getSpendingBars(user, activePeriod), [activePeriod, user]);
  const categories = useMemo(() => getExpenseCategories(user, activePeriod), [activePeriod, user]);

  const money = (value: number) => formatCurrency(value, currency);

  const chartData = spendingBars.map((bar) => ({
    label: t(CHART_BAR_LABEL[bar.key]),
    amount: bar.amount,
    highlight: bar.highlight,
  }));

  const categoryData = categories.map((category) => ({
    name: t(CATEGORY_LABEL[category.key]),
    pct: category.pct,
  }));

  const topCategoryLabel =
    summary.topCategoryKey === 'none'
      ? t('topCategory.none')
      : t(summary.topCategoryKey === 'fixed' ? 'category.fixedExpenses' : 'category.variableExpenses');

  return (
    <>
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-950/5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-indigo-600">
              <CalendarDays className="h-3.5 w-3.5" />
              {PERIOD_CAPTION[activePeriod]}
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{t('dashboard.title')}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              {t('dashboard.subtitle')} Cambia entre hoy, semana, mes y año para ver cómo se mueven tus números.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[480px]">
            <div className="rounded-2xl bg-indigo-50 px-4 py-3">
              <p className="text-xs font-bold text-indigo-500">Balance</p>
              <p className="mt-1 text-lg font-black text-indigo-950">{money(summary.balanceAvailable)}</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 px-4 py-3">
              <p className="text-xs font-bold text-emerald-500">Ingresos</p>
              <p className="mt-1 text-lg font-black text-emerald-950">{money(summary.monthlyIncome)}</p>
            </div>
            <div className="rounded-2xl bg-rose-50 px-4 py-3">
              <p className="text-xs font-bold text-rose-500">Gastos</p>
              <p className="mt-1 text-lg font-black text-rose-950">{money(summary.monthlyExpenses)}</p>
            </div>
          </div>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-sm shadow-indigo-600/25 transition hover:bg-indigo-700 xl:self-start"
          >
            <Plus className="h-4 w-4" />
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
        <CategoryProgress categories={categoryData} title={t('category.title')} caption={PERIOD_CAPTION[activePeriod]} />
      </div>

      <div className="mt-6">
        <RecentTransactionsTable
          transactions={[]}
          currency={currency}
          title={t('recent.title')}
          seeAllLabel={t('recent.seeAll')}
          emptyTitle={t('recent.emptyTitle')}
          emptySubtitle={t('recent.emptySubtitle')}
        />
      </div>
    </>
  );
}
