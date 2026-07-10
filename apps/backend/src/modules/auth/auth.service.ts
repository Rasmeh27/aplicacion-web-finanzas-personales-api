import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { SupabaseService } from '../../integrations/supabase/supabase.service';
import { UserService } from '../user/user.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { User } from '../user/entities/user.entity';

const REGISTER_PROFILE_DEFAULTS = {
  primaryCurrency: 'DOP',
  monthlyIncomeEstimate: 0,
  monthlySavingTargetPct: 20,
};

const EMAIL_CONFIRMATION_REQUIRED_MESSAGE =
  'Cuenta creada. Revisa tu correo para confirmar tu cuenta antes de iniciar sesión.';

type AuthUserResponse = {
  id: string;
  email: string | undefined;
  fullName: string;
  primaryCurrency: string;
  country: string | null;
  timezone: string | null;
  phoneNumber: string | null;
  monthlyIncomeEstimate: number;
  monthlySavingTargetPct: number;
  monthlySavingTargetAmount: number | null;
  monthlyFixedExpenseEstimate: number;
  monthlyVariableExpenseEstimate: number;
  onboardingCompletedAt: string | null;
  onboardingVersion: number;
};

type AuthenticatedResponse = {
  status: 'authenticated';
  accessToken: string;
  refreshToken: string;
  user: AuthUserResponse;
};

type EmailConfirmationRequiredResponse = {
  status: 'email_confirmation_required';
  accessToken: null;
  refreshToken: null;
  user: AuthUserResponse;
  message: string;
};

type AuthResponse = AuthenticatedResponse | EmailConfirmationRequiredResponse;

@Injectable()
export class AuthService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly userService: UserService,
  ) {}

  async register(dto: RegisterDto) {
    const email = this.normalizeEmail(dto.email);
    const fullName = this.userService.buildFullName(dto.firstName, dto.lastName, dto.fullName);

    if (!fullName) {
      throw new BadRequestException('Full name is required');
    }

    const { data, error } = await this.supabase.client.auth.signUp({
      email,
      password: dto.password,
      options: {
        emailRedirectTo: this.buildEmailConfirmationRedirectUrl(),
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      if (/already|registered|exists/i.test(error.message)) {
        throw new ConflictException('Email already registered');
      }

      if (this.isRateLimitError(error)) {
        throw new HttpException(
          {
            code: 'email_rate_limit_exceeded',
            message: 'Demasiados intentos de registro. Espera unos minutos antes de volver a intentarlo.',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      throw new BadRequestException(error.message);
    }

    if (!data.user) {
      throw new BadRequestException('Registration failed');
    }

    const profile = await this.userService.upsertProfile(data.user.id, {
      fullName,
      ...REGISTER_PROFILE_DEFAULTS,
    });

    if (!data.session) {
      return this.formatEmailConfirmationRequiredResponse(data.user, profile);
    }

    return this.formatAuthResponse(data.session, data.user, profile);
  }

  async login(dto: LoginDto) {
    const email = this.normalizeEmail(dto.email);
    const { data, error } = await this.supabase.client.auth.signInWithPassword({
      email,
      password: dto.password,
    });

    if (error) {
      if (this.isEmailNotConfirmedError(error)) {
        throw new ForbiddenException({
          code: 'email_not_confirmed',
          message: 'Debes confirmar tu correo antes de iniciar sesion.',
        });
      }

      throw new UnauthorizedException('Invalid credentials');
    }

    if (!data.user || !data.session) {
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
    const { error } = await this.supabase.client.auth.resetPasswordForEmail(
      this.normalizeEmail(email),
      { redirectTo: this.buildPasswordRecoveryRedirectUrl() },
    );

    // Keep the public response neutral so account existence is never disclosed.
    if (error && this.isRateLimitError(error)) {
      throw new HttpException('Too many password recovery attempts', HttpStatus.TOO_MANY_REQUESTS);
    }
    return { message: 'If that email exists, a reset link was sent.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    if (!this.supabase.adminClient) {
      throw new ServiceUnavailableException('Password recovery is not configured');
    }

    const { data, error } = await this.supabase.client.auth.getUser(dto.token);
    if (error || !data.user) {
      throw new BadRequestException('Invalid or expired password recovery token');
    }

    const { error: updateError } = await this.supabase.adminClient.auth.admin.updateUserById(
      data.user.id,
      { password: dto.password },
    );
    if (updateError) {
      throw new BadRequestException('Unable to update password');
    }

    return { message: 'Password updated successfully.' };
  }

  async logout(_refreshToken: string) {
    // TODO: revoke refresh token with Supabase admin/service role when available.
    return { message: 'Logged out successfully.' };
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private buildEmailConfirmationRedirectUrl(): string {
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    return `${frontendUrl.replace(/\/$/, '')}/auth/email-confirmed`;
  }

  private buildPasswordRecoveryRedirectUrl(): string {
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    return `${frontendUrl.replace(/\/$/, '')}/auth/reset-password`;
  }

  private isEmailNotConfirmedError(error: { code?: string; message?: string }): boolean {
    return error.code === 'email_not_confirmed' || /email.*not.*confirm|confirm.*email/i.test(error.message ?? '');
  }

  private isRateLimitError(error: { code?: string; message?: string; status?: number }): boolean {
    return (
      error.status === 429 ||
      error.code === 'over_email_send_rate_limit' ||
      /rate limit|too many/i.test(error.message ?? '')
    );
  }

  private formatAuthResponse(session: Session, user: SupabaseUser, profile: User): AuthResponse {
    return {
      status: 'authenticated',
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      user: this.formatUserResponse(user, profile),
    };
  }

  private formatEmailConfirmationRequiredResponse(
    user: SupabaseUser,
    profile: User,
  ): EmailConfirmationRequiredResponse {
    return {
      status: 'email_confirmation_required',
      accessToken: null,
      refreshToken: null,
      user: this.formatUserResponse(user, profile),
      message: EMAIL_CONFIRMATION_REQUIRED_MESSAGE,
    };
  }

  private formatUserResponse(user: SupabaseUser, profile: User): AuthUserResponse {
    return {
      id: user.id,
      email: user.email,
      fullName: profile.fullName,
      primaryCurrency: profile.primaryCurrency,
      country: profile.country ?? null,
      timezone: profile.timezone ?? null,
      phoneNumber: profile.phoneNumber ?? null,
      monthlyIncomeEstimate: Number(profile.monthlyIncomeEstimate),
      monthlySavingTargetPct: Number(profile.monthlySavingTargetPct),
      monthlySavingTargetAmount:
        profile.monthlySavingTargetAmount === null || profile.monthlySavingTargetAmount === undefined
          ? null
          : Number(profile.monthlySavingTargetAmount),
      monthlyFixedExpenseEstimate: Number(profile.monthlyFixedExpenseEstimate ?? 0),
      monthlyVariableExpenseEstimate: Number(profile.monthlyVariableExpenseEstimate ?? 0),
      onboardingCompletedAt: profile.onboardingCompletedAt
        ? new Date(profile.onboardingCompletedAt).toISOString()
        : null,
      onboardingVersion: Number(profile.onboardingVersion ?? 1),
    };
  }
}
