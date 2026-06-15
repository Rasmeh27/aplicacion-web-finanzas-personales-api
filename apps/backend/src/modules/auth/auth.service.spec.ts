import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
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
      (supabase.client.auth.signUp as jest.MockedFunction<() => Promise<any>>).mockResolvedValue({
        data: { user: supabaseUser, session },
        error: null,
      });
      userService.upsertProfile.mockResolvedValue(profile);

      const result = await service.register({
        email: 'ana@example.com',
        password: 'Str0ngP@ssword',
        firstName: 'Ana',
        lastName: 'Perez',
        primaryCurrency: 'DOP',
        monthlyIncomeEstimate: 45000,
        monthlySavingTargetPct: 20,
      });

      expect(supabase.client.auth.signUp).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'ana@example.com',
          password: 'Str0ngP@ssword',
        }),
      );
      expect(userService.upsertProfile).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          fullName: 'Ana Perez',
          primaryCurrency: 'DOP',
          monthlyIncomeEstimate: 45000,
          monthlySavingTargetPct: 20,
        }),
      );
      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: {
          id: 'user-1',
          email: 'ana@example.com',
          fullName: 'Ana Perez',
          primaryCurrency: 'DOP',
          monthlyIncomeEstimate: 45000,
          monthlySavingTargetPct: 20,
        },
      });
    });

    it('rejects an already registered email', async () => {
      (supabase.client.auth.signUp as jest.MockedFunction<() => Promise<any>>).mockResolvedValue({
        data: { user: null, session: null },
        error: new AuthError('User already registered'),
      });

      await expect(
        service.register({ email: 'ana@example.com', password: 'Str0ngP@ssword' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('login', () => {
    it('returns Supabase tokens for valid credentials', async () => {
      (
        supabase.client.auth.signInWithPassword as jest.MockedFunction<() => Promise<any>>
      ).mockResolvedValue({
        data: { user: supabaseUser, session },
        error: null,
      });
      userService.upsertProfile.mockResolvedValue(profile);

      const result = await service.login({
        email: 'ana@example.com',
        password: 'Str0ngP@ssword',
      });

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
    });

    it('rejects invalid credentials', async () => {
      (
        supabase.client.auth.signInWithPassword as jest.MockedFunction<() => Promise<any>>
      ).mockResolvedValue({
        data: { user: null, session: null },
        error: new AuthError('Invalid login credentials'),
      });

      await expect(
        service.login({ email: 'ana@example.com', password: 'wrong-password' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
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
