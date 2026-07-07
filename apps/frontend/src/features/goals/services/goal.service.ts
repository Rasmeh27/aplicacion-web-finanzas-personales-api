import apiClient from '@/lib/api/client';
import type {
  ConfigureEmergencyFundPayload,
  CreateContributionPayload,
  CreateGoalPayload,
  FinancialGoal,
  GoalContribution,
  GoalsSummary,
  UpdateGoalPayload,
} from '../types';

export const goalService = {
  async list(): Promise<FinancialGoal[]> {
    const { data } = await apiClient.get<FinancialGoal[]>('/planning/goals');
    return data;
  },

  async getSummary(): Promise<GoalsSummary> {
    const { data } = await apiClient.get<GoalsSummary>('/planning/goals/summary');
    return data;
  },

  async create(payload: CreateGoalPayload): Promise<FinancialGoal> {
    const { data } = await apiClient.post<FinancialGoal>('/planning/goals', payload);
    return data;
  },

  async update(id: string, payload: UpdateGoalPayload): Promise<FinancialGoal> {
    const { data } = await apiClient.patch<FinancialGoal>(`/planning/goals/${id}`, payload);
    return data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/planning/goals/${id}`);
  },

  async addContribution(
    id: string,
    payload: CreateContributionPayload,
  ): Promise<{ goal: FinancialGoal; contribution: GoalContribution }> {
    const { data } = await apiClient.post<{ goal: FinancialGoal; contribution: GoalContribution }>(
      `/planning/goals/${id}/contributions`,
      payload,
    );
    return data;
  },

  async listContributions(id: string): Promise<GoalContribution[]> {
    const { data } = await apiClient.get<GoalContribution[]>(`/planning/goals/${id}/contributions`);
    return data;
  },

  async configureEmergencyFund(
    payload: ConfigureEmergencyFundPayload = {},
  ): Promise<FinancialGoal> {
    const { data } = await apiClient.post<FinancialGoal>('/planning/goals/emergency-fund', payload);
    return data;
  },
};
