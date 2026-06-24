import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateFinancialProfileDto } from '../financial-profile/dto/update-financial-profile.dto';
import { UpdateUserPreferencesDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

export type UpsertProfileData = Partial<
  Pick<User, 'fullName' | 'primaryCurrency' | 'monthlyIncomeEstimate' | 'monthlySavingTargetPct'>
>;

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
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
    return this.updateExistingProfile(id, { primaryCurrency });
  }

  async updateFinancialProfile(id: string, dto: UpdateFinancialProfileDto): Promise<User> {
    return this.updateExistingProfile(id, dto);
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

  buildFullName(firstName?: string, lastName?: string, fullName?: string): string | undefined {
    if (fullName?.trim()) {
      return fullName.trim();
    }

    const combined = [firstName, lastName].filter(Boolean).join(' ').trim();
    return combined || undefined;
  }
}
