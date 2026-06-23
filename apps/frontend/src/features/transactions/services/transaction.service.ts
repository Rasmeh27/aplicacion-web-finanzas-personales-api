import apiClient from '@/lib/api/client';
import type {
  CreateTransactionPayload,
  Transaction,
  TransactionFilters,
  TransactionListResponse,
  TransactionSummary,
  UpdateTransactionPayload,
} from '../types';

const buildParams = (filters: TransactionFilters): Record<string, unknown> => {
  const params: Record<string, unknown> = {};
  if (filters.type) params.type = filters.type;
  if (filters.classification) params.classification = filters.classification;
  if (filters.categoryId) params.categoryId = filters.categoryId;
  if (filters.startDate) params.startDate = filters.startDate;
  if (filters.endDate) params.endDate = filters.endDate;
  if (filters.search) params.search = filters.search;
  if (filters.limit !== undefined) params.limit = filters.limit;
  if (filters.offset !== undefined) params.offset = filters.offset;
  return params;
};

export const transactionService = {
  async list(filters: TransactionFilters = {}): Promise<TransactionListResponse> {
    const { data } = await apiClient.get<TransactionListResponse>('/transactions', {
      params: buildParams(filters),
    });
    return data;
  },

  async getSummary(year?: number, month?: number): Promise<TransactionSummary> {
    const params: Record<string, number> = {};
    if (year !== undefined) params.year = year;
    if (month !== undefined) params.month = month;
    const { data } = await apiClient.get<TransactionSummary>('/transactions/summary', { params });
    return data;
  },

  async create(payload: CreateTransactionPayload): Promise<Transaction> {
    const { data } = await apiClient.post<Transaction>('/transactions', payload);
    return data;
  },

  async update(id: string, payload: UpdateTransactionPayload): Promise<Transaction> {
    const { data } = await apiClient.put<Transaction>(`/transactions/${id}`, payload);
    return data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/transactions/${id}`);
  },
};
