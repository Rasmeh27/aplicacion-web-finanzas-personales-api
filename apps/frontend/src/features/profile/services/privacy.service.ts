import apiClient from '@/lib/api/client';

export type PrivacySettings = {
  emailNotifications: boolean;
  weeklySummary: boolean;
  budgetAlerts: boolean;
  twoFactor: boolean;
  marketingConsent: boolean;
  dataProcessingConsentAt: string | null;
  updatedAt: string;
};

export const privacyService = {
  async getSettings(): Promise<PrivacySettings> {
    const { data } = await apiClient.get<PrivacySettings>('/privacy/settings');
    return data;
  },

  async updateSettings(payload: Partial<PrivacySettings>): Promise<PrivacySettings> {
    const { data } = await apiClient.patch<PrivacySettings>('/privacy/settings', payload);
    return data;
  },

  async recordConsent(consentType: string, accepted: boolean): Promise<void> {
    await apiClient.post('/privacy/consents', { consentType, accepted });
  },
};
