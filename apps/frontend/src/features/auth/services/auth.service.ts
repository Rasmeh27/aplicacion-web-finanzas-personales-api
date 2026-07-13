import apiClient from '@/lib/api/client';
import type { AuthenticatedResponse, AuthResponse, LoginRequest, RegisterRequest } from '@/types/auth';

export const authService = {
  async login(payload: LoginRequest): Promise<AuthenticatedResponse> {
    const { data } = await apiClient.post<AuthenticatedResponse>('/auth/login', payload);
    return data;
  },

  async register(payload: RegisterRequest): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>('/auth/register', payload);
    return data;
  },

  async forgotPassword(email: string): Promise<void> {
    await apiClient.post('/auth/forgot-password', { email });
  },

  async resetPassword(payload: {
    code?: string;
    tokenHash?: string;
    accessToken?: string;
    refreshToken?: string;
    password: string;
  }): Promise<void> {
    await apiClient.post('/auth/reset-password', payload);
  },

  async logout(accessToken: string | null, refreshToken: string | null): Promise<void> {
    if (!accessToken || !refreshToken) return;
    await apiClient.post('/auth/logout', { accessToken, refreshToken });
  },
};
