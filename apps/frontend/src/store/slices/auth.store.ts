import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '@/types/auth';

type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: AuthUser, accessToken: string | null, refreshToken: string | null) => void;
  clearAuth: () => void;
};

const persistTokens = (accessToken: string | null, refreshToken: string | null) => {
  if (typeof window === 'undefined') return;

  if (accessToken) {
    localStorage.setItem('accessToken', accessToken);
  } else {
    localStorage.removeItem('accessToken');
  }

  if (refreshToken) {
    localStorage.setItem('refreshToken', refreshToken);
  } else {
    localStorage.removeItem('refreshToken');
  }
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      setAuth: (user, accessToken, refreshToken) => {
        persistTokens(accessToken, refreshToken);
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: Boolean(accessToken),
        });
      },
      clearAuth: () => {
        persistTokens(null, null);
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },
    }),
    { name: 'moni-auth' },
  ),
);

