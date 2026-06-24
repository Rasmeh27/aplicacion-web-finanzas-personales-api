import apiClient from '@/lib/api/client';
import type {
  Budget,
  BudgetFilters,
  BudgetListResponse,
  BudgetSummary,
  CreateBudgetPayload,
  UpdateBudgetPayload,
} from '../types';

const buildParams = (filters: BudgetFilters): Record<string, unknown> => {
  const params: Record<string, unknown> = {};
  if (filters.month !== undefined) params.month = filters.month;
  if (filters.year !== undefined) params.year = filters.year;
  if (filters.categoryId) params.categoryId = filters.categoryId;
  if (filters.isActive !== undefined) params.isActive = filters.isActive;
  if (filters.limit !== undefined) params.limit = filters.limit;
  if (filters.offset !== undefined) params.offset = filters.offset;
  return params;
};

export const budgetService = {
  async getBudgets(filters: BudgetFilters = {}): Promise<BudgetListResponse> {
    const { data } = await apiClient.get<BudgetListResponse>('/budgets', {
      params: buildParams(filters),
    });
    return data;
  },

  async getBudgetSummary(month?: number, year?: number): Promise<BudgetSummary> {
    const params: Record<string, number> = {};
    if (month !== undefined) params.month = month;
    if (year !== undefined) params.year = year;
    const { data } = await apiClient.get<BudgetSummary>('/budgets/summary', { params });
    return data;
  },

  async getBudget(id: string): Promise<Budget> {
    const { data } = await apiClient.get<Budget>(`/budgets/${id}`);
    return data;
  },

  async createBudget(payload: CreateBudgetPayload): Promise<Budget> {
    const { data } = await apiClient.post<Budget>('/budgets', payload);
    return data;
  },

  async updateBudget(id: string, payload: UpdateBudgetPayload): Promise<Budget> {
    const { data } = await apiClient.patch<Budget>(`/budgets/${id}`, payload);
    return data;
  },

  async deleteBudget(id: string): Promise<{ id: string; isActive: boolean }> {
    const { data } = await apiClient.delete<{ id: string; isActive: boolean }>(`/budgets/${id}`);
    return data;
  },
};
