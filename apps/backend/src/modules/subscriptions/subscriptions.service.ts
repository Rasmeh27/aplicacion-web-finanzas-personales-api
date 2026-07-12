import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { UserSubscription } from './entities/user-subscription.entity';
import { featuresForPlan, PlanFeatures } from './plan-features';
import { UserPlan, UserPlanService } from './user-plan.service';

export interface MySubscriptionResponse {
  plan: UserPlan;
  source: 'subscription' | 'default';
  status: string | null;
  subscriptionId: string | null;
  currentPeriodEnd: string | null;
  features: PlanFeatures;
}

export interface PlanCatalogItem {
  code: string;
  name: string;
  description: string | null;
  features: PlanFeatures;
}

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly userPlanService: UserPlanService,
    @InjectRepository(UserSubscription)
    private readonly subscriptionRepo: Repository<UserSubscription>,
    @InjectRepository(SubscriptionPlan)
    private readonly planRepo: Repository<SubscriptionPlan>,
  ) {}

  /**
   * Estado de suscripción del usuario autenticado. Respuesta estable y segura:
   * nunca expone el historial completo ni datos internos de billing.
   */
  async getMySubscription(userId: string): Promise<MySubscriptionResponse> {
    const resolved = await this.userPlanService.resolveUserPlan(userId);

    let status: string | null = null;
    let currentPeriodEnd: string | null = null;

    if (resolved.subscription_id) {
      const subscription = await this.subscriptionRepo.findOne({
        where: { id: resolved.subscription_id, userId },
      });
      if (subscription) {
        status = subscription.status;
        currentPeriodEnd = subscription.currentPeriodEnd
          ? new Date(subscription.currentPeriodEnd).toISOString()
          : null;
      }
    }

    return {
      plan: resolved.plan,
      source: resolved.source,
      status,
      subscriptionId: resolved.subscription_id ?? null,
      currentPeriodEnd,
      features: featuresForPlan(resolved.plan),
    };
  }

  /** Catálogo de planes activos con sus capacidades. */
  async getActivePlans(): Promise<PlanCatalogItem[]> {
    const plans = await this.planRepo.find({
      where: { isActive: true },
      order: { code: 'ASC' },
    });

    return plans.map((plan) => ({
      code: plan.code,
      name: plan.name,
      description: plan.description,
      features: featuresForPlan(plan.code === 'premium' ? 'premium' : 'basic'),
    }));
  }
}
