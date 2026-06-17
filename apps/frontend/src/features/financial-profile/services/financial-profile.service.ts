import apiClient from '@/lib/api/client';

export type FinancialProfilePayload = {
  primaryCurrency: 'DOP' | 'USD' | 'EUR';
  monthlyIncomeEstimate: number;
  monthlySavingTargetPct: number;
};

export type FinancialProfileResponse = {
  id: string;
  fullName: string | null;
  primaryCurrency: string;
  monthlyIncomeEstimate: number | string;
  monthlySavingTargetPct: number | string;
  monthlySavingTargetAmount?: number | string | null;
  monthlyFixedExpenseEstimate?: number | string;
  monthlyVariableExpenseEstimate?: number | string;
  onboardingCompletedAt?: string | null;
  onboardingVersion?: number;
};

export type FinancialItemFrequency = 'weekly' | 'biweekly' | 'monthly' | 'yearly';

export type FinancialItemPayload = {
  name: string;
  amount: number;
  frequency: FinancialItemFrequency;
  categoryName?: string;
  notes?: string;
};

export type CompleteFinancialOnboardingPayload = {
  primaryCurrency: 'DOP' | 'USD' | 'EUR';
  monthlySavingTargetPct?: number;
  monthlySavingTargetAmount?: number;
  incomeSources: FinancialItemPayload[];
  fixedExpenses?: FinancialItemPayload[];
  variableExpenses?: FinancialItemPayload[];
};

export type PlannedFinancialItemType = 'income' | 'fixed_expense' | 'variable_expense';

export type PlannedFinancialItemResponse = {
  id: string;
  userId: string;
  type: PlannedFinancialItemType;
  name: string;
  amount: number | string;
  currency: string;
  frequency: FinancialItemFrequency;
  categoryName: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type FinancialOnboardingSummary = {
  monthlyIncomeEstimate: number;
  monthlyFixedExpenseEstimate: number;
  monthlyVariableExpenseEstimate: number;
  monthlyTotalExpenseEstimate: number;
  monthlyBalanceEstimate: number;
  monthlySavingTargetAmount: number | null;
  monthlySavingTargetPct: number | null;
};

export type CompleteFinancialOnboardingResponse = {
  profile: FinancialProfileResponse;
  plannedItems: PlannedFinancialItemResponse[];
  summary: FinancialOnboardingSummary;
};

export const financialProfileService = {
  async getMyProfile(): Promise<FinancialProfileResponse | null> {
    const { data } = await apiClient.get<FinancialProfileResponse | null>('/financial-profile/me');
    return data;
  },

  async updateMyProfile(payload: FinancialProfilePayload): Promise<FinancialProfileResponse> {
    const { data } = await apiClient.put<FinancialProfileResponse>('/financial-profile/me', payload);
    return data;
  },

  async completeOnboarding(
    payload: CompleteFinancialOnboardingPayload,
  ): Promise<CompleteFinancialOnboardingResponse> {
    const { data } = await apiClient.put<CompleteFinancialOnboardingResponse>(
      '/financial-profile/onboarding',
      payload,
    );
    return data;
  },
};
