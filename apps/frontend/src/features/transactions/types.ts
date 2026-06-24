export type TransactionType = 'income' | 'expense';

export type TransactionClassification =
  | 'regular_income'
  | 'extra_income'
  | 'fixed_expense'
  | 'variable_expense';

export type TransactionCategory = {
  id: string;
  name: string;
  icon?: string | null;
  color?: string | null;
};

export type Transaction = {
  id: string;
  userId: string;
  type: TransactionType;
  classification: TransactionClassification;
  amount: number | string;
  currency: string;
  description: string | null;
  notes: string | null;
  date: string;
  categoryId: string | null;
  category?: TransactionCategory | null;
  createdAt: string;
  updatedAt: string;
};

export type TransactionListResponse = {
  items: Transaction[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
};

export type TransactionSummary = {
  year: number;
  month: number;
  totalIncome: number;
  totalRegularIncome: number;
  totalExtraIncome: number;
  totalExpenses: number;
  totalFixedExpenses: number;
  totalVariableExpenses: number;
  balance: number;
  savingsRate: number;
  transactionCount: number;
};

export type TransactionFilters = {
  type?: TransactionType;
  classification?: TransactionClassification;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  limit?: number;
  offset?: number;
};

export type CreateTransactionPayload = {
  classification: TransactionClassification;
  amount: number;
  currency: string;
  date: string;
  categoryId?: string;
  description: string;
  notes?: string;
};

export type UpdateTransactionPayload = Partial<CreateTransactionPayload>;

/** Etiquetas y metadatos de las clasificaciones (sin inversiones). */
export const CLASSIFICATION_META: Record<
  TransactionClassification,
  { label: string; type: TransactionType }
> = {
  regular_income: { label: 'Ingreso regular', type: 'income' },
  extra_income: { label: 'Ingreso extra', type: 'income' },
  fixed_expense: { label: 'Gasto fijo', type: 'expense' },
  variable_expense: { label: 'Gasto variable', type: 'expense' },
};

export const CLASSIFICATION_TO_TYPE: Record<TransactionClassification, TransactionType> = {
  regular_income: 'income',
  extra_income: 'income',
  fixed_expense: 'expense',
  variable_expense: 'expense',
};
