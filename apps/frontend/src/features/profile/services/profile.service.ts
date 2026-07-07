import apiClient from '@/lib/api/client';
import type { AuthUser } from '@/types/auth';

export type UpdateUserPreferencesPayload = {
  fullName?: string;
  primaryCurrency: 'DOP' | 'USD' | 'EUR';
  monthlyIncomeEstimate?: number;
  monthlySavingTargetPct?: number;
  monthlySavingTargetAmount?: number;
  monthlyFixedExpenseEstimate?: number;
  monthlyVariableExpenseEstimate?: number;
};

export type UserProfileResponse = Partial<AuthUser> & {
  id: string;
  email?: string;
  fullName?: string | null;
  primaryCurrency?: string;
  createdAt?: string;
  updatedAt?: string;
};

export const profileService = {
  async getMe(): Promise<UserProfileResponse | null> {
    const { data } = await apiClient.get<UserProfileResponse | null>('/user/me');
    return data;
  },

  async updatePreferences(payload: UpdateUserPreferencesPayload): Promise<UserProfileResponse> {
    const { data } = await apiClient.patch<UserProfileResponse>('/user/me/preferences', payload);
    return data;
  },
};
