import apiClient from '@/lib/api/client';
import type { MySubscription, PlanCatalogItem } from '../types';

/**
 * Estado de suscripción del usuario autenticado. Solo lectura: el frontend
 * nunca envía plan, scopes ni isPremium; el backend resuelve todo desde el JWT.
 */
export const subscriptionService = {
  async getMySubscription(): Promise<MySubscription> {
    const { data } = await apiClient.get<MySubscription>('/subscriptions/me');
    return data;
  },

  async getPlans(): Promise<PlanCatalogItem[]> {
    const { data } = await apiClient.get<PlanCatalogItem[]>('/subscriptions/plans');
    return data;
  },
};
