import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import {
  UserSubscription,
  UserSubscriptionStatus,
} from './entities/user-subscription.entity';
import { SubscriptionsService } from './subscriptions.service';
import { UserPlanService } from './user-plan.service';

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;
  let userPlanService: { resolveUserPlan: jest.Mock };
  let subscriptionRepo: { findOne: jest.Mock };
  let planRepo: { find: jest.Mock };

  beforeEach(async () => {
    userPlanService = { resolveUserPlan: jest.fn() };
    subscriptionRepo = { findOne: jest.fn() };
    planRepo = { find: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        { provide: UserPlanService, useValue: userPlanService },
        { provide: getRepositoryToken(UserSubscription), useValue: subscriptionRepo },
        { provide: getRepositoryToken(SubscriptionPlan), useValue: planRepo },
      ],
    }).compile();

    service = module.get(SubscriptionsService);
  });

  it('basic por default: sin suscripción, features en false', async () => {
    userPlanService.resolveUserPlan.mockResolvedValue({
      plan: 'basic',
      source: 'default',
    } as never);

    const res = await service.getMySubscription(USER_ID);

    expect(res).toEqual({
      plan: 'basic',
      source: 'default',
      status: null,
      subscriptionId: null,
      currentPeriodEnd: null,
      features: {
        investments: false,
        portfolioAnalytics: false,
        premiumAssistant: false,
      },
    });
    expect(subscriptionRepo.findOne).not.toHaveBeenCalled();
  });

  it('premium vigente: features en true y datos de la suscripción', async () => {
    const periodEnd = new Date('2026-08-11T00:00:00.000Z');
    userPlanService.resolveUserPlan.mockResolvedValue({
      plan: 'premium',
      source: 'subscription',
      subscription_id: 'sub-1',
    } as never);
    subscriptionRepo.findOne.mockResolvedValue({
      id: 'sub-1',
      userId: USER_ID,
      status: UserSubscriptionStatus.ACTIVE,
      currentPeriodEnd: periodEnd,
    } as never);

    const res = await service.getMySubscription(USER_ID);

    expect(res.plan).toBe('premium');
    expect(res.status).toBe('active');
    expect(res.subscriptionId).toBe('sub-1');
    expect(res.currentPeriodEnd).toBe(periodEnd.toISOString());
    expect(res.features).toEqual({
      investments: true,
      portfolioAnalytics: true,
      premiumAssistant: true,
    });
    // La búsqueda de la suscripción queda aislada por user_id.
    expect(subscriptionRepo.findOne).toHaveBeenCalledWith({
      where: { id: 'sub-1', userId: USER_ID },
    });
  });

  it('no expone el historial completo: solo la suscripción vigente', async () => {
    userPlanService.resolveUserPlan.mockResolvedValue({
      plan: 'premium',
      source: 'subscription',
      subscription_id: 'sub-1',
    } as never);
    subscriptionRepo.findOne.mockResolvedValue({
      id: 'sub-1',
      userId: USER_ID,
      status: UserSubscriptionStatus.TRIALING,
      currentPeriodEnd: null,
    } as never);

    const res = await service.getMySubscription(USER_ID);
    const keys = Object.keys(res);
    expect(keys.sort()).toEqual(
      ['plan', 'source', 'status', 'subscriptionId', 'currentPeriodEnd', 'features'].sort(),
    );
  });

  it('catálogo de planes activos con capacidades por plan', async () => {
    planRepo.find.mockResolvedValue([
      { code: 'basic', name: 'Basic', description: 'Plan básico gratuito.', isActive: true },
      { code: 'premium', name: 'Premium', description: 'Plan premium.', isActive: true },
    ] as never);

    const plans = await service.getActivePlans();

    expect(plans).toHaveLength(2);
    expect(plans[0].features.investments).toBe(false);
    expect(plans[1].features.investments).toBe(true);
    expect(plans[1].features.premiumAssistant).toBe(true);
  });
});
