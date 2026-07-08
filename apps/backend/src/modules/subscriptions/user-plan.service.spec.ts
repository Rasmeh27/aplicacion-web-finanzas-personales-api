import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Repository } from 'typeorm';
import {
  UserSubscription,
  UserSubscriptionStatus,
} from './entities/user-subscription.entity';
import { UserPlanService } from './user-plan.service';

const USER = '550e8400-e29b-41d4-a716-446655440000';
const DAY = 24 * 60 * 60 * 1000;

function sub(overrides: Partial<UserSubscription> = {}): UserSubscription {
  return {
    id: 'sub-default',
    userId: USER,
    planCode: 'premium',
    status: UserSubscriptionStatus.ACTIVE,
    startedAt: new Date('2026-01-01T00:00:00.000Z'),
    currentPeriodStart: null,
    currentPeriodEnd: null,
    canceledAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  } as unknown as UserSubscription;
}

describe('UserPlanService', () => {
  let service: UserPlanService;
  let repo: Repository<UserSubscription>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserPlanService,
        {
          provide: getRepositoryToken(UserSubscription),
          useValue: { find: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<UserPlanService>(UserPlanService);
    repo = module.get(getRepositoryToken(UserSubscription));
  });

  it('usuario sin suscripcion -> basic, source default', async () => {
    jest.spyOn(repo, 'find').mockResolvedValue([]);
    expect(await service.resolveUserPlan(USER)).toEqual({
      plan: 'basic',
      source: 'default',
    });
  });

  it('premium active -> premium, source subscription', async () => {
    jest
      .spyOn(repo, 'find')
      .mockResolvedValue([sub({ id: 'p1', planCode: 'premium' })]);
    expect(await service.resolveUserPlan(USER)).toEqual({
      plan: 'premium',
      source: 'subscription',
      subscription_id: 'p1',
    });
  });

  it('premium trialing -> premium', async () => {
    jest.spyOn(repo, 'find').mockResolvedValue([
      sub({ id: 'p1', planCode: 'premium', status: UserSubscriptionStatus.TRIALING }),
    ]);
    expect((await service.resolveUserPlan(USER)).plan).toBe('premium');
  });

  it('premium canceled -> basic', async () => {
    jest.spyOn(repo, 'find').mockResolvedValue([
      sub({ id: 'p1', planCode: 'premium', status: UserSubscriptionStatus.CANCELED }),
    ]);
    expect(await service.resolveUserPlan(USER)).toEqual({
      plan: 'basic',
      source: 'default',
    });
  });

  it('premium expired (status) -> basic', async () => {
    jest.spyOn(repo, 'find').mockResolvedValue([
      sub({ id: 'p1', planCode: 'premium', status: UserSubscriptionStatus.EXPIRED }),
    ]);
    expect((await service.resolveUserPlan(USER)).plan).toBe('basic');
  });

  it('premium active pero con current_period_end vencido -> basic', async () => {
    jest.spyOn(repo, 'find').mockResolvedValue([
      sub({
        id: 'p1',
        planCode: 'premium',
        status: UserSubscriptionStatus.ACTIVE,
        currentPeriodEnd: new Date(Date.now() - DAY),
      }),
    ]);
    expect((await service.resolveUserPlan(USER)).plan).toBe('basic');
  });

  it('premium active vigente (current_period_end futuro) -> premium', async () => {
    jest.spyOn(repo, 'find').mockResolvedValue([
      sub({
        id: 'p1',
        planCode: 'premium',
        status: UserSubscriptionStatus.ACTIVE,
        currentPeriodEnd: new Date(Date.now() + DAY),
      }),
    ]);
    expect((await service.resolveUserPlan(USER)).plan).toBe('premium');
  });

  it('basic active -> basic, source subscription', async () => {
    jest
      .spyOn(repo, 'find')
      .mockResolvedValue([sub({ id: 'b1', planCode: 'basic' })]);
    expect(await service.resolveUserPlan(USER)).toEqual({
      plan: 'basic',
      source: 'subscription',
      subscription_id: 'b1',
    });
  });

  it('varias suscripciones: premium vigente gana sobre otras', async () => {
    jest.spyOn(repo, 'find').mockResolvedValue([
      // La query real ordena por current_period_end DESC; aqui la vigente va primero.
      sub({
        id: 'p-current',
        planCode: 'premium',
        status: UserSubscriptionStatus.ACTIVE,
        currentPeriodEnd: new Date(Date.now() + 30 * DAY),
      }),
      sub({
        id: 'p-old',
        planCode: 'premium',
        status: UserSubscriptionStatus.EXPIRED,
        currentPeriodEnd: new Date(Date.now() - 30 * DAY),
      }),
      sub({ id: 'b1', planCode: 'basic', status: UserSubscriptionStatus.ACTIVE }),
    ]);
    const result = await service.resolveUserPlan(USER);
    expect(result.plan).toBe('premium');
    expect(result.subscription_id).toBe('p-current');
  });

  it('error de DB -> fallback seguro basic (source default), sin lanzar', async () => {
    jest.spyOn(repo, 'find').mockRejectedValue(new Error('db down'));
    expect(await service.resolveUserPlan(USER)).toEqual({
      plan: 'basic',
      source: 'default',
    });
  });
});
