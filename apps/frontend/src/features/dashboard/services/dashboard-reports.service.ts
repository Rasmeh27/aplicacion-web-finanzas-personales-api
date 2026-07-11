import apiClient from '@/lib/api/client';

export type FinancialHealthStatus = 'optimal' | 'healthy' | 'stable' | 'weak' | 'critical';

export type FinancialHealthResponse = {
  periodMonth: string;
  totalIncome: number;
  totalExpense: number;
  monthlyBalance: number;
  savingsPercentage: number | null;
  debtIncomeRatio: number | null;
  totalDebtRemaining: number;
  goalsProgressPercentage: number;
  financialHealthScore: number;
  status: FinancialHealthStatus;
  recommendations: string[];
  currency: string;
};

type MonthlyParams = { year: number; month: number };

export const dashboardReportsService = {
  async monthlyIncomeTotal(params: MonthlyParams): Promise<{ totalIncome: number; currency: string }> {
    const { data } = await apiClient.get('/dashboard-reports/monthly-income-total', { params });
    return data;
  },

  async monthlyExpenseTotal(params: MonthlyParams): Promise<{ totalExpense: number; currency: string }> {
    const { data } = await apiClient.get('/dashboard-reports/monthly-expense-total', { params });
    return data;
  },

  async monthlyBalance(params: MonthlyParams): Promise<{ totalIncome: number; totalExpense: number; balance: number; currency: string }> {
    const { data } = await apiClient.get('/dashboard-reports/monthly-balance', { params });
    return data;
  },

  async savingsPercentage(params: MonthlyParams): Promise<{ savingsPercentage: number | null }> {
    const { data } = await apiClient.get('/dashboard-reports/savings-percentage', { params });
    return data;
  },

  async expensesByCategory(params: MonthlyParams): Promise<Array<{ categoryId: string | null; categoryName: string; total: number; currency: string }>> {
    const { data } = await apiClient.get('/dashboard-reports/expenses-by-category', { params });
    return data;
  },

  async financialGoalsSummary(): Promise<{ totalGoals: number; completedGoals: number; totalTargetAmount: number; totalCurrentAmount: number; progressPercentage: number; currency: string }> {
    const { data } = await apiClient.get('/dashboard-reports/financial-goals-summary');
    return data;
  },

  async debtsSummary(): Promise<{ totalDebts: number; activeDebts: number; totalDebtAmount: number; totalPaidAmount: number; totalRemainingAmount: number; currency: string }> {
    const { data } = await apiClient.get('/dashboard-reports/debts-summary');
    return data;
  },

  async financialHealth(params: MonthlyParams): Promise<FinancialHealthResponse> {
    const { data } = await apiClient.get<FinancialHealthResponse>('/dashboard-reports/financial-health', { params });
    return data;
  },
};
