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

  async forgotPassword(email: string): Promise<{ message: string }> {
    const { data } = await apiClient.post<{ message: string }>('/auth/forgot-password', { email });
    return data;
  },

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    const { data } = await apiClient.post<{ message: string }>('/auth/reset-password', { token, password });
    return data;
  },

  async logout(refreshToken: string | null): Promise<void> {
    await apiClient.post('/auth/logout', { refreshToken });
  },
};
