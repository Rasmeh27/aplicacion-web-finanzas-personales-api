import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { SupabaseService } from '../../integrations/supabase/supabase.service';
import { UserService } from '../user/user.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { User } from '../user/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly userService: UserService,
  ) {}

  async register(dto: RegisterDto) {
    const fullName = this.userService.buildFullName(dto.firstName, dto.lastName, dto.fullName);
    const { data, error } = await this.supabase.client.auth.signUp({
      email: dto.email,
      password: dto.password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      if (/already|registered|exists/i.test(error.message)) {
        throw new ConflictException('Email already registered');
      }
      throw new BadRequestException(error.message);
    }

    if (!data.user) {
      throw new BadRequestException('Registration failed');
    }

    const profile = await this.userService.upsertProfile(data.user.id, {
      fullName,
      primaryCurrency: dto.primaryCurrency ?? dto.currency,
      monthlyIncomeEstimate: dto.monthlyIncomeEstimate,
      monthlySavingTargetPct: dto.monthlySavingTargetPct,
    });

    return this.formatAuthResponse(data.session, data.user, profile);
  }

  async login(dto: LoginDto) {
    const { data, error } = await this.supabase.client.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (error || !data.user || !data.session) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const profile = await this.userService.upsertProfile(data.user.id);
    return this.formatAuthResponse(data.session, data.user, profile);
  }

  async refreshToken(refreshToken: string) {
    const { data, error } = await this.supabase.client.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.user || !data.session) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const profile = await this.userService.upsertProfile(data.user.id);
    return this.formatAuthResponse(data.session, data.user, profile);
  }

  async forgotPassword(email: string) {
    await this.supabase.client.auth.resetPasswordForEmail(email);
    return { message: 'If that email exists, a reset link was sent.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    // TODO: validate reset token & update password
    return { message: 'Password updated successfully.' };
  }

  async logout(refreshToken: string) {
    // TODO: revoke refresh token with Supabase admin/service role when available.
    return { message: 'Logged out successfully.' };
  }

  private formatAuthResponse(session: Session | null, user: SupabaseUser, profile: User) {
    return {
      accessToken: session?.access_token ?? null,
      refreshToken: session?.refresh_token ?? null,
      user: {
        id: user.id,
        email: user.email,
        fullName: profile.fullName,
        primaryCurrency: profile.primaryCurrency,
        monthlyIncomeEstimate: Number(profile.monthlyIncomeEstimate),
        monthlySavingTargetPct: Number(profile.monthlySavingTargetPct),
      },
    };
  }
}
