import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreateFinancialProfileDto } from './dto/create-financial-profile.dto';
import { UpdateFinancialProfileDto } from './dto/update-financial-profile.dto';
import {
  CompleteFinancialOnboardingDto,
  FinancialItemDto,
} from './dto/complete-financial-onboarding.dto';
import { User } from '../user/entities/user.entity';
import { UserService } from '../user/user.service';
import {
  FinancialItemFrequency,
  PlannedFinancialItem,
  PlannedFinancialItemType,
} from './entities/planned-financial-item.entity';

@Injectable()
export class FinancialProfileService {
  constructor(
    private readonly userService: UserService,
    private readonly dataSource: DataSource,
  ) {}

  findByUserId(userId: string): Promise<User | null> {
    return this.userService.findById(userId);
  }

  async upsertBasicProfile(
    userId: string,
    dto: CreateFinancialProfileDto | UpdateFinancialProfileDto,
  ): Promise<User> {
    return this.userService.upsertProfile(userId, dto);
  }

  async completeOnboarding(userId: string, dto: CompleteFinancialOnboardingDto) {
    const incomeSources = dto.incomeSources ?? [];
    const fixedExpenses = dto.fixedExpenses ?? [];
    const variableExpenses = dto.variableExpenses ?? [];

    const monthlyIncomeEstimate = this.sumMonthly(incomeSources);
    const monthlyFixedExpenseEstimate = this.sumMonthly(fixedExpenses);
    const monthlyVariableExpenseEstimate = this.sumMonthly(variableExpenses);
    const monthlyTotalExpenseEstimate = this.round2(
      monthlyFixedExpenseEstimate + monthlyVariableExpenseEstimate,
    );
    const monthlyBalanceEstimate = this.round2(
      monthlyIncomeEstimate - monthlyTotalExpenseEstimate,
    );
    const monthlySavingTargetAmount = this.resolveSavingTargetAmount(dto, monthlyIncomeEstimate);

    return this.dataSource.transaction(async (manager) => {
      const userRepo = manager.getRepository(User);
      const itemRepo = manager.getRepository(PlannedFinancialItem);

      const profile = await userRepo.findOne({ where: { id: userId } });
      if (!profile) {
        throw new NotFoundException('Profile not found');
      }

      const monthlySavingTargetPct =
        dto.monthlySavingTargetPct ?? Number(profile.monthlySavingTargetPct ?? 0);

      userRepo.merge(profile, {
        primaryCurrency: dto.primaryCurrency,
        monthlyIncomeEstimate,
        monthlySavingTargetPct,
        monthlySavingTargetAmount,
        monthlyFixedExpenseEstimate,
        monthlyVariableExpenseEstimate,
        onboardingCompletedAt: new Date(),
        onboardingVersion: 1,
      });
      const savedProfile = await userRepo.save(profile);

      // Replace any previously planned items for this user.
      await itemRepo.delete({ userId });

      const itemsToCreate = [
        ...incomeSources.map((item) =>
          this.buildPlannedItem(userId, dto.primaryCurrency, PlannedFinancialItemType.INCOME, item),
        ),
        ...fixedExpenses.map((item) =>
          this.buildPlannedItem(
            userId,
            dto.primaryCurrency,
            PlannedFinancialItemType.FIXED_EXPENSE,
            item,
          ),
        ),
        ...variableExpenses.map((item) =>
          this.buildPlannedItem(
            userId,
            dto.primaryCurrency,
            PlannedFinancialItemType.VARIABLE_EXPENSE,
            item,
          ),
        ),
      ];

      const plannedItems = itemsToCreate.length
        ? await itemRepo.save(itemRepo.create(itemsToCreate))
        : [];

      return {
        profile: savedProfile,
        plannedItems,
        summary: {
          monthlyIncomeEstimate,
          monthlyFixedExpenseEstimate,
          monthlyVariableExpenseEstimate,
          monthlyTotalExpenseEstimate,
          monthlyBalanceEstimate,
          monthlySavingTargetAmount,
          monthlySavingTargetPct,
        },
      };
    });
  }

  private buildPlannedItem(
    userId: string,
    currency: string,
    type: PlannedFinancialItemType,
    item: FinancialItemDto,
  ): Partial<PlannedFinancialItem> {
    return {
      userId,
      type,
      name: item.name.trim(),
      amount: this.round2(item.amount),
      currency,
      frequency: item.frequency ?? FinancialItemFrequency.MONTHLY,
      categoryName: item.categoryName?.trim() || null,
      notes: item.notes?.trim() || null,
      isActive: true,
    };
  }

  private resolveSavingTargetAmount(
    dto: CompleteFinancialOnboardingDto,
    monthlyIncomeEstimate: number,
  ): number | null {
    if (dto.monthlySavingTargetAmount !== undefined) {
      return this.round2(dto.monthlySavingTargetAmount);
    }

    if (dto.monthlySavingTargetPct !== undefined) {
      return this.round2((monthlyIncomeEstimate * dto.monthlySavingTargetPct) / 100);
    }

    return null;
  }

  private sumMonthly(items: FinancialItemDto[]): number {
    const total = items.reduce(
      (acc, item) =>
        acc + this.toMonthlyAmount(item.amount, item.frequency ?? FinancialItemFrequency.MONTHLY),
      0,
    );
    return this.round2(total);
  }

  private toMonthlyAmount(amount: number, frequency: FinancialItemFrequency): number {
    switch (frequency) {
      case FinancialItemFrequency.WEEKLY:
        return this.round2((amount * 52) / 12);
      case FinancialItemFrequency.BIWEEKLY:
        return this.round2((amount * 26) / 12);
      case FinancialItemFrequency.YEARLY:
        return this.round2(amount / 12);
      case FinancialItemFrequency.MONTHLY:
      default:
        return this.round2(amount);
    }
  }

  private round2(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
