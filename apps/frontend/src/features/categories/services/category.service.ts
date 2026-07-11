import apiClient from '@/lib/api/client';
import type { TransactionClassification } from '@/features/transactions/types';

export type CategoryType = 'income' | 'expense';

export type Category = {
  id: string;
  userId: string;
  name: string;
  type: CategoryType;
  classification: TransactionClassification | null;
  icon: string | null;
  color: string | null;
  isDefault: boolean;
};

export type ListCategoriesParams = {
  type?: CategoryType;
  classification?: TransactionClassification;
};

export type CreateCategoryPayload = {
  name: string;
  type: CategoryType;
  classification?: TransactionClassification;
  icon?: string;
  color?: string;
};

export const categoryService = {
  async list(params: ListCategoriesParams = {}): Promise<Category[]> {
    const { data } = await apiClient.get<Category[]>('/category', { params });
    return data;
  },

  async create(payload: CreateCategoryPayload): Promise<Category> {
    const { data } = await apiClient.post<Category>('/category', payload);
    return data;
  },

  async update(id: string, payload: Partial<CreateCategoryPayload>): Promise<Category> {
    const { data } = await apiClient.patch<Category>(`/category/${id}`, payload);
    return data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/category/${id}`);
  },
};
