export type BudgetStatus = 'safe' | 'warning' | 'exceeded';

export type BudgetCategory = {
  id: string;
  name: string;
  classification: string | null;
  icon: string | null;
  color: string | null;
};

export type Budget = {
  id: string;
  name: string;
  category: BudgetCategory | null;
  categoryId: string | null;
  month: number;
  year: number;
  amountLimit: number;
  spentAmount: number;
  remainingAmount: number;
  usagePct: number;
  status: BudgetStatus;
  currency: string;
  alertThresholdPct: number;
  isActive: boolean;
};

export type BudgetListResponse = {
  items: Budget[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
};

export type BudgetSummary = {
  month: number;
  year: number;
  totalBudgeted: number;
  totalSpent: number;
  totalRemaining: number;
  overallUsagePct: number;
  activeBudgetsCount: number;
  exceededBudgetsCount: number;
  warningBudgetsCount: number;
  safeBudgetsCount: number;
  categoriesWithoutBudget: number;
};

export type BudgetFilters = {
  month?: number;
  year?: number;
  categoryId?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
};

export type CreateBudgetPayload = {
  categoryId: string;
  month: number;
  year: number;
  amountLimit: number;
  currency: string;
  alertThresholdPct: number;
  isActive?: boolean;
};

export type UpdateBudgetPayload = {
  amountLimit?: number;
  alertThresholdPct?: number;
  currency?: string;
  isActive?: boolean;
};

export const BUDGET_STATUS_META: Record<
  BudgetStatus,
  { label: string; badge: string; bar: string }
> = {
  safe: { label: 'En control', badge: 'bg-emerald-50 text-emerald-700', bar: 'bg-emerald-500' },
  warning: { label: 'Cerca del límite', badge: 'bg-amber-50 text-amber-700', bar: 'bg-amber-500' },
  exceeded: { label: 'Excedido', badge: 'bg-rose-50 text-rose-700', bar: 'bg-rose-500' },
};

export const MONTH_LABELS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];
