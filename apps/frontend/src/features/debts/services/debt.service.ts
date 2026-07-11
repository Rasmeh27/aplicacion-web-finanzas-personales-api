import apiClient from '@/lib/api/client';
import type {
  CreateDebtPayload,
  CreateDebtPaymentPayload,
  Debt,
  DebtPayment,
  DebtSummary,
} from '../types';

const currentMonthParams = () => {
  const today = new Date();
  return {
    month: today.getMonth() + 1,
    year: today.getFullYear(),
  };
};

export const debtService = {
  async list(): Promise<Debt[]> {
    const { data } = await apiClient.get<Debt[]>('/planning/debts');
    return data;
  },

  async summary(): Promise<DebtSummary> {
    const { data } = await apiClient.get<DebtSummary>('/planning/debts/summary', {
      params: currentMonthParams(),
    });
    return data;
  },

  async create(payload: CreateDebtPayload): Promise<Debt> {
    const { data } = await apiClient.post<Debt>('/planning/debts', payload);
    return data;
  },

  async update(debtId: string, payload: CreateDebtPayload): Promise<Debt> {
    const { data } = await apiClient.patch<Debt>(`/planning/debts/${debtId}`, payload);
    return data;
  },

  async remove(debtId: string): Promise<void> {
    await apiClient.delete(`/planning/debts/${debtId}`);
  },

  async registerPayment(debtId: string, payload: CreateDebtPaymentPayload): Promise<DebtPayment> {
    const { data } = await apiClient.post<DebtPayment>(`/planning/debts/${debtId}/payments`, payload);
    return data;
  },

  async listPayments(debtId: string): Promise<DebtPayment[]> {
    const { data } = await apiClient.get<DebtPayment[]>(`/planning/debts/${debtId}/payments`);
    return data;
  },
};
