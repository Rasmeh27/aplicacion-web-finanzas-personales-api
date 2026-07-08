import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  UserSubscription,
  UserSubscriptionStatus,
} from './entities/user-subscription.entity';

export type UserPlan = 'basic' | 'premium';

export interface ResolvedUserPlan {
  plan: UserPlan;
  source: 'subscription' | 'default';
  subscription_id?: string;
}

/** Estados que cuentan como suscripción "vigente" para dar acceso al plan. */
const ACTIVE_STATUSES: ReadonlySet<string> = new Set<string>([
  UserSubscriptionStatus.ACTIVE,
  UserSubscriptionStatus.TRIALING,
]);

const DEFAULT_PLAN: ResolvedUserPlan = { plan: 'basic', source: 'default' };

@Injectable()
export class UserPlanService {
  private readonly logger = new Logger(UserPlanService.name);

  constructor(
    @InjectRepository(UserSubscription)
    private readonly subscriptionRepo: Repository<UserSubscription>,
  ) {}

  /**
   * Resuelve el plan actual del usuario desde `user_subscriptions`.
   *
   * Reglas:
   *  - Solo cuentan las suscripciones en estado active/trialing y vigentes
   *    (current_period_end nulo o en el futuro).
   *  - Si alguna válida es premium -> premium.
   *  - Si no hay premium válida pero sí una basic válida -> basic (source subscription).
   *  - Si no hay ninguna válida -> basic (source default).
   *
   * Nunca lanza por usuario sin suscripción; ante un error de DB devuelve el
   * fallback seguro `basic` (source default) para no bloquear el chat.
   */
  async resolveUserPlan(userId: string): Promise<ResolvedUserPlan> {
    let subscriptions: UserSubscription[];
    try {
      subscriptions = await this.subscriptionRepo.find({
        where: { userId },
        order: { currentPeriodEnd: 'DESC', startedAt: 'DESC' },
      });
    } catch (error) {
      // Fallback seguro: no exponemos el error ni bloqueamos al usuario.
      this.logger.error(
        `resolveUserPlan db error user_id=${userId} reason=${(error as Error)?.name}`,
      );
      return DEFAULT_PLAN;
    }

    const now = Date.now();
    const valid = subscriptions.filter(
      (s) =>
        ACTIVE_STATUSES.has(s.status) &&
        (s.currentPeriodEnd == null ||
          new Date(s.currentPeriodEnd).getTime() > now),
    );

    const premium = valid.find((s) => s.planCode === 'premium');
    if (premium) {
      return { plan: 'premium', source: 'subscription', subscription_id: premium.id };
    }

    const basic = valid.find((s) => s.planCode === 'basic');
    if (basic) {
      return { plan: 'basic', source: 'subscription', subscription_id: basic.id };
    }

    return DEFAULT_PLAN;
  }
}
