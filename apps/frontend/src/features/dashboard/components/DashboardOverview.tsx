'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Tag, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { useAuthStore } from '@/store/slices/auth.store';
import { formatCurrency } from '@/shared/utils/format-currency';
import { useTranslation } from '@/shared/i18n/useTranslation';
import type { TranslationKey } from '@/shared/i18n/translations';
import { type DashboardPeriod } from '../utils/dashboard-data';
import { transactionService } from '@/features/transactions/services/transaction.service';
import { CLASSIFICATION_META, type Transaction } from '@/features/transactions/types';
import type { RecentTransaction } from '../data/dashboard.mock';
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

type DashboardSummaryView = {
  balanceAvailable: number;
  monthlyIncome: number;
  monthlyExpenses: number;
};

const toDateString = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const getPeriodRange = (period: DashboardPeriod): { startDate: string; endDate: string } => {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(end);

  if (period === 'week') {
    start.setDate(end.getDate() - 6);
  } else if (period === 'month') {
    start.setDate(1);
  } else if (period === 'year') {
    start.setMonth(0, 1);
  }

  return { startDate: toDateString(start), endDate: toDateString(end) };
};

const formatTxDate = (value: string): string => {
  const [datePart] = value.split('T');
  const date = new Date(`${datePart}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-DO', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
};

const todayDateString = (): string => toDateString(new Date());

const getTransactionDateState = (transaction: Transaction) => {
  const isScheduled = transaction.date > todayDateString();
  const executionDate = formatTxDate(transaction.date);
  const registeredDate = formatTxDate(transaction.createdAt);

  if (isScheduled) {
    return {
      date: `Se realizará el ${executionDate}`,
      dateDetail: `Registrada el ${registeredDate}`,
      dateStatus: 'scheduled' as const,
      method: 'Programada',
    };
  }

  return {
    date: 'Realizada',
    dateDetail: executionDate,
    dateStatus: 'completed' as const,
    method: 'Registrado',
  };
};

const toRecentTransaction = (transaction: Transaction): RecentTransaction => {
  const meta = CLASSIFICATION_META[transaction.classification];
  const dateState = getTransactionDateState(transaction);
  const type =
    transaction.classification === 'regular_income' || transaction.classification === 'extra_income'
      ? 'Ingreso'
      : transaction.classification === 'fixed_expense'
        ? 'Gasto Fijo'
        : 'Gasto Variable';

  return {
    id: transaction.id,
    merchant: transaction.description || meta.label,
    category: transaction.category?.name ?? meta.label,
    date: dateState.date,
    dateDetail: dateState.dateDetail,
    dateStatus: dateState.dateStatus,
    method: dateState.method,
    amount: Number(transaction.amount),
    type,
  };
};

const buildRealDashboard = (transactions: Transaction[]) => {
  const income = transactions
    .filter((tx) => CLASSIFICATION_META[tx.classification].type === 'income')
    .reduce((sum, tx) => sum + Number(tx.amount), 0);
  const fixedExpenses = transactions
    .filter((tx) => tx.classification === 'fixed_expense')
    .reduce((sum, tx) => sum + Number(tx.amount), 0);
  const variableExpenses = transactions
    .filter((tx) => tx.classification === 'variable_expense')
    .reduce((sum, tx) => sum + Number(tx.amount), 0);
  const expenses = fixedExpenses + variableExpenses;
  const balance = income - expenses;

  const expensesByCategory = new Map<string, number>();
  transactions
    .filter((tx) => CLASSIFICATION_META[tx.classification].type === 'expense')
    .forEach((tx) => {
      const categoryName = tx.category?.name ?? CLASSIFICATION_META[tx.classification].label;
      expensesByCategory.set(categoryName, (expensesByCategory.get(categoryName) ?? 0) + Number(tx.amount));
    });

  const [topCategoryName] = [...expensesByCategory.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];

  const summary: DashboardSummaryView = {
    balanceAvailable: balance,
    monthlyIncome: income,
    monthlyExpenses: expenses,
  };

  return {
    summary,
    topCategoryLabel: topCategoryName ?? '-',
    chartData: [
      { label: 'Fijos', amount: fixedExpenses },
      { label: 'Variables', amount: variableExpenses },
      { label: 'Ahorro', amount: 0 },
      { label: 'Balance', amount: Math.max(balance, 0) },
    ].map((bar, _, bars) => ({
      ...bar,
      highlight: bar.amount > 0 && bar.amount === Math.max(...bars.map((item) => item.amount)),
    })),
    categoryData: [...expensesByCategory.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name, amount]) => ({
        name,
        amount,
        pct: expenses > 0 ? Math.round((amount / expenses) * 100) : 0,
      })),
  };
};

export function DashboardOverview() {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const currency = user?.primaryCurrency ?? 'DOP';
  const [activePeriod, setActivePeriod] = useState<DashboardPeriod>('month');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [registeredTransactions, setRegisteredTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);

  const loadTransactions = useCallback(async () => {
    setTransactionsLoading(true);
    try {
      const range = getPeriodRange(activePeriod);
      const pageSize = 100;
      let offset = 0;
      let hasMore = true;
      const allItems: Transaction[] = [];

      while (hasMore) {
        const response = await transactionService.list({ ...range, limit: pageSize, offset });
        allItems.push(...response.items);
        hasMore = response.hasMore;
        offset += pageSize;
      }

      setTransactions(allItems);
      const registeredResponse = await transactionService.list({ limit: pageSize, offset: 0 });
      setRegisteredTransactions(registeredResponse.items);
    } catch {
      setTransactions([]);
      setRegisteredTransactions([]);
    } finally {
      setTransactionsLoading(false);
    }
  }, [activePeriod]);

  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions]);

  const realDashboard = useMemo(() => buildRealDashboard(transactions), [transactions]);
  const summary = realDashboard.summary;

  const money = (value: number) => formatCurrency(value, currency);

  const chartData = realDashboard.chartData;
  const categoryData = realDashboard.categoryData;
  const recentTransactions = useMemo(() => {
    return [...registeredTransactions]
      .sort((a, b) => {
        const createdDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (createdDiff !== 0) return createdDiff;
        return b.date.localeCompare(a.date);
      })
      .slice(0, 6)
      .map(toRecentTransaction);
  }, [registeredTransactions]);
  const topCategoryLabel = realDashboard.topCategoryLabel;

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
            subtitle={transactionsLoading ? 'Cargando movimientos reales...' : PERIOD_CHART_SUBTITLE[activePeriod]}
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
          title="Movimientos registrados recientemente"
          seeAllLabel={t('recent.seeAll')}
          emptyTitle="Aún no hay movimientos registrados."
          emptySubtitle="Cuando registres ingresos o gastos reales aparecerán aquí."
        />
      </div>
    </>
  );
}
