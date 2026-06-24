import type { AuthUser } from '@/types/auth';

export type FinancialOverview = {
  income: number;
  fixedExpenses: number;
  variableExpenses: number;
  totalExpenses: number;
  savingTarget: number;
  balance: number;
  /** Share of income spent (0..n). */
  expenseRatio: number;
  /** Share of income set aside for savings (0..n). */
  savingsRate: number;
};

export type HealthTone = 'excellent' | 'good' | 'fair' | 'poor' | 'empty';

export type HealthScore = {
  /** 0..1000 score. */
  score: number;
  /** 0..100, useful for progress bars. */
  pct: number;
  tone: HealthTone;
};

export type SpendingBarKey = 'fixed' | 'variable' | 'savings' | 'balance';
export type DerivedSpendingBar = { key: SpendingBarKey; amount: number; highlight?: boolean };

export type ExpenseCategoryKey = 'fixedExpenses' | 'variableExpenses' | 'savingTarget' | 'freeBalance';
export type DerivedCategory = { key: ExpenseCategoryKey; pct: number };

export type TopCategoryKey = 'fixed' | 'variable' | 'none';
export type DerivedSummary = {
  balanceAvailable: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  topCategoryKey: TopCategoryKey;
};

const toNumber = (value: number | null | undefined): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

const clamp01 = (value: number): number => Math.min(Math.max(value, 0), 1);

/** Build a normalized financial overview from the logged-in user's profile data. */
export function getFinancialOverview(user: AuthUser | null): FinancialOverview {
  const income = toNumber(user?.monthlyIncomeEstimate);
  const fixedExpenses = toNumber(user?.monthlyFixedExpenseEstimate);
  const variableExpenses = toNumber(user?.monthlyVariableExpenseEstimate);
  const totalExpenses = fixedExpenses + variableExpenses;

  // Prefer the explicit saving amount; otherwise derive it from the saving target %.
  const savingTargetAmount = toNumber(user?.monthlySavingTargetAmount);
  const savingTargetPct = toNumber(user?.monthlySavingTargetPct);
  const savingTarget = savingTargetAmount > 0 ? savingTargetAmount : (income * savingTargetPct) / 100;

  const balance = income - totalExpenses;
  const expenseRatio = income > 0 ? totalExpenses / income : 0;
  const savingsRate = income > 0 ? savingTarget / income : 0;

  return {
    income,
    fixedExpenses,
    variableExpenses,
    totalExpenses,
    savingTarget,
    balance,
    expenseRatio,
    savingsRate,
  };
}

function getHealthTone(score: number): HealthTone {
  if (score >= 800) return 'excellent';
  if (score >= 650) return 'good';
  if (score >= 450) return 'fair';
  return 'poor';
}

/**
 * Heuristic financial health score derived from the user's own numbers:
 * - how little of their income goes to expenses,
 * - how much they target for savings,
 * - how large their monthly surplus is.
 */
export function getHealthScore(user: AuthUser | null): HealthScore {
  const overview = getFinancialOverview(user);

  if (overview.income <= 0) {
    return { score: 0, pct: 0, tone: 'empty' };
  }

  const expenseScore = clamp01((1 - overview.expenseRatio) / 0.6); // spending <=40% of income -> full
  const savingsScore = clamp01(overview.savingsRate / 0.2); // saving >=20% of income -> full
  const surplusScore = clamp01(overview.balance / overview.income / 0.3); // >=30% surplus -> full

  const score01 = 0.45 * expenseScore + 0.35 * savingsScore + 0.2 * surplusScore;
  const score = Math.round(score01 * 1000);

  return { score, pct: Math.round(score01 * 100), tone: getHealthTone(score) };
}

/** Monthly distribution bars (fixed, variable, savings, surplus) for the spending chart. */
export function getSpendingBars(user: AuthUser | null): DerivedSpendingBar[] {
  const overview = getFinancialOverview(user);
  const bars: DerivedSpendingBar[] = [
    { key: 'fixed', amount: overview.fixedExpenses },
    { key: 'variable', amount: overview.variableExpenses },
    { key: 'savings', amount: overview.savingTarget },
    { key: 'balance', amount: Math.max(overview.balance, 0) },
  ];

  const maxAmount = Math.max(...bars.map((bar) => bar.amount), 0);
  return bars.map((bar) => ({ ...bar, highlight: maxAmount > 0 && bar.amount === maxAmount }));
}

/** Expense / savings breakdown as a share of income. */
export function getExpenseCategories(user: AuthUser | null): DerivedCategory[] {
  const overview = getFinancialOverview(user);
  const reference = overview.income > 0 ? overview.income : overview.totalExpenses;
  const toPct = (value: number) => (reference > 0 ? Math.round((value / reference) * 100) : 0);

  return [
    { key: 'fixedExpenses', pct: toPct(overview.fixedExpenses) },
    { key: 'variableExpenses', pct: toPct(overview.variableExpenses) },
    { key: 'savingTarget', pct: toPct(overview.savingTarget) },
    { key: 'freeBalance', pct: toPct(Math.max(overview.balance, 0)) },
  ];
}

/** Top-line summary cards derived from the user's data. */
export function getDashboardSummary(user: AuthUser | null): DerivedSummary {
  const overview = getFinancialOverview(user);

  let topCategoryKey: TopCategoryKey = 'none';
  if (overview.variableExpenses > overview.fixedExpenses) {
    topCategoryKey = 'variable';
  } else if (overview.fixedExpenses > 0) {
    topCategoryKey = 'fixed';
  }

  return {
    balanceAvailable: overview.balance,
    monthlyIncome: overview.income,
    monthlyExpenses: overview.totalExpenses,
    topCategoryKey,
  };
}
