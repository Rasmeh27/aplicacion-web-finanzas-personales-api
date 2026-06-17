'use client';

import { useMemo } from 'react';
import { Plus, Tag, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { useAuthStore } from '@/store/slices/auth.store';
import { formatCurrency } from '@/shared/utils/format-currency';
import { useTranslation } from '@/shared/i18n/useTranslation';
import type { TranslationKey } from '@/shared/i18n/translations';
import {
  getDashboardSummary,
  getExpenseCategories,
  getSpendingBars,
  type ExpenseCategoryKey,
  type SpendingBarKey,
} from '../utils/dashboard-data';
import { CategoryProgress } from './CategoryProgress';
import { RecentTransactionsTable } from './RecentTransactionsTable';
import { SpendingChartPlaceholder } from './SpendingChartPlaceholder';
import { StatCard } from './StatCard';

const PERIOD_KEYS: TranslationKey[] = ['period.today', 'period.week', 'period.month', 'period.year'];
const ACTIVE_PERIOD: TranslationKey = 'period.month';

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

  const summary = useMemo(() => getDashboardSummary(user), [user]);
  const spendingBars = useMemo(() => getSpendingBars(user), [user]);
  const categories = useMemo(() => getExpenseCategories(user), [user]);

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
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{t('dashboard.title')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('dashboard.subtitle')}</p>
        </div>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-sm shadow-indigo-600/25 transition hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          {t('dashboard.addRecord')}
        </button>
      </header>

      <div className="mt-6 inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
        {PERIOD_KEYS.map((periodKey) => (
          <span
            key={periodKey}
            className={
              periodKey === ACTIVE_PERIOD
                ? 'rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white'
                : 'rounded-xl px-4 py-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900'
            }
          >
            {t(periodKey)}
          </span>
        ))}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t('card.balance')}
          value={money(summary.balanceAvailable)}
          icon={Wallet}
          accent="indigo"
          hint={t('hint.estimatedMonthly')}
        />
        <StatCard
          label={t('card.income')}
          value={money(summary.monthlyIncome)}
          icon={TrendingUp}
          accent="emerald"
          hint={t('hint.monthly')}
        />
        <StatCard
          label={t('card.expenses')}
          value={money(summary.monthlyExpenses)}
          icon={TrendingDown}
          accent="rose"
          hint={t('hint.monthly')}
        />
        <StatCard label={t('card.topCategory')} value={topCategoryLabel} icon={Tag} accent="violet" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SpendingChartPlaceholder
            data={chartData}
            currency={currency}
            title={t('chart.title')}
            subtitle={t('chart.subtitle')}
            legend={t('chart.legend')}
          />
        </div>
        <CategoryProgress categories={categoryData} title={t('category.title')} caption={t('category.caption')} />
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
