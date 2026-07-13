import { ConflictException, ForbiddenException, HttpException, UnauthorizedException } from '@nestjs/common';
import { AuthError } from '@supabase/supabase-js';
import { EmailService } from '../../integrations/email/email.service';
import { SupabaseService } from '../../integrations/supabase/supabase.service';
import { User } from '../user/entities/user.entity';
import { UserService } from '../user/user.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let userService: jest.Mocked<UserService>;
  let supabase: jest.Mocked<SupabaseService>;
  let emailService: jest.Mocked<EmailService>;
  let sessionClient: any;

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

    sessionClient = {
      auth: {
        setSession: jest.fn().mockResolvedValue({ data: { session }, error: null }),
        updateUser: jest.fn().mockResolvedValue({ data: {}, error: null }),
        signOut: jest.fn().mockResolvedValue({ error: null }),
        mfa: {
          enroll: jest.fn(),
          challenge: jest.fn(),
          verify: jest.fn(),
          unenroll: jest.fn(),
        },
      },
    };

    supabase = {
      client: {
        auth: {
          signUp: jest.fn(),
          signInWithPassword: jest.fn(),
          refreshSession: jest.fn(),
          resetPasswordForEmail: jest.fn(),
        },
      },
      adminClient: null,
      createSessionClient: jest.fn(() => sessionClient),
    } as unknown as jest.Mocked<SupabaseService>;

    emailService = {
      isCustomEmailConfigured: jest.fn().mockReturnValue(false),
      isSignupConfirmationConfigured: jest.fn().mockReturnValue(false),
      sendPasswordRecoveryEmail: jest.fn(),
      sendSignupConfirmationEmail: jest.fn(),
    } as unknown as jest.Mocked<EmailService>;

    service = new AuthService(supabase, userService, emailService);
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
          country: null,
          timezone: null,
          phoneNumber: null,
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
          country: null,
          timezone: null,
          phoneNumber: null,
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

    it('uses Supabase admin signup link and custom email when configured', async () => {
      const generateLink = jest.fn().mockResolvedValue({
        data: {
          user: supabaseUser,
          properties: {
            action_link: 'https://supabase.test/signup-link',
          },
        },
        error: null,
      });
      (supabase as any).adminClient = {
        auth: {
          admin: {
            generateLink,
          },
        },
      };
      emailService.isSignupConfirmationConfigured.mockReturnValue(true);
      userService.upsertProfile.mockResolvedValue(profile);

      const result = await service.register({
        email: ' Ana@Example.COM ',
        password: 'Str0ngP@ssword',
        fullName: 'Ana Perez',
      });

      expect(generateLink).toHaveBeenCalledWith({
        type: 'signup',
        email: 'ana@example.com',
        password: 'Str0ngP@ssword',
        options: {
          redirectTo: 'http://localhost:3000/auth/email-confirmed',
          data: {
            full_name: 'Ana Perez',
          },
        },
      });
      expect(emailService.sendSignupConfirmationEmail).toHaveBeenCalledWith({
        to: 'ana@example.com',
        fullName: 'Ana Perez',
        confirmationLink: 'https://supabase.test/signup-link',
      });
      expect(supabase.client.auth.signUp).not.toHaveBeenCalled();
      expect(result.status).toBe('email_confirmation_required');
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

      expect(supabase.client.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'ana@example.com',
        { redirectTo: 'http://localhost:3000/auth/reset-password' },
      );
    });

    it('uses Supabase admin link generation and custom email when configured', async () => {
      const generateLink = jest.fn().mockResolvedValue({
        data: {
          properties: {
            action_link: 'https://supabase.test/recovery-link',
          },
        },
        error: null,
      });
      (supabase as any).adminClient = {
        auth: {
          admin: {
            generateLink,
          },
        },
      };
      emailService.isCustomEmailConfigured.mockReturnValue(true);

      await service.forgotPassword(' Ana@Example.COM ');

      expect(generateLink).toHaveBeenCalledWith({
        type: 'recovery',
        email: 'ana@example.com',
        options: {
          redirectTo: 'http://localhost:3000/auth/reset-password',
        },
      });
      expect(emailService.sendPasswordRecoveryEmail).toHaveBeenCalledWith({
        to: 'ana@example.com',
        recoveryLink: 'https://supabase.test/recovery-link',
      });
      expect(supabase.client.auth.resetPasswordForEmail).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('revokes the current Supabase session', async () => {
      await expect(service.logout('access-token', 'refresh-token')).resolves.toEqual({
        message: 'Sesión cerrada correctamente.',
      });
      expect(sessionClient.auth.setSession).toHaveBeenCalledWith({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
      });
      expect(sessionClient.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    });
  });
});
