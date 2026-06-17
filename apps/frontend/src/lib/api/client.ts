import axios, { type InternalAxiosRequestConfig } from 'axios';

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
const authEndpointPaths = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/logout',
];

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

const getStoredToken = (key: 'accessToken' | 'refreshToken') => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(key);
};

const clearStoredTokens = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
};

const isAuthEndpoint = (url?: string): boolean => {
  if (!url) return false;

  const pathname = url.startsWith('http') ? new URL(url).pathname : url;
  return authEndpointPaths.some((path) => pathname === path || pathname.endsWith(`/api/v1${path}`));
};

apiClient.interceptors.request.use((config) => {
  const token = getStoredToken('accessToken');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined;

    if (
      !originalRequest ||
      error.response?.status !== 401 ||
      originalRequest._retry ||
      isAuthEndpoint(originalRequest.url)
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    const refreshToken = getStoredToken('refreshToken');

    if (!refreshToken) {
      clearStoredTokens();
      return Promise.reject(error);
    }

    try {
      const { data } = await apiClient.post('/auth/refresh', { refreshToken });

      if (!data?.accessToken) {
        clearStoredTokens();
        return Promise.reject(error);
      }

      localStorage.setItem('accessToken', data.accessToken);

      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }

      originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      clearStoredTokens();
      return Promise.reject(refreshError);
    }
  },
);

export default apiClient;
