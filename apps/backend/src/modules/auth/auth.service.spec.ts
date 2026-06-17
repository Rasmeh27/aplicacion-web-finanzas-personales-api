import { ConflictException, ForbiddenException, HttpException, UnauthorizedException } from '@nestjs/common';
import { AuthError } from '@supabase/supabase-js';
import { SupabaseService } from '../../integrations/supabase/supabase.service';
import { User } from '../user/entities/user.entity';
import { UserService } from '../user/user.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let userService: jest.Mocked<UserService>;
  let supabase: jest.Mocked<SupabaseService>;

  const profile = {
    id: 'user-1',
    fullName: 'Ana Perez',
    primaryCurrency: 'DOP',
    monthlyIncomeEstimate: 45000,
    monthlySavingTargetPct: 20,
  } as User;

  const supabaseUser = {
    id: 'user-1',
    email: 'ana@example.com',
  } as any;

  const session = {
    access_token: 'access-token',
    refresh_token: 'refresh-token',
  } as any;

  beforeEach(() => {
    userService = {
      findAll: jest.fn(),
      findById: jest.fn(),
      upsertProfile: jest.fn(),
      updatePreferences: jest.fn(),
      updateFinancialProfile: jest.fn(),
      buildFullName: jest.fn((firstName?: string, lastName?: string, fullName?: string) =>
        fullName ?? [firstName, lastName].filter(Boolean).join(' '),
      ),
    } as unknown as jest.Mocked<UserService>;

    supabase = {
      client: {
        auth: {
          signUp: jest.fn(),
          signInWithPassword: jest.fn(),
          refreshSession: jest.fn(),
          resetPasswordForEmail: jest.fn(),
        },
      },
    } as unknown as jest.Mocked<SupabaseService>;

    service = new AuthService(supabase, userService);
  });

  describe('register', () => {
    it('registers with Supabase Auth and creates a profile', async () => {
      (supabase.client.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: supabaseUser, session },
        error: null,
      });
      userService.upsertProfile.mockResolvedValue(profile);

      const result = await service.register({
        email: ' Ana@Example.COM ',
        password: 'Str0ngP@ssword',
        fullName: 'Ana Perez',
      });

      expect(supabase.client.auth.signUp).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'ana@example.com',
          password: 'Str0ngP@ssword',
          options: {
            emailRedirectTo: 'http://localhost:3000/auth/email-confirmed',
            data: {
              full_name: 'Ana Perez',
            },
          },
        }),
      );
      expect(userService.upsertProfile).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          fullName: 'Ana Perez',
          primaryCurrency: 'DOP',
          monthlyIncomeEstimate: 0,
          monthlySavingTargetPct: 20,
        }),
      );
      expect(result).toEqual({
        status: 'authenticated',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: {
          id: 'user-1',
          email: 'ana@example.com',
          fullName: 'Ana Perez',
          primaryCurrency: 'DOP',
          monthlyIncomeEstimate: 45000,
          monthlySavingTargetPct: 20,
          monthlySavingTargetAmount: null,
          monthlyFixedExpenseEstimate: 0,
          monthlyVariableExpenseEstimate: 0,
          onboardingCompletedAt: null,
          onboardingVersion: 1,
        },
      });
    });

    it('returns email confirmation required when Supabase does not create a session', async () => {
      (supabase.client.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: supabaseUser, session: null },
        error: null,
      });
      userService.upsertProfile.mockResolvedValue(profile);

      const result = await service.register({
        email: 'Ana@Example.COM',
        password: 'Str0ngP@ssword',
        fullName: 'Ana Perez',
      });

      expect(supabase.client.auth.signUp).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'ana@example.com',
        }),
      );
      expect(result).toEqual({
        status: 'email_confirmation_required',
        accessToken: null,
        refreshToken: null,
        user: {
          id: 'user-1',
          email: 'ana@example.com',
          fullName: 'Ana Perez',
          primaryCurrency: 'DOP',
          monthlyIncomeEstimate: 45000,
          monthlySavingTargetPct: 20,
          monthlySavingTargetAmount: null,
          monthlyFixedExpenseEstimate: 0,
          monthlyVariableExpenseEstimate: 0,
          onboardingCompletedAt: null,
          onboardingVersion: 1,
        },
        message: 'Cuenta creada. Revisa tu correo para confirmar tu cuenta antes de iniciar sesión.',
      });
    });

    it('rejects an already registered email', async () => {
      (supabase.client.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: new AuthError('User already registered'),
      });

      await expect(
        service.register({ email: 'ana@example.com', password: 'Str0ngP@ssword', fullName: 'Ana Perez' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('maps Supabase email rate limit errors to too many requests', async () => {
      (supabase.client.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'email rate limit exceeded', status: 429 },
      });

      await expect(
        service.register({ email: 'ana@example.com', password: 'Str0ngP@ssword', fullName: 'Ana Perez' }),
      ).rejects.toBeInstanceOf(HttpException);

      await service
        .register({ email: 'ana@example.com', password: 'Str0ngP@ssword', fullName: 'Ana Perez' })
        .catch((error: HttpException) => {
          expect(error.getStatus()).toBe(429);
        });
    });
  });

  describe('login', () => {
    it('returns Supabase tokens for valid credentials', async () => {
      (supabase.client.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { user: supabaseUser, session },
        error: null,
      });
      userService.upsertProfile.mockResolvedValue(profile);

      const result = await service.login({
        email: ' Ana@Example.COM ',
        password: 'Str0ngP@ssword',
      });

      expect(supabase.client.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'ana@example.com',
        password: 'Str0ngP@ssword',
      });
      expect(result.status).toBe('authenticated');
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
    });

    it('rejects invalid credentials', async () => {
      (supabase.client.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: new AuthError('Invalid login credentials'),
      });

      await expect(
        service.login({ email: 'ana@example.com', password: 'wrong-password' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects unconfirmed email with a distinct error', async () => {
      (supabase.client.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: { code: 'email_not_confirmed', message: 'Email not confirmed' },
      });

      await expect(
        service.login({ email: 'ana@example.com', password: 'Str0ngP@ssword' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('forgotPassword', () => {
    it('normalizes email before requesting the reset link', async () => {
      (supabase.client.auth.resetPasswordForEmail as jest.Mock).mockResolvedValue({
        data: {},
        error: null,
      });

      await service.forgotPassword(' Ana@Example.COM ');

      expect(supabase.client.auth.resetPasswordForEmail).toHaveBeenCalledWith('ana@example.com');
    });
  });

  describe('logout', () => {
    it('returns a successful MVP response', async () => {
      await expect(service.logout('refresh-token')).resolves.toEqual({
        message: 'Logged out successfully.',
      });
    });
  });
});
