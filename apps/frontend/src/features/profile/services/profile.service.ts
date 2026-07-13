import apiClient from '@/lib/api/client';
import type { AuthUser } from '@/types/auth';

export type UpdateUserPreferencesPayload = {
  fullName?: string;
  primaryCurrency: 'DOP' | 'USD' | 'EUR';
  country?: string | null;
  timezone?: string | null;
  phoneNumber?: string | null;
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
  country?: string | null;
  timezone?: string | null;
  phoneNumber?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type AccountExportResponse = {
  exportedAt: string;
  profile: UserProfileResponse;
  data: Record<string, unknown[]>;
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

  async exportAccountData(): Promise<AccountExportResponse> {
    const { data } = await apiClient.get<AccountExportResponse>('/user/me/export');
    return data;
  },

  async deleteMe(): Promise<void> {
    await apiClient.delete('/user/me');
  },
};
