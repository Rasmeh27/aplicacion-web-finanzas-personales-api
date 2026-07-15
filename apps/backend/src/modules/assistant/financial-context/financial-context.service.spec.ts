import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExecutionContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Budget } from '../../planning/entities/budget.entity';
import { Category } from '../../planning/entities/category.entity';
import { FinancialGoal } from '../../planning/entities/financial-goal.entity';
import { Transaction } from '../../movements/entities/transaction.entity';
import { User } from '../../user/entities/user.entity';
import { UserPlanService } from '../../subscriptions/user-plan.service';
import { InvestmentContextService } from '../../us-stock-market-investment/services/investment-context.service';
import { FinancialContextRequestDto } from './dto/financial-context-request.dto';
import { FinancialContextService } from './financial-context.service';
import { InternalApiKeyGuard } from './guards/internal-api-key.guard';

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';

function baseRequest(
  overrides: Partial<FinancialContextRequestDto> = {},
): FinancialContextRequestDto {
  return {
    request_id: 'req-fin-1',
    user_id: USER_ID,
    plan: 'basic',
    allowed_scopes: ['app_usage', 'finance_basic'],
    locale: 'es',
    period: { from: '2026-07-01', to: '2026-07-31' },
    question: '¿Cómo van mis gastos?',
    ...overrides,
  } as FinancialContextRequestDto;
}

function tx(partial: Record<string, unknown>): Transaction {
  return {
    amount: 0,
    type: 'expense',
    classification: 'variable_expense',
    categoryId: null,
    date: '2026-07-10',
    ...partial,
  } as unknown as Transaction;
}

const PREMIUM_SCOPES = ['app_usage', 'finance_basic', 'finance_premium', 'user_private'];

function investmentContext(overrides: Record<string, unknown> = {}) {
  return {
    portfolioAvailable: true,
    currency: 'USD',
    marketDataStatus: 'fresh',
    asOf: '2026-07-11T15:00:00.000Z',
    summary: {
      costBasis: 1500,
      marketValue: 1650,
      unrealizedGainLoss: 150,
      unrealizedGainLossPct: 10,
      dayChange: 12,
    },
    allocation: [
      { symbol: 'AAPL', assetType: 'stock', marketValue: 900, weight: 0.5455 },
    ],
    riskIndicators: { topPositionWeight: 0.5455, topThreeWeight: 1, positionCount: 1 },
    warnings: [],
    ...overrides,
  };
}

describe('FinancialContextService', () => {
  let service: FinancialContextService;
  let userRepo: { findOne: jest.Mock };
  let txRepo: { find: jest.Mock };
  let budgetRepo: { find: jest.Mock };
  let goalRepo: { find: jest.Mock };
  let categoryRepo: { find: jest.Mock };
  let userPlanService: { resolveUserPlan: jest.Mock };
  let investmentContextService: { buildInvestmentContext: jest.Mock };

  beforeEach(async () => {
    userRepo = { findOne: jest.fn() };
    txRepo = { find: jest.fn() };
    budgetRepo = { find: jest.fn() };
    goalRepo = { find: jest.fn() };
    categoryRepo = { find: jest.fn() };
    userPlanService = { resolveUserPlan: jest.fn() };
    investmentContextService = { buildInvestmentContext: jest.fn() };

    // Defaults: usuario existe, sin datos, plan real basic, sin portafolio.
    userRepo.findOne.mockResolvedValue({ id: USER_ID, primaryCurrency: 'DOP' } as never);
    txRepo.find.mockResolvedValue([] as never);
    budgetRepo.find.mockResolvedValue([] as never);
    goalRepo.find.mockResolvedValue([] as never);
    categoryRepo.find.mockResolvedValue([] as never);
    userPlanService.resolveUserPlan.mockResolvedValue({
      plan: 'basic',
      source: 'default',
    } as never);
    investmentContextService.buildInvestmentContext.mockResolvedValue(null as never);

    const module = await Test.createTestingModule({
      providers: [
        FinancialContextService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Transaction), useValue: txRepo },
        { provide: getRepositoryToken(Budget), useValue: budgetRepo },
        { provide: getRepositoryToken(FinancialGoal), useValue: goalRepo },
        { provide: getRepositoryToken(Category), useValue: categoryRepo },
        { provide: UserPlanService, useValue: userPlanService },
        { provide: InvestmentContextService, useValue: investmentContextService },
      ],
    }).compile();

    service = module.get(FinancialContextService);
  });

  it('aísla por user_id: TODAS las consultas se filtran por el usuario del request', async () => {
    // Fase 6 #1: el usuario A jamás puede recibir datos del usuario B. La única
    // fuente del id es el request (que nació del JWT en el backend). Verificamos
    // que cada repositorio se consulta con ese user_id y ningún otro.
    txRepo.find.mockResolvedValue([tx({ amount: 1000, categoryId: 'cat-1' })] as never);
    categoryRepo.find.mockResolvedValue([{ id: 'cat-1', name: 'Comida' }] as never);
    budgetRepo.find.mockResolvedValue([] as never);
    goalRepo.find.mockResolvedValue([] as never);

    await service.buildFinancialContext(baseRequest());

    const whereUserIdOf = (mock: jest.Mock) =>
      (mock.mock.calls[0][0] as { where: { userId: string } }).where.userId;

    expect((userRepo.findOne.mock.calls[0][0] as { where: { id: string } }).where.id).toBe(
      USER_ID,
    );
    expect(whereUserIdOf(txRepo.find)).toBe(USER_ID);
    expect(whereUserIdOf(budgetRepo.find)).toBe(USER_ID);
    expect(whereUserIdOf(goalRepo.find)).toBe(USER_ID);
    expect(whereUserIdOf(categoryRepo.find)).toBe(USER_ID);

    // Ningún filtro usó un id distinto al del request.
    for (const mock of [txRepo.find, budgetRepo.find, goalRepo.find, categoryRepo.find]) {
      for (const call of mock.mock.calls) {
        expect((call[0] as { where: { userId: string } }).where.userId).toBe(USER_ID);
      }
    }
  });

  it('devuelve 404 si el user_id no existe', async () => {
    userRepo.findOne.mockResolvedValue(null as never);
    await expect(service.buildFinancialContext(baseRequest())).rejects.toThrow(
      NotFoundException,
    );
  });

  it('rechaza scopes no permitidos para el plan basic (400)', async () => {
    await expect(
      service.buildFinancialContext(
        baseRequest({ allowed_scopes: ['app_usage', 'finance_premium'] }),
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rechaza period.from > period.to (400)', async () => {
    await expect(
      service.buildFinancialContext(
        baseRequest({ period: { from: '2026-07-31', to: '2026-07-01' } }),
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rechaza un periodo mayor a 12 meses (400)', async () => {
    await expect(
      service.buildFinancialContext(
        baseRequest({ period: { from: '2025-01-01', to: '2026-06-30' } }),
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rechaza fechas inválidas como 2026-02-30 (400)', async () => {
    await expect(
      service.buildFinancialContext(
        baseRequest({ period: { from: '2026-02-30', to: '2026-03-31' } }),
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('usuario sin datos -> ok=true, has_sufficient_data=false, ceros y warning', async () => {
    const res = await service.buildFinancialContext(baseRequest());
    expect(res.ok).toBe(true);
    expect(res.has_sufficient_data).toBe(false);
    expect(res.summary.transactions_count).toBe(0);
    expect(res.summary.income_total).toBe(0);
    expect(res.summary.expense_total).toBe(0);
    expect(res.summary.savings_rate).toBeNull();
    expect(res.top_categories).toEqual([]);
    expect(res.warnings.join(' ')).toContain('no tiene movimientos');
  });

  it('usa el mes actual como periodo por defecto', async () => {
    const res = await service.buildFinancialContext(baseRequest({ period: undefined }));
    const now = new Date();
    const prefix = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    expect(res.period.from).toBe(`${prefix}-01`);
    expect(res.period.to.startsWith(prefix)).toBe(true);
  });

  it('calcula summary correcto con ingresos y gastos', async () => {
    txRepo.find.mockResolvedValue([
      tx({ amount: 50000, type: 'income', classification: 'regular_income' }),
      tx({ amount: 25000, type: 'income', classification: 'extra_income' }),
      tx({ amount: 18000, type: 'expense', classification: 'fixed_expense' }),
      tx({ amount: 24000, type: 'expense', classification: 'variable_expense' }),
    ] as never);

    const res = await service.buildFinancialContext(baseRequest());
    expect(res.has_sufficient_data).toBe(true);
    expect(res.summary.income_total).toBe(75000);
    expect(res.summary.expense_total).toBe(42000);
    expect(res.summary.fixed_expenses_total).toBe(18000);
    expect(res.summary.variable_expenses_total).toBe(24000);
    expect(res.summary.net_cashflow).toBe(33000);
    expect(res.summary.savings_rate).toBe(0.44);
    expect(res.summary.transactions_count).toBe(4);
    expect(res.currency).toBe('DOP');
  });

  it('sin ingresos: savings_rate=null y warning', async () => {
    txRepo.find.mockResolvedValue([
      tx({ amount: 1000 }),
      tx({ amount: 2000 }),
      tx({ amount: 500 }),
    ] as never);
    const res = await service.buildFinancialContext(baseRequest());
    expect(res.summary.savings_rate).toBeNull();
    expect(res.warnings.join(' ')).toContain('tasa de ahorro');
  });

  it('calcula top_categories con nombres del usuario, orden y percentage', async () => {
    txRepo.find.mockResolvedValue([
      tx({ amount: 8000, categoryId: 'cat-transporte' }),
      tx({ amount: 12000, categoryId: 'cat-comida' }),
      tx({ amount: 4000, categoryId: null }),
      tx({ amount: 6000, categoryId: 'cat-comida' }),
    ] as never);
    categoryRepo.find.mockResolvedValue([
      { id: 'cat-transporte', name: 'Transporte' },
      { id: 'cat-comida', name: 'Alimentación' },
    ] as never);

    const res = await service.buildFinancialContext(baseRequest());
    expect(res.top_categories[0]).toEqual({
      category: 'Alimentación',
      amount: 18000,
      percentage: 0.6,
      type: 'expense',
    });
    expect(res.top_categories[1].category).toBe('Transporte');
    expect(res.top_categories[2].category).toBe('Sin categoría');
    // La búsqueda de nombres queda restringida al usuario dueño.
    const arg = categoryRepo.find.mock.calls[0][0] as { where: { userId: string } };
    expect(arg.where.userId).toBe(USER_ID);
  });

  it('resume budgets con spent/remaining/status', async () => {
    txRepo.find.mockResolvedValue([
      tx({ amount: 9000, categoryId: 'cat-comida', date: '2026-07-10' }),
      tx({ amount: 500, categoryId: 'cat-otros', date: '2026-07-11' }),
      tx({ amount: 100, type: 'income', classification: 'regular_income' }),
    ] as never);
    budgetRepo.find.mockResolvedValue([
      {
        name: 'Alimentación',
        categoryId: 'cat-comida',
        periodMonth: '2026-07-01',
        limitAmount: 12000,
        alertThresholdPct: 80,
      },
      {
        name: 'Global',
        categoryId: null,
        periodMonth: '2026-07-01',
        limitAmount: 9000,
        alertThresholdPct: 80,
      },
    ] as never);

    const res = await service.buildFinancialContext(baseRequest());
    expect(res.budgets[0]).toEqual({
      name: 'Alimentación',
      budgeted: 12000,
      spent: 9000,
      remaining: 3000,
      status: 'on_track',
    });
    // Presupuesto global: suma TODOS los gastos del mes (9500 > 9000).
    expect(res.budgets[1].status).toBe('exceeded');
    expect(res.budgets[1].spent).toBe(9500);
  });

  it('resume goals activos con progreso', async () => {
    goalRepo.find.mockResolvedValue([
      { name: 'Fondo de emergencia', targetAmount: 100000, currentAmount: 25000 },
    ] as never);
    const res = await service.buildFinancialContext(baseRequest());
    expect(res.goals).toEqual([
      {
        name: 'Fondo de emergencia',
        target_amount: 100000,
        current_amount: 25000,
        progress_percentage: 25,
      },
    ]);
  });

  it('no devuelve transacciones crudas ni campos sensibles', async () => {
    txRepo.find.mockResolvedValue([
      tx({ amount: 1000 }),
      tx({ amount: 2000 }),
      tx({ amount: 3000 }),
    ] as never);
    const res = await service.buildFinancialContext(baseRequest());
    const keys = Object.keys(res);
    for (const forbidden of [
      'transactions',
      'movements',
      'email',
      'allowed_scopes',
      'accounts',
      'cards',
      'jwt',
      'api_key',
      'prompt',
    ]) {
      expect(keys).not.toContain(forbidden);
    }
    expect(res.metadata.raw_transactions_included).toBe(false);
    const serialized = JSON.stringify(res);
    expect(serialized).not.toContain('merchant');
    expect(serialized).not.toContain('@');
  });

  describe('sección premium de inversiones', () => {
    it('premium con scopes premium y pregunta de inversiones -> incluye investments', async () => {
      userPlanService.resolveUserPlan.mockResolvedValue({
        plan: 'premium',
        source: 'subscription',
        subscription_id: 'sub-1',
      } as never);
      investmentContextService.buildInvestmentContext.mockResolvedValue(
        investmentContext() as never,
      );

      const res = await service.buildFinancialContext(
        baseRequest({
          plan: 'premium',
          allowed_scopes: PREMIUM_SCOPES,
          question: 'Analiza mi portafolio',
        }),
      );

      expect(res.investments).toBeDefined();
      expect(res.investments?.summary?.costBasis).toBe(1500);
      expect(res.metadata.investment_context_included).toBe(true);
      expect(investmentContextService.buildInvestmentContext).toHaveBeenCalledWith(USER_ID);
    });

    it('basic NUNCA recibe investments (scopes basic)', async () => {
      const res = await service.buildFinancialContext(
        baseRequest({ question: 'Analiza mi portafolio de inversiones' }),
      );
      expect(res.investments).toBeUndefined();
      expect(res.metadata.investment_context_included).toBe(false);
      expect(investmentContextService.buildInvestmentContext).not.toHaveBeenCalled();
    });

    it('request manipulado (plan premium) pero plan REAL basic -> sin investments', async () => {
      // El request dice premium con todos los scopes (p. ej. prompt injection o
      // caller comprometido), pero UserPlanService resuelve basic.
      userPlanService.resolveUserPlan.mockResolvedValue({
        plan: 'basic',
        source: 'default',
      } as never);

      const res = await service.buildFinancialContext(
        baseRequest({
          plan: 'premium',
          allowed_scopes: PREMIUM_SCOPES,
          question: 'Analiza mi portafolio',
        }),
      );

      expect(res.investments).toBeUndefined();
      expect(investmentContextService.buildInvestmentContext).not.toHaveBeenCalled();
    });

    it('premium sin scope user_private -> sin investments', async () => {
      userPlanService.resolveUserPlan.mockResolvedValue({
        plan: 'premium',
        source: 'subscription',
      } as never);

      const res = await service.buildFinancialContext(
        baseRequest({
          plan: 'premium',
          allowed_scopes: ['app_usage', 'finance_basic', 'finance_premium'],
          question: 'Analiza mi portafolio',
        }),
      );

      expect(res.investments).toBeUndefined();
      expect(investmentContextService.buildInvestmentContext).not.toHaveBeenCalled();
    });

    it('pregunta sin relación con inversiones -> sin investments', async () => {
      userPlanService.resolveUserPlan.mockResolvedValue({
        plan: 'premium',
        source: 'subscription',
      } as never);

      const res = await service.buildFinancialContext(
        baseRequest({
          plan: 'premium',
          allowed_scopes: PREMIUM_SCOPES,
          question: '¿Cómo cambio el idioma de la aplicación?',
        }),
      );

      expect(res.investments).toBeUndefined();
      expect(investmentContextService.buildInvestmentContext).not.toHaveBeenCalled();
    });

    it('sin question -> incluye investments (los scopes premium señalan la intención)', async () => {
      userPlanService.resolveUserPlan.mockResolvedValue({
        plan: 'premium',
        source: 'subscription',
      } as never);
      investmentContextService.buildInvestmentContext.mockResolvedValue(
        investmentContext() as never,
      );

      const res = await service.buildFinancialContext(
        baseRequest({
          plan: 'premium',
          allowed_scopes: PREMIUM_SCOPES,
          question: undefined,
        }),
      );

      expect(res.investments).toBeDefined();
    });

    it('fallo del contexto de inversiones no rompe el resto del resumen', async () => {
      userPlanService.resolveUserPlan.mockResolvedValue({
        plan: 'premium',
        source: 'subscription',
      } as never);
      investmentContextService.buildInvestmentContext.mockRejectedValue(
        new Error('market boom') as never,
      );

      const res = await service.buildFinancialContext(
        baseRequest({
          plan: 'premium',
          allowed_scopes: PREMIUM_SCOPES,
          question: 'Analiza mi portafolio',
        }),
      );

      expect(res.ok).toBe(true);
      expect(res.investments).toBeUndefined();
      expect(res.metadata.investment_context_included).toBe(false);
    });

    it('la sección investments no contiene notas privadas ni user_id', async () => {
      userPlanService.resolveUserPlan.mockResolvedValue({
        plan: 'premium',
        source: 'subscription',
      } as never);
      investmentContextService.buildInvestmentContext.mockResolvedValue(
        investmentContext() as never,
      );

      const res = await service.buildFinancialContext(
        baseRequest({
          plan: 'premium',
          allowed_scopes: PREMIUM_SCOPES,
          question: 'Analiza mi portafolio',
        }),
      );

      const serialized = JSON.stringify(res.investments);
      expect(serialized).not.toContain('notes');
      expect(serialized).not.toContain('purchaseDate');
      expect(serialized).not.toContain(USER_ID);
    });
  });
});

describe('InternalApiKeyGuard', () => {
  const makeContext = (headers: Record<string, unknown>): ExecutionContext =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ headers }) }),
    }) as unknown as ExecutionContext;

  const makeGuard = (configuredKey: string | undefined) =>
    new InternalApiKeyGuard({
      get: jest.fn().mockReturnValue(configuredKey),
    } as unknown as ConfigService);

  it('rechaza con 401 si falta X-Internal-API-Key', () => {
    const guard = makeGuard('super-secret');
    expect(() => guard.canActivate(makeContext({}))).toThrow(UnauthorizedException);
  });

  it('rechaza con 401 si la key es incorrecta', () => {
    const guard = makeGuard('super-secret');
    expect(() =>
      guard.canActivate(makeContext({ 'x-internal-api-key': 'wrong' })),
    ).toThrow(UnauthorizedException);
  });

  it('devuelve 500 si la key no está configurada o es change-me', () => {
    expect(() =>
      makeGuard(undefined).canActivate(
        makeContext({ 'x-internal-api-key': 'anything' }),
      ),
    ).toThrow(InternalServerErrorException);
    expect(() =>
      makeGuard('change-me').canActivate(
        makeContext({ 'x-internal-api-key': 'change-me' }),
      ),
    ).toThrow(InternalServerErrorException);
  });

  it('acepta la key correcta', () => {
    const guard = makeGuard('super-secret');
    expect(
      guard.canActivate(makeContext({ 'x-internal-api-key': 'super-secret' })),
    ).toBe(true);
  });
});
