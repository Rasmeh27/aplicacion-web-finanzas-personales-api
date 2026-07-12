import { UserPlan } from './user-plan.service';

/**
 * Capacidades por plan. Única fuente de verdad de qué habilita cada plan;
 * la usan la API de suscripciones y el catálogo de planes.
 */
export interface PlanFeatures {
  investments: boolean;
  portfolioAnalytics: boolean;
  premiumAssistant: boolean;
}

export const PLAN_FEATURES: Record<UserPlan, PlanFeatures> = {
  basic: {
    investments: false,
    portfolioAnalytics: false,
    premiumAssistant: false,
  },
  premium: {
    investments: true,
    portfolioAnalytics: true,
    premiumAssistant: true,
  },
};

export function featuresForPlan(plan: UserPlan): PlanFeatures {
  return { ...PLAN_FEATURES[plan] };
}
