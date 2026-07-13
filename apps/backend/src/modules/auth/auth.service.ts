import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { EmailService } from '../../integrations/email/email.service';
import { SupabaseService } from '../../integrations/supabase/supabase.service';
import { UserService } from '../user/user.service';
import { LoginDto } from './dto/login.dto';
import { MfaEnrollDto, MfaFactorDto, MfaSessionDto, MfaVerifyDto } from './dto/mfa.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { User } from '../user/entities/user.entity';

const REGISTER_PROFILE_DEFAULTS = {
  primaryCurrency: 'DOP',
  monthlyIncomeEstimate: 0,
  monthlySavingTargetPct: 20,
};

const EMAIL_CONFIRMATION_REQUIRED_MESSAGE =
  'Cuenta creada. Revisa tu correo para confirmar tu cuenta antes de iniciar sesiÃ³n.';

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
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly userService: UserService,
    private readonly emailService: EmailService,
  ) {}

  async register(dto: RegisterDto) {
    const email = this.normalizeEmail(dto.email);
    const fullName = this.userService.buildFullName(dto.firstName, dto.lastName, dto.fullName);

    if (!fullName) {
      throw new BadRequestException('Full name is required');
    }

    if (this.supabase.adminClient && this.emailService.isSignupConfirmationConfigured()) {
      return this.registerWithCustomConfirmationEmail(email, dto.password, fullName);
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
          message: 'Debes confirmar tu correo antes de iniciar sesiÃ³n.',
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
    const normalizedEmail = this.normalizeEmail(email);
    const redirectTo = this.buildPasswordRecoveryRedirectUrl();

    if (this.supabase.adminClient && this.emailService.isCustomEmailConfigured()) {
      const { data, error } = await this.supabase.adminClient.auth.admin.generateLink({
        type: 'recovery',
        email: normalizedEmail,
        options: {
          redirectTo,
        },
      });

      if (error) {
        throw new BadRequestException(error.message);
      }

      const recoveryLink = this.buildPasswordRecoveryLink(data.properties?.hashed_token, data.properties?.action_link);
      if (!recoveryLink) {
        throw new BadRequestException('No pudimos generar el enlace de recuperaciÃ³n.');
      }

      await this.emailService.sendPasswordRecoveryEmail({
        to: normalizedEmail,
        recoveryLink,
      });

      return { message: 'Si el correo existe, enviaremos un enlace para restablecer la contraseÃ±a.' };
    }

    this.logger.warn('Custom recovery email is not fully configured; falling back to Supabase Auth email delivery.');

    const { error } = await this.supabase.client.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: this.buildPasswordRecoveryRedirectUrl(),
    });

    if (error) {
      if (this.isRateLimitError(error)) {
        throw new HttpException(
          {
            code: 'email_rate_limit_exceeded',
            message: 'Demasiados intentos. Espera unos minutos antes de volver a intentarlo.',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      throw new BadRequestException(error.message);
    }

    return { message: 'Si el correo existe, enviaremos un enlace para restablecer la contraseÃ±a.' };
  }

  private async registerWithCustomConfirmationEmail(email: string, password: string, fullName: string) {
    if (!this.supabase.adminClient) {
      throw new BadRequestException('Supabase admin client is not configured');
    }

    const { data: linkData, error: linkError } = await this.supabase.adminClient.auth.admin.generateLink({
      type: 'signup',
      email,
      password,
      options: {
        redirectTo: this.buildEmailConfirmationRedirectUrl(),
        data: {
          full_name: fullName,
        },
      },
    });

    if (linkError) {
      if (/already|registered|exists|duplicate/i.test(linkError.message)) {
        throw new ConflictException('Email already registered');
      }

      throw new BadRequestException(linkError.message);
    }

    if (!linkData.user) {
      throw new BadRequestException('Registration failed');
    }

    const profile = await this.userService.upsertProfile(linkData.user.id, {
      fullName,
      ...REGISTER_PROFILE_DEFAULTS,
    });

    const confirmationLink = linkData.properties?.action_link;
    if (!confirmationLink) {
      throw new BadRequestException('No pudimos generar el enlace de confirmacion.');
    }

    await this.emailService.sendSignupConfirmationEmail({
      to: email,
      fullName,
      confirmationLink,
    });

    return this.formatEmailConfirmationRequiredResponse(linkData.user, profile);
  }

  async resetPassword(dto: ResetPasswordDto) {
    const client = this.supabase.createSessionClient();
    const sessionError = dto.code
      ? (await client.auth.exchangeCodeForSession(dto.code)).error
      : dto.tokenHash
        ? (await client.auth.verifyOtp({ token_hash: dto.tokenHash, type: 'recovery' })).error
      : (
          await client.auth.setSession({
            access_token: dto.accessToken as string,
            refresh_token: dto.refreshToken as string,
          })
        ).error;

    if (sessionError) {
      throw new UnauthorizedException('El enlace de recuperación no es válido o expiró.');
    }

    const { error } = await client.auth.updateUser({ password: dto.password });
    if (error) {
      throw new BadRequestException(error.message);
    }

    await client.auth.signOut({ scope: 'local' });
    return { message: 'Contraseña actualizada correctamente.' };
  }

  async logout(accessToken: string, refreshToken: string) {
    const client = await this.createAuthenticatedClient({ accessToken, refreshToken });

    const { error } = await client.auth.signOut({ scope: 'local' });
    if (error) {
      throw new BadRequestException(error.message);
    }

    return { message: 'SesiÃ³n cerrada correctamente.' };
  }

  async enrollMfa(dto: MfaEnrollDto) {
    const client = await this.createAuthenticatedClient(dto);
    const { data, error } = await client.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: dto.friendlyName ?? 'MONI',
    });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data;
  }

  async challengeMfa(dto: MfaFactorDto) {
    const client = await this.createAuthenticatedClient(dto);
    const { data, error } = await client.auth.mfa.challenge({
      factorId: dto.factorId,
    });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data;
  }

  async verifyMfa(dto: MfaVerifyDto) {
    const client = await this.createAuthenticatedClient(dto);
    const { data, error } = await client.auth.mfa.verify({
      factorId: dto.factorId,
      challengeId: dto.challengeId,
      code: dto.code,
    });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data;
  }

  async unenrollMfa(dto: MfaFactorDto) {
    const client = await this.createAuthenticatedClient(dto);
    const { data, error } = await client.auth.mfa.unenroll({
      factorId: dto.factorId,
    });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data;
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

  private buildPasswordRecoveryLink(tokenHash?: string, actionLink?: string): string | undefined {
    if (!tokenHash) return actionLink;

    const redirectUrl = new URL(this.buildPasswordRecoveryRedirectUrl());
    redirectUrl.searchParams.set('token_hash', tokenHash);
    redirectUrl.searchParams.set('type', 'recovery');
    return redirectUrl.toString();
  }

  private async createAuthenticatedClient(dto: MfaSessionDto | ResetPasswordDto) {
    const client = this.supabase.createSessionClient();
    const { error } = await client.auth.setSession({
      access_token: dto.accessToken,
      refresh_token: dto.refreshToken,
    });

    if (error) {
      throw new UnauthorizedException('La sesiÃ³n ya no es vÃ¡lida.');
    }

    return client;
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

