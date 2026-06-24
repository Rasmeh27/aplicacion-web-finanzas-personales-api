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

export const categoryService = {
  async list(params: ListCategoriesParams = {}): Promise<Category[]> {
    const { data } = await apiClient.get<Category[]>('/category', { params });
    return data;
  },
};
