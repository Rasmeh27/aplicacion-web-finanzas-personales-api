'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PiggyBank, Plus, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { useAuthStore } from '@/store/slices/auth.store';
import { PageHeader } from '@/shared/components/PageHeader';
import { cn } from '@/shared/utils/cn';
import { formatCurrency } from '@/shared/utils/format-currency';
import { useTranslation } from '@/shared/i18n/useTranslation';
import type { TranslationKey } from '@/shared/i18n/translations';
import { getRecentDashboardTransactions, type DashboardPeriod } from '../utils/dashboard-data';
import { transactionService } from '@/features/transactions/services/transaction.service';
import { CLASSIFICATION_META, type Transaction } from '@/features/transactions/types';
import {
  financialProfileService,
  type FinancialProfileResponse,
} from '@/features/financial-profile/services/financial-profile.service';
import type { AuthUser } from '@/types/auth';
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
  today: 'Gastos y ahorro proyectados para hoy',
  week: 'Gastos y ahorro proyectados para la semana',
  month: 'Gastos fijos, variables y ahorro estimado',
  year: 'Gastos y ahorro proyectados para el año',
};

type DashboardSummaryView = {
  balanceAvailable: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsRate: number;
};

const PERIOD_MULTIPLIER: Record<DashboardPeriod, number> = {
  today: 1 / 30,
  week: 7 / 30,
  month: 1,
  year: 12,
};

type DashboardProfile = Pick<
  AuthUser,
  | 'id'
  | 'email'
  | 'fullName'
  | 'primaryCurrency'
  | 'monthlyIncomeEstimate'
  | 'monthlySavingTargetPct'
  | 'monthlySavingTargetAmount'
  | 'monthlyFixedExpenseEstimate'
  | 'monthlyVariableExpenseEstimate'
  | 'onboardingCompletedAt'
  | 'onboardingVersion'
>;

const toNumber = (value: number | string | null | undefined): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
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

  const summary: DashboardSummaryView = {
    balanceAvailable: balance,
    monthlyIncome: income,
    monthlyExpenses: expenses,
    savingsRate: income > 0 ? Math.round((Math.max(balance, 0) / income) * 100) : 0,
  };

  return {
    summary,
    chartData: [
      { label: 'Fijos', amount: fixedExpenses },
      { label: 'Variables', amount: variableExpenses },
      { label: 'Ahorro', amount: Math.max(balance, 0) },
      { label: 'Balance', amount: balance },
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

const buildMonthlyEvolution = (transactions: Transaction[]) => {
  const now = new Date();
  const months = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (11 - index), 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    return {
      key,
      label: new Intl.DateTimeFormat('es-DO', { month: 'short' }).format(date),
      year: date.getFullYear(),
      income: 0,
      expenses: 0,
      savings: 0,
    };
  });
  const byKey = new Map(months.map((month) => [month.key, month]));

  transactions.forEach((tx) => {
    const key = tx.date.slice(0, 7);
    const month = byKey.get(key);
    if (!month) return;

    const amount = Number(tx.amount);
    if (CLASSIFICATION_META[tx.classification].type === 'income') {
      month.income += amount;
    } else {
      month.expenses += amount;
    }
  });

  return months.map((month) => ({
    ...month,
    savings: Math.max(month.income - month.expenses, 0),
  }));
};

const buildEstimatedDashboard = (profile: DashboardProfile | null, period: DashboardPeriod) => {
  const multiplier = PERIOD_MULTIPLIER[period];
  const monthlyIncome = toNumber(profile?.monthlyIncomeEstimate);
  const monthlyFixedExpenses = toNumber(profile?.monthlyFixedExpenseEstimate);
  const monthlyVariableExpenses = toNumber(profile?.monthlyVariableExpenseEstimate);
  const monthlySavingTargetAmount = toNumber(profile?.monthlySavingTargetAmount);
  const monthlySavingTargetPct = toNumber(profile?.monthlySavingTargetPct);
  const monthlySavingTarget =
    monthlySavingTargetAmount > 0
      ? monthlySavingTargetAmount
      : (monthlyIncome * monthlySavingTargetPct) / 100;

  const income = monthlyIncome * multiplier;
  const fixedExpenses = monthlyFixedExpenses * multiplier;
  const variableExpenses = monthlyVariableExpenses * multiplier;
  const expenses = fixedExpenses + variableExpenses;
  const savingTarget = monthlySavingTarget * multiplier;
  const balance = income - expenses;

  const summary: DashboardSummaryView = {
    balanceAvailable: balance,
    monthlyIncome: income,
    monthlyExpenses: expenses,
    savingsRate: income > 0 ? Math.round((savingTarget / income) * 100) : 0,
  };

  return {
    summary,
    chartData: [
      { label: 'Fijos', amount: fixedExpenses },
      { label: 'Variables', amount: variableExpenses },
      { label: 'Ahorro', amount: savingTarget },
      { label: 'Balance', amount: Math.max(balance, 0) },
    ].map((bar, _, bars) => ({
      ...bar,
      highlight: bar.amount > 0 && bar.amount === Math.max(...bars.map((item) => item.amount)),
    })),
    categoryData: [
      { name: 'Gastos fijos estimados', amount: fixedExpenses },
      { name: 'Gastos variables estimados', amount: variableExpenses },
    ]
      .filter((item) => item.amount > 0)
      .map((item) => ({
        ...item,
        pct: expenses > 0 ? Math.round((item.amount / expenses) * 100) : 0,
      })),
  };
};

const buildEstimatedMonthlyEvolution = (profile: DashboardProfile | null) => {
  const months = buildMonthlyEvolution([]);
  if (!profile) return months;

  const currentMonth = months[months.length - 1];
  if (!currentMonth) return months;

  const income = toNumber(profile.monthlyIncomeEstimate);
  const expenses =
    toNumber(profile.monthlyFixedExpenseEstimate) +
    toNumber(profile.monthlyVariableExpenseEstimate);

  return months.map((month) =>
    month.key === currentMonth.key
      ? {
          ...month,
          income,
          expenses,
          savings: Math.max(income - expenses, 0),
        }
      : month,
  );
};

const normalizeDashboardProfile = (
  profile: FinancialProfileResponse | null,
  user: AuthUser | null,
): DashboardProfile | null => {
  const source = profile ?? user;
  if (!source) return null;

  return {
    id: source.id,
    email: user?.email ?? '',
    fullName: source.fullName ?? user?.fullName ?? null,
    primaryCurrency: source.primaryCurrency ?? user?.primaryCurrency ?? 'DOP',
    monthlyIncomeEstimate: toNumber(source.monthlyIncomeEstimate),
    monthlySavingTargetPct: toNumber(source.monthlySavingTargetPct),
    monthlySavingTargetAmount:
      source.monthlySavingTargetAmount === null || source.monthlySavingTargetAmount === undefined
        ? null
        : toNumber(source.monthlySavingTargetAmount),
    monthlyFixedExpenseEstimate: toNumber(source.monthlyFixedExpenseEstimate),
    monthlyVariableExpenseEstimate: toNumber(source.monthlyVariableExpenseEstimate),
    onboardingCompletedAt: source.onboardingCompletedAt ?? user?.onboardingCompletedAt ?? null,
    onboardingVersion: source.onboardingVersion ?? user?.onboardingVersion ?? 1,
  };
};

export function DashboardOverview() {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [profile, setProfile] = useState<FinancialProfileResponse | null>(null);
  const [activePeriod, setActivePeriod] = useState<DashboardPeriod>('month');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [registeredTransactions, setRegisteredTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    financialProfileService
      .getMyProfile()
      .then((nextProfile) => {
        if (!cancelled) setProfile(nextProfile);
      })
      .catch(() => {
        if (!cancelled) setProfile(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const loadTransactions = useCallback(async () => {
    setTransactionsLoading(true);
    try {
      const pageSize = 100;
      let offset = 0;
      let hasMore = true;
      const allItems: Transaction[] = [];

      while (hasMore) {
        const response = await transactionService.list({ limit: pageSize, offset });
        allItems.push(...response.items);
        hasMore = response.hasMore;
        offset += pageSize;
      }

      const range = getPeriodRange(activePeriod);
      setTransactions(allItems.filter((tx) => tx.date >= range.startDate && tx.date <= range.endDate));
      setRegisteredTransactions(allItems);
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

  const dashboardProfile = useMemo(() => normalizeDashboardProfile(profile, user), [profile, user]);
  const currency = dashboardProfile?.primaryCurrency ?? user?.primaryCurrency ?? 'DOP';
  const hasPeriodTransactions = transactions.length > 0;
  const hasAnyTransactions = registeredTransactions.length > 0;
  const realDashboard = useMemo(
    () =>
      hasPeriodTransactions
        ? buildRealDashboard(transactions)
        : buildEstimatedDashboard(dashboardProfile, activePeriod),
    [activePeriod, dashboardProfile, hasPeriodTransactions, transactions],
  );
  const monthlyEvolution = useMemo(
    () =>
      hasAnyTransactions
        ? buildMonthlyEvolution(registeredTransactions)
        : buildEstimatedMonthlyEvolution(dashboardProfile),
    [dashboardProfile, hasAnyTransactions, registeredTransactions],
  );
  const evolutionMax = useMemo(
    () => Math.max(...monthlyEvolution.flatMap((item) => [item.income, item.expenses, item.savings]), 1),
    [monthlyEvolution],
  );
  const summary = realDashboard.summary;

  const money = (value: number) => formatCurrency(value, currency);

  const chartData = realDashboard.chartData;
  const categoryData = realDashboard.categoryData;
  const recentTransactions = useMemo(() => {
    if (!registeredTransactions.length && dashboardProfile) {
      return getRecentDashboardTransactions(dashboardProfile as AuthUser, activePeriod);
    }

    return [...registeredTransactions]
      .sort((a, b) => {
        const createdDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (createdDiff !== 0) return createdDiff;
        return b.date.localeCompare(a.date);
      })
      .slice(0, 6)
      .map(toRecentTransaction);
  }, [activePeriod, dashboardProfile, registeredTransactions]);
  return (
    <>
      <PageHeader
        title={t('dashboard.title')}
        description={`${t('dashboard.subtitle')} Cambia entre hoy, semana, mes y año para ver cómo se mueven tus números.`}
        action={
          <button
            type="button"
            onClick={() => router.push('/transactions?new=1')}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-indigo-600/25 transition hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-600/25 sm:w-auto sm:min-w-[190px]"
          >
            <Plus className="h-5 w-5" />
            {t('dashboard.addRecord')}
          </button>
        }
      />

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
        <StatCard
          label="Ahorro"
          value={`${summary.savingsRate}%`}
          icon={PiggyBank}
          accent="emerald"
          hint="Del ingreso registrado"
        />
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

      <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-950/5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-950">Evolución mensual</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">Ingresos, gastos y ahorro de los últimos 12 meses.</p>
          </div>
          <span className="hidden rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-600 sm:inline-flex">
            Arrastra para ver más
          </span>
        </div>
        <div className="mt-6 max-h-[540px] space-y-4 overflow-y-auto overscroll-contain pr-2">
          {monthlyEvolution.map((month) => {
            const rows = [
              { label: 'Ingresos', value: month.income, color: 'bg-emerald-500', text: 'text-emerald-600' },
              { label: 'Gastos', value: month.expenses, color: 'bg-rose-500', text: 'text-rose-600' },
              { label: 'Ahorro', value: month.savings, color: 'bg-indigo-600', text: 'text-indigo-600' },
            ];
            const hasData = rows.some((row) => row.value > 0);

            return (
              <div key={month.key} className="grid gap-3 sm:grid-cols-[72px_minmax(0,1fr)] sm:items-center">
                <div className="flex items-center justify-between sm:block">
                  <span className="text-sm font-black uppercase text-slate-500">{month.label}</span>
                  <span className="ml-2 text-xs font-black text-slate-300 sm:ml-0 sm:mt-1 sm:block">{month.year}</span>
                  {!hasData ? (
                    <span className="rounded-full bg-slate-50 px-2.5 py-1 text-xs font-black text-slate-400 sm:mt-2 sm:inline-flex">
                      Sin datos
                    </span>
                  ) : null}
                </div>
                <div className="space-y-2.5 rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
                  {rows.map((row) => {
                    const width = row.value > 0 ? Math.max((row.value / evolutionMax) * 100, 6) : 0;

                    return (
                      <div key={row.label} className="grid grid-cols-[72px_minmax(0,1fr)_94px] items-center gap-3">
                        <span className="text-xs font-black text-slate-500">{row.label}</span>
                        <div className="h-2.5 overflow-hidden rounded-full bg-white shadow-inner shadow-slate-200/60">
                          <div
                            className={cn('h-full rounded-full transition-all', row.color)}
                            style={{ width: `${width}%` }}
                          />
                        </div>
                        <span className={cn('truncate text-right text-xs font-black', row.value > 0 ? row.text : 'text-slate-300')}>
                          {row.value > 0 ? formatCurrency(row.value, currency) : '-'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-5 flex flex-wrap gap-4 text-xs font-bold text-slate-500">
          <span><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />Ingresos</span>
          <span><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-rose-400" />Gastos</span>
          <span><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-indigo-600" />Ahorro</span>
        </div>
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
