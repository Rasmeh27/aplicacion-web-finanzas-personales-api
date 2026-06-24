import { NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { UserService } from '../user/user.service';
import { CompleteFinancialOnboardingDto } from './dto/complete-financial-onboarding.dto';
import {
  FinancialItemFrequency,
  PlannedFinancialItem,
  PlannedFinancialItemType,
} from './entities/planned-financial-item.entity';
import { FinancialProfileService } from './financial-profile.service';

describe('FinancialProfileService.completeOnboarding', () => {
  let service: FinancialProfileService;
  let userRepo: jest.Mocked<Pick<Repository<User>, 'findOne' | 'merge' | 'save'>>;
  let itemRepo: jest.Mocked<Pick<Repository<PlannedFinancialItem>, 'delete' | 'create' | 'save'>>;

  const baseProfile = () =>
    ({
      id: 'user-1',
      fullName: 'Ana Perez',
      primaryCurrency: 'DOP',
      monthlyIncomeEstimate: 0,
      monthlySavingTargetPct: 0,
    }) as User;

  beforeEach(() => {
    userRepo = {
      findOne: jest.fn(),
      merge: jest.fn((target: User, source: Partial<User>) => Object.assign(target, source) as User),
      save: jest.fn(async (entity: User) => entity),
    } as any;

    itemRepo = {
      delete: jest.fn(async () => ({ affected: 0, raw: [] })),
      create: jest.fn((items: any) => items),
      save: jest.fn(async (items: any) => items),
    } as any;

    const manager = {
      getRepository: (entity: unknown) => (entity === User ? userRepo : itemRepo),
    } as unknown as EntityManager;

    const dataSource = {
      transaction: jest.fn(async (cb: (m: EntityManager) => Promise<unknown>) => cb(manager)),
    } as unknown as DataSource;

    service = new FinancialProfileService({} as UserService, dataSource);
  });

  it('converts each frequency to a monthly amount and aggregates the summary', async () => {
    userRepo.findOne.mockResolvedValue(baseProfile());

    const dto: CompleteFinancialOnboardingDto = {
      primaryCurrency: 'DOP',
      monthlySavingTargetPct: 10,
      incomeSources: [{ name: 'Salario', amount: 1000, frequency: FinancialItemFrequency.WEEKLY }],
      fixedExpenses: [{ name: 'Renta', amount: 600, frequency: FinancialItemFrequency.MONTHLY }],
      variableExpenses: [
        { name: 'Bono', amount: 1200, frequency: FinancialItemFrequency.YEARLY },
      ],
    };

    const result = await service.completeOnboarding('user-1', dto);

    // weekly 1000 -> 1000*52/12 = 4333.33
    expect(result.summary.monthlyIncomeEstimate).toBe(4333.33);
    expect(result.summary.monthlyFixedExpenseEstimate).toBe(600);
    // yearly 1200 -> 1200/12 = 100
    expect(result.summary.monthlyVariableExpenseEstimate).toBe(100);
    expect(result.summary.monthlyTotalExpenseEstimate).toBe(700);
    expect(result.summary.monthlyBalanceEstimate).toBe(3633.33);
    // pct provided, amount derived from income: 4333.33 * 10 / 100 = 433.33
    expect(result.summary.monthlySavingTargetAmount).toBe(433.33);
    expect(result.summary.monthlySavingTargetPct).toBe(10);
  });

  it('replaces existing planned items and persists onboarding state on the profile', async () => {
    userRepo.findOne.mockResolvedValue(baseProfile());

    const dto: CompleteFinancialOnboardingDto = {
      primaryCurrency: 'USD',
      incomeSources: [{ name: 'Salario', amount: 3000, frequency: FinancialItemFrequency.MONTHLY }],
    };

    const result = await service.completeOnboarding('user-1', dto);

    expect(itemRepo.delete).toHaveBeenCalledWith({ userId: 'user-1' });
    expect(itemRepo.save).toHaveBeenCalledTimes(1);

    const savedItems = (itemRepo.create as jest.Mock).mock.calls[0][0];
    expect(savedItems).toHaveLength(1);
    expect(savedItems[0]).toMatchObject({
      userId: 'user-1',
      type: PlannedFinancialItemType.INCOME,
      name: 'Salario',
      amount: 3000,
      currency: 'USD',
      frequency: FinancialItemFrequency.MONTHLY,
      isActive: true,
    });

    expect(result.profile.onboardingCompletedAt).toBeInstanceOf(Date);
    expect(result.profile.onboardingVersion).toBe(1);
    expect(result.profile.primaryCurrency).toBe('USD');
    // no pct and no amount -> null
    expect(result.summary.monthlySavingTargetAmount).toBeNull();
  });

  it('throws when the profile does not exist', async () => {
    userRepo.findOne.mockResolvedValue(null);

    await expect(
      service.completeOnboarding('missing', {
        primaryCurrency: 'DOP',
        incomeSources: [{ name: 'Salario', amount: 100, frequency: FinancialItemFrequency.MONTHLY }],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
