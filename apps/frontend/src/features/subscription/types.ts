export type UserPlan = 'basic' | 'premium';

export type PlanFeatures = {
  investments: boolean;
  portfolioAnalytics: boolean;
  premiumAssistant: boolean;
};

/** Respuesta de GET /subscriptions/me. El plan SIEMPRE lo resuelve el backend. */
export type MySubscription = {
  plan: UserPlan;
  source: 'subscription' | 'default';
  status: string | null;
  subscriptionId: string | null;
  currentPeriodEnd: string | null;
  features: PlanFeatures;
};

export type PlanCatalogItem = {
  code: string;
  name: string;
  description: string | null;
  features: PlanFeatures;
};
