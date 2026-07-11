import apiClient from '@/lib/api/client';

export type FinancialHealthStatus = 'excellent' | 'stable' | 'attention' | 'critical';

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

export const dashboardReportsService = {
  async financialHealth(params: { year: number; month: number }): Promise<FinancialHealthResponse> {
    const { data } = await apiClient.get<FinancialHealthResponse>('/dashboard-reports/financial-health', { params });
    return data;
  },
};
