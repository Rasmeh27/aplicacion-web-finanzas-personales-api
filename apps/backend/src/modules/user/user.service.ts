import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { UpdateFinancialProfileDto } from '../financial-profile/dto/update-financial-profile.dto';
import { UpdateUserPreferencesDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

export type UpsertProfileData = Partial<
  Pick<
    User,
    | 'fullName'
    | 'primaryCurrency'
    | 'country'
    | 'timezone'
    | 'phoneNumber'
    | 'monthlyIncomeEstimate'
    | 'monthlySavingTargetPct'
    | 'monthlySavingTargetAmount'
    | 'monthlyFixedExpenseEstimate'
    | 'monthlyVariableExpenseEstimate'
  >
>;

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  findAll(userId: string): Promise<User | null> {
    return this.findById(userId);
  }

  findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async upsertProfile(id: string, data: UpsertProfileData = {}): Promise<User> {
    const current = await this.findById(id);
    const profile = current
      ? this.userRepository.merge(current, this.cleanProfileData(data))
      : this.userRepository.create({ id, ...this.cleanProfileData(data) });

    return this.userRepository.save(profile);
  }

  async updatePreferences(id: string, dto: UpdateUserPreferencesDto): Promise<User> {
    const primaryCurrency = dto.primaryCurrency ?? dto.currency;
    const fullName = dto.fullName?.trim();
    const country = dto.country?.trim().toUpperCase();
    const timezone = dto.timezone?.trim();
    const phoneNumber = dto.phoneNumber === null ? null : dto.phoneNumber?.trim();
    return this.updateExistingProfile(id, {
      fullName,
      primaryCurrency,
      country,
      timezone,
      phoneNumber,
      monthlyIncomeEstimate: dto.monthlyIncomeEstimate,
      monthlySavingTargetPct: dto.monthlySavingTargetPct,
      monthlySavingTargetAmount: dto.monthlySavingTargetAmount,
      monthlyFixedExpenseEstimate: dto.monthlyFixedExpenseEstimate,
      monthlyVariableExpenseEstimate: dto.monthlyVariableExpenseEstimate,
    });
  }

  async updateFinancialProfile(id: string, dto: UpdateFinancialProfileDto): Promise<User> {
    return this.updateExistingProfile(id, dto);
  }

  async exportAccountData(id: string) {
    const profile = await this.findById(id);
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const tables = [
      'movements',
      'categories',
      'budgets',
      'financial_goals',
      'goal_contributions',
      'debts',
      'debt_payments',
      'assistant_sessions',
      'assistant_messages',
      'user_subscriptions',
      'privacy_settings',
      'privacy_consents',
      'audit_logs',
      'notifications',
    ];

    const exported: Record<string, unknown[]> = {};
    for (const table of tables) {
      exported[table] = await this.safeSelectByUser(table, id);
    }

    return {
      exportedAt: new Date().toISOString(),
      profile,
      data: exported,
    };
  }

  async removeAccount(id: string): Promise<{ id: string; deleted: true }> {
    const current = await this.findById(id);
    if (!current) {
      throw new NotFoundException('Profile not found');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const tables = [
        'assistant_recommendation_feedback',
        'assistant_recommendations',
        'assistant_audit_events',
        'assistant_messages',
        'assistant_messages_legacy_20260707',
        'assistant_conversations',
        'assistant_sessions',
        'debt_payments',
        'goal_contributions',
        'debts',
        'financial_goals',
        'movements',
        'budgets',
        'categories',
        'planned_financial_items',
        'user_subscriptions',
        'notifications',
        'audit_logs',
        'privacy_consents',
        'privacy_settings',
      ];

      for (const table of tables) {
        const exists = await queryRunner.query('select to_regclass($1) as table_name', [
          `public.${table}`,
        ]);
        if (!exists[0]?.table_name) continue;
        await queryRunner.query(`delete from public.${table} where user_id = $1`, [id]);
      }

      await queryRunner.query('delete from public.profiles where id = $1', [id]);
      await queryRunner.commitTransaction();

      return { id, deleted: true };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async updateExistingProfile(id: string, data: UpsertProfileData): Promise<User> {
    const current = await this.findById(id);
    if (!current) {
      throw new NotFoundException('Profile not found');
    }

    const updated = this.userRepository.merge(current, this.cleanProfileData(data));
    return this.userRepository.save(updated);
  }

  private cleanProfileData(data: UpsertProfileData): UpsertProfileData {
    return Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined),
    ) as UpsertProfileData;
  }

  private async safeSelectByUser(table: string, userId: string): Promise<unknown[]> {
    const exists = await this.dataSource.query('select to_regclass($1) as table_name', [
      `public.${table}`,
    ]);
    if (!exists[0]?.table_name) return [];

    return this.dataSource.query(`select * from public.${table} where user_id = $1`, [userId]);
  }

  buildFullName(firstName?: string, lastName?: string, fullName?: string): string | undefined {
    if (fullName?.trim()) {
      return fullName.trim();
    }

    const combined = [firstName, lastName].filter(Boolean).join(' ').trim();
    return combined || undefined;
  }
}
