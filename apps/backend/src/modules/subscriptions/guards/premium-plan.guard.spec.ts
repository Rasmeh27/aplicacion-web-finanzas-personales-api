import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { UserPlanService } from '../user-plan.service';
import { PremiumPlanGuard } from './premium-plan.guard';

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';

function contextWithUser(user: unknown): ExecutionContext {
  const request: Record<string, unknown> = { user };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('PremiumPlanGuard', () => {
  let guard: PremiumPlanGuard;
  let userPlanService: { resolveUserPlan: jest.Mock };

  beforeEach(() => {
    userPlanService = { resolveUserPlan: jest.fn() };
    guard = new PremiumPlanGuard(userPlanService as unknown as UserPlanService);
  });

  it('permite plan premium vigente', async () => {
    userPlanService.resolveUserPlan.mockResolvedValue({
      plan: 'premium',
      source: 'subscription',
      subscription_id: 'sub-1',
    } as never);

    const context = contextWithUser({ id: USER_ID });
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(userPlanService.resolveUserPlan).toHaveBeenCalledWith(USER_ID);
  });

  it('bloquea plan basic con 403 y code premium_required', async () => {
    userPlanService.resolveUserPlan.mockResolvedValue({
      plan: 'basic',
      source: 'subscription',
    } as never);

    try {
      await guard.canActivate(contextWithUser({ id: USER_ID }));
      throw new Error('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ForbiddenException);
      const body = (error as ForbiddenException).getResponse() as Record<string, unknown>;
      expect(body.statusCode).toBe(403);
      expect(body.code).toBe('premium_required');
      expect(body.message).toBe('Esta funcionalidad requiere el Plan Premium.');
    }
  });

  it('suscripción vencida (resuelta como basic default) -> 403', async () => {
    // UserPlanService ya filtra vencidas: una premium expirada resuelve basic.
    userPlanService.resolveUserPlan.mockResolvedValue({
      plan: 'basic',
      source: 'default',
    } as never);

    await expect(guard.canActivate(contextWithUser({ id: USER_ID }))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('usuario sin suscripción (basic default) -> 403', async () => {
    userPlanService.resolveUserPlan.mockResolvedValue({
      plan: 'basic',
      source: 'default',
    } as never);

    await expect(guard.canActivate(contextWithUser({ id: USER_ID }))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('request sin usuario autenticado -> 401 (sin consultar el plan)', async () => {
    await expect(guard.canActivate(contextWithUser(undefined))).rejects.toThrow(
      UnauthorizedException,
    );
    expect(userPlanService.resolveUserPlan).not.toHaveBeenCalled();
  });

  it('deja el plan resuelto disponible en request.userPlan', async () => {
    userPlanService.resolveUserPlan.mockResolvedValue({
      plan: 'premium',
      source: 'subscription',
      subscription_id: 'sub-9',
    } as never);

    const request: Record<string, unknown> = { user: { id: USER_ID } };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    await guard.canActivate(context);
    expect(request.userPlan).toEqual({
      plan: 'premium',
      source: 'subscription',
      subscription_id: 'sub-9',
    });
  });
});
