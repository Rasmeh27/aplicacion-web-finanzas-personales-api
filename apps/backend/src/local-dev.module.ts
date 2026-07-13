import { Body, Controller, Delete, ForbiddenException, Get, HttpCode, HttpStatus, Module, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { randomUUID } from 'crypto';
import { BACKEND_ENV_FILE } from './config/env-file';

const now = () => new Date().toISOString();
const userId = 'local-user';

const localUser = {
  id: userId,
  email: 'demo@smartwallet.local',
  fullName: 'Demo SmartWallet',
  primaryCurrency: 'DOP',
  monthlyIncomeEstimate: 85000,
  monthlySavingTargetPct: 20,
  monthlySavingTargetAmount: 17000,
  monthlyFixedExpenseEstimate: 32000,
  monthlyVariableExpenseEstimate: 18000,
  onboardingCompletedAt: now(),
  onboardingVersion: 1,
};

const categories = [
  { id: 'cat-salary', userId, name: 'Salario', type: 'income', classification: 'regular_income', icon: 'briefcase', color: '#2563eb', isDefault: true },
  { id: 'cat-extra', userId, name: 'Ingresos extra', type: 'income', classification: 'extra_income', icon: 'sparkles', color: '#16a34a', isDefault: true },
  { id: 'cat-home', userId, name: 'Hogar', type: 'expense', classification: 'fixed_expense', icon: 'home', color: '#f97316', isDefault: true },
  { id: 'cat-food', userId, name: 'Comida', type: 'expense', classification: 'variable_expense', icon: 'utensils', color: '#dc2626', isDefault: true },
  { id: 'cat-transport', userId, name: 'Transporte', type: 'expense', classification: 'variable_expense', icon: 'car', color: '#7c3aed', isDefault: true },
];

const transactions: any[] = [
  {
    id: 'tx-1',
    userId,
    type: 'income',
    classification: 'regular_income',
    amount: 85000,
    currency: 'DOP',
    description: 'Salario mensual',
    notes: null,
    date: '2026-07-01',
    categoryId: 'cat-salary',
    category: categories[0],
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'tx-2',
    userId,
    type: 'expense',
    classification: 'fixed_expense',
    amount: 25000,
    currency: 'DOP',
    description: 'Renta',
    notes: null,
    date: '2026-07-03',
    categoryId: 'cat-home',
    category: categories[2],
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'tx-3',
    userId,
    type: 'expense',
    classification: 'variable_expense',
    amount: 6200,
    currency: 'DOP',
    description: 'Supermercado',
    notes: null,
    date: '2026-07-06',
    categoryId: 'cat-food',
    category: categories[3],
    createdAt: now(),
    updatedAt: now(),
  },
];

const budgets: any[] = [
  {
    id: 'budget-food',
    name: 'Comida',
    category: categories[3],
    categoryId: 'cat-food',
    month: 7,
    year: 2026,
    amountLimit: 18000,
    spentAmount: 6200,
    remainingAmount: 11800,
    usagePct: 34,
    status: 'safe',
    currency: 'DOP',
    alertThresholdPct: 80,
    isActive: true,
  },
  {
    id: 'budget-transport',
    name: 'Transporte',
    category: categories[4],
    categoryId: 'cat-transport',
    month: 7,
    year: 2026,
    amountLimit: 9000,
    spentAmount: 3600,
    remainingAmount: 5400,
    usagePct: 40,
    status: 'safe',
    currency: 'DOP',
    alertThresholdPct: 80,
    isActive: true,
  },
];

const goals: any[] = [
  {
    id: 'goal-emergency',
    userId,
    name: 'Fondo de emergencia',
    targetAmount: 180000,
    currentAmount: 64000,
    currency: 'DOP',
    targetDate: '2026-12-31',
    status: 'active',
    isDefault: true,
    createdAt: now(),
    updatedAt: now(),
  },
];

const contributions: any[] = [];

function authResponse(email = localUser.email) {
  return {
    status: 'authenticated',
    accessToken: 'local-dev-access-token',
    refreshToken: 'local-dev-refresh-token',
    user: { ...localUser, email },
  };
}

function page<T>(items: T[], limit = 50, offset = 0) {
  return {
    items: items.slice(offset, offset + limit),
    total: items.length,
    limit,
    offset,
    hasMore: offset + limit < items.length,
  };
}

@Controller('auth')
class LocalAuthController {
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() body: { email?: string }) {
    return authResponse(body.email ?? localUser.email);
  }

  @Post('register')
  register(@Body() body: { email?: string; fullName?: string }) {
    return { ...authResponse(body.email ?? localUser.email), user: { ...localUser, email: body.email ?? localUser.email, fullName: body.fullName ?? localUser.fullName } };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh() {
    return authResponse();
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword() {
    return { message: 'Local dev: reset link simulated.' };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword() {
    return { message: 'Local dev: password updated.' };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout() {
    return { message: 'Sesión cerrada correctamente.' };
  }
}

@Controller('user')
class LocalUserController {
  @Get('me')
  getMe() {
    return localUser;
  }

  @Patch('me/preferences')
  updatePreferences(@Body() body: Record<string, unknown>) {
    Object.assign(localUser, body, { updatedAt: now() });
    return localUser;
  }
}

@Controller('financial-profile')
class LocalFinancialProfileController {
  @Get('me')
  getMe() {
    return localUser;
  }

  @Put('me')
  update(@Body() body: Record<string, unknown>) {
    Object.assign(localUser, body);
    return localUser;
  }

  @Put('onboarding')
  complete(@Body() body: any) {
    Object.assign(localUser, {
      primaryCurrency: body.primaryCurrency ?? localUser.primaryCurrency,
      monthlySavingTargetPct: body.monthlySavingTargetPct ?? localUser.monthlySavingTargetPct,
      monthlySavingTargetAmount: body.monthlySavingTargetAmount ?? localUser.monthlySavingTargetAmount,
      onboardingCompletedAt: now(),
    });

    return {
      profile: localUser,
      plannedItems: [],
      summary: {
        monthlyIncomeEstimate: localUser.monthlyIncomeEstimate,
        monthlyFixedExpenseEstimate: localUser.monthlyFixedExpenseEstimate,
        monthlyVariableExpenseEstimate: localUser.monthlyVariableExpenseEstimate,
        monthlyTotalExpenseEstimate: localUser.monthlyFixedExpenseEstimate + localUser.monthlyVariableExpenseEstimate,
        monthlyBalanceEstimate:
          localUser.monthlyIncomeEstimate - localUser.monthlyFixedExpenseEstimate - localUser.monthlyVariableExpenseEstimate,
        monthlySavingTargetAmount: localUser.monthlySavingTargetAmount,
        monthlySavingTargetPct: localUser.monthlySavingTargetPct,
      },
    };
  }
}

@Controller('category')
class LocalCategoryController {
  @Get()
  list(@Query() query: { type?: string; classification?: string }) {
    return categories.filter((category) => {
      if (query.type && category.type !== query.type) return false;
      if (query.classification && category.classification !== query.classification) return false;
      return true;
    });
  }
}

// Conversión a moneda base (DOP) para el mock local, espejo de
// CurrencyConversionService: compra para ingresos, venta para gastos (BCRD).
const LOCAL_USD_BUY = Number(process.env.EXCHANGE_RATE_USD_BUY) || 58.36;
const LOCAL_USD_SELL = Number(process.env.EXCHANGE_RATE_USD_SELL) || 58.95;

function convertToBaseLocal(amount: number, currency: string, type: string) {
  const cur = (currency ?? 'DOP').toUpperCase();
  let exchangeRate = 1;
  if (cur === 'USD') exchangeRate = type === 'income' ? LOCAL_USD_BUY : LOCAL_USD_SELL;
  return {
    baseCurrency: 'DOP',
    exchangeRate,
    amountBase: Math.round(Number(amount) * exchangeRate * 100) / 100,
  };
}

const baseAmountLocal = (tx: any) => Number(tx.amountBase ?? tx.amount);

@Controller('transactions')
class LocalTransactionsController {
  @Get()
  list(@Query() query: { limit?: string; offset?: string; type?: string }) {
    const limit = Number(query.limit ?? 50);
    const offset = Number(query.offset ?? 0);
    const filtered = query.type ? transactions.filter((transaction) => transaction.type === query.type) : transactions;
    return page(filtered, limit, offset);
  }

  @Get('summary')
  summary() {
    const sumByClassification = (classification: string) =>
      transactions
        .filter((tx) => tx.classification === classification)
        .reduce((sum, tx) => sum + baseAmountLocal(tx), 0);

    const totalIncome = transactions.filter((tx) => tx.type === 'income').reduce((sum, tx) => sum + baseAmountLocal(tx), 0);
    const totalExpenses = transactions.filter((tx) => tx.type === 'expense').reduce((sum, tx) => sum + baseAmountLocal(tx), 0);
    const totalExtraIncome = sumByClassification('extra_income');
    const totalFixedExpenses = sumByClassification('fixed_expense');
    return {
      year: 2026,
      month: 7,
      totalIncome,
      totalRegularIncome: totalIncome - totalExtraIncome,
      totalExtraIncome,
      totalExpenses,
      totalFixedExpenses,
      totalVariableExpenses: totalExpenses - totalFixedExpenses,
      balance: totalIncome - totalExpenses,
      savingsRate: totalIncome > 0 ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100) : 0,
      transactionCount: transactions.length,
    };
  }

  @Post()
  create(@Body() body: any) {
    const category = categories.find((item) => item.id === body.categoryId) ?? null;
    const type = ['regular_income', 'extra_income'].includes(body.classification) ? 'income' : 'expense';
    const currency = (body.currency ?? 'DOP').toUpperCase();
    const { amountBase, exchangeRate, baseCurrency } = convertToBaseLocal(body.amount, currency, type);
    const transaction = {
      id: randomUUID(),
      userId,
      type,
      classification: body.classification,
      amount: body.amount,
      currency,
      amountBase,
      exchangeRate,
      baseCurrency,
      description: body.description ?? null,
      notes: body.notes ?? null,
      date: body.date ?? new Date().toISOString().slice(0, 10),
      categoryId: body.categoryId ?? null,
      category,
      createdAt: now(),
      updatedAt: now(),
    };
    transactions.unshift(transaction);
    return transaction;
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    const transaction = transactions.find((item) => item.id === id);
    Object.assign(transaction, body, { updatedAt: now() });
    return transaction;
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    const index = transactions.findIndex((item) => item.id === id);
    if (index >= 0) transactions.splice(index, 1);
    return { id };
  }
}

@Controller('budgets')
class LocalBudgetsController {
  @Get()
  list(@Query() query: { limit?: string; offset?: string }) {
    return page(budgets, Number(query.limit ?? 50), Number(query.offset ?? 0));
  }

  @Get('summary')
  summary() {
    const totalBudgeted = budgets.reduce((sum, budget) => sum + budget.amountLimit, 0);
    const totalSpent = budgets.reduce((sum, budget) => sum + budget.spentAmount, 0);
    return {
      month: 7,
      year: 2026,
      totalBudgeted,
      totalSpent,
      totalRemaining: totalBudgeted - totalSpent,
      overallUsagePct: Math.round((totalSpent / totalBudgeted) * 100),
      activeBudgetsCount: budgets.length,
      exceededBudgetsCount: 0,
      warningBudgetsCount: 0,
      safeBudgetsCount: budgets.length,
      categoriesWithoutBudget: 1,
    };
  }

  @Post()
  create(@Body() body: any) {
    const category = categories.find((item) => item.id === body.categoryId) ?? null;
    const budget = {
      id: randomUUID(),
      name: category?.name ?? 'Presupuesto local',
      category,
      categoryId: body.categoryId,
      month: body.month,
      year: body.year,
      amountLimit: body.amountLimit,
      spentAmount: 0,
      remainingAmount: body.amountLimit,
      usagePct: 0,
      status: 'safe',
      currency: body.currency ?? 'DOP',
      alertThresholdPct: body.alertThresholdPct ?? 80,
      isActive: body.isActive ?? true,
    };
    budgets.unshift(budget);
    return [budget];
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return budgets.find((budget) => budget.id === id) ?? budgets[0];
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    const budget = budgets.find((item) => item.id === id);
    Object.assign(budget, body);
    return budget;
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    const budget = budgets.find((item) => item.id === id);
    if (budget) budget.isActive = false;
    return { id, isActive: false };
  }
}

@Controller('planning/goals')
class LocalGoalsController {
  @Get()
  list() {
    return goals;
  }

  @Get('summary')
  summary() {
    const totalSaved = goals.reduce((sum, goal) => sum + Number(goal.currentAmount), 0);
    const totalTarget = goals.reduce((sum, goal) => sum + Number(goal.targetAmount), 0);
    return {
      totalSaved,
      totalTarget,
      overallProgressPct: Math.round((totalSaved / totalTarget) * 100),
      activeGoalsCount: goals.length,
      completedGoalsCount: 0,
      emergencyFund: {
        status: 'active',
        goalId: goals[0].id,
        targetAmount: Number(goals[0].targetAmount),
        currentAmount: Number(goals[0].currentAmount),
        progressPct: Math.round((Number(goals[0].currentAmount) / Number(goals[0].targetAmount)) * 100),
        suggestedTargetAmount: null,
        monthsCovered: 2,
      },
    };
  }

  @Post()
  create(@Body() body: any) {
    const goal = { id: randomUUID(), userId, status: 'active', isDefault: false, createdAt: now(), updatedAt: now(), ...body };
    goals.unshift(goal);
    return goal;
  }

  @Post('emergency-fund')
  emergencyFund(@Body() body: any) {
    Object.assign(goals[0], body, { updatedAt: now() });
    return goals[0];
  }

  @Get(':id/contributions')
  getContributions(@Param('id') id: string) {
    return contributions.filter((item) => item.goalId === id);
  }

  @Post(':id/contributions')
  contribute(@Param('id') id: string, @Body() body: any) {
    const contribution = {
      id: randomUUID(),
      goalId: id,
      userId,
      amount: body.amount,
      currency: body.currency ?? 'DOP',
      contributionDate: body.contributionDate ?? new Date().toISOString().slice(0, 10),
      note: body.note ?? null,
      createdAt: now(),
    };
    contributions.unshift(contribution);
    const goal = goals.find((item) => item.id === id);
    if (goal) goal.currentAmount = Number(goal.currentAmount) + Number(body.amount ?? 0);
    return { goal, contribution };
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return goals.find((goal) => goal.id === id) ?? goals[0];
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    const goal = goals.find((item) => item.id === id);
    Object.assign(goal, body, { updatedAt: now() });
    return goal;
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    const index = goals.findIndex((item) => item.id === id);
    if (index >= 0) goals.splice(index, 1);
    return { id };
  }
}

@Controller('dashboard-reports')
class LocalDashboardController {
  @Get('monthly-income-total')
  income() {
    return { total: 85000, currency: 'DOP' };
  }

  @Get('monthly-expense-total')
  expenses() {
    return { total: 31200, currency: 'DOP' };
  }

  @Get('monthly-balance')
  balance() {
    return { income: 85000, expenses: 31200, balance: 53800, currency: 'DOP' };
  }

  @Get('savings-percentage')
  savings() {
    return { percentage: 63 };
  }

  @Get('expenses-by-category')
  expensesByCategory() {
    return [
      { category: 'Hogar', total: 25000 },
      { category: 'Comida', total: 6200 },
    ];
  }

  @Get('financial-goals-summary')
  goalsSummary() {
    return { totalSaved: 64000, totalTarget: 180000, progressPct: 36 };
  }

  @Get('debts-summary')
  debtsSummary() {
    return { totalDebt: 0, monthlyPayment: 0, activeDebts: 0 };
  }

  @Get('financial-health')
  health() {
    return { score: 82, status: 'healthy' };
  }
}

@Controller('assistant')
class LocalAssistantController {
  @Post('chat')
  chat(@Body() body: { session_id?: string }) {
    return {
      ok: true,
      message: 'Modo local activo: la API, login y datos demo estan funcionando sin Postgres.',
      session_id: body.session_id ?? 'local-session',
      metadata: { mode: 'local' },
    };
  }

  @Get('sessions')
  sessions() {
    return { items: [], total: 0 };
  }

  @Get('sessions/:sessionId/messages')
  messages() {
    return { items: [], total: 0 };
  }
}

@Controller()
class LocalHealthController {
  @Get('health')
  health() {
    return {
      ok: true,
      mode: 'local-mock',
      services: {
        api: 'running',
        database: 'mocked',
        auth: 'mocked',
      },
    };
  }
}

// --- Plan Premium (demo) -----------------------------------------------------
// LOCAL_MOCK_PLAN=basic|premium simula el plan del usuario demo (default premium
// para poder recorrer Inversiones). TODO es demo: marketDataSource='mock'.

const localPlan = (): 'basic' | 'premium' =>
  (process.env.LOCAL_MOCK_PLAN ?? 'premium').toLowerCase() === 'basic' ? 'basic' : 'premium';

const planFeatures = (plan: 'basic' | 'premium') => ({
  investments: plan === 'premium',
  portfolioAnalytics: plan === 'premium',
  premiumAssistant: plan === 'premium',
});

@Controller('subscriptions')
class LocalSubscriptionsController {
  @Get('me')
  me() {
    const plan = localPlan();
    return {
      plan,
      source: plan === 'premium' ? 'subscription' : 'default',
      status: plan === 'premium' ? 'active' : null,
      subscriptionId: plan === 'premium' ? 'local-demo-subscription' : null,
      currentPeriodEnd:
        plan === 'premium' ? new Date(Date.now() + 30 * 86_400_000).toISOString() : null,
      features: planFeatures(plan),
    };
  }

  @Get('plans')
  plans() {
    return [
      { code: 'basic', name: 'Basic', description: 'Plan básico gratuito.', features: planFeatures('basic') },
      { code: 'premium', name: 'Premium', description: 'Plan premium (demo local).', features: planFeatures('premium') },
    ];
  }
}

const DEMO_QUOTES: Record<string, { name: string; assetType: 'stock' | 'etf'; price: number; previousClose: number }> = {
  AAPL: { name: 'Apple Inc. (demo)', assetType: 'stock', price: 228.4, previousClose: 226.1 },
  MSFT: { name: 'Microsoft Corporation (demo)', assetType: 'stock', price: 452.3, previousClose: 449.8 },
  VOO: { name: 'Vanguard S&P 500 ETF (demo)', assetType: 'etf', price: 556.2, previousClose: 554.9 },
  QQQ: { name: 'Invesco QQQ Trust (demo)', assetType: 'etf', price: 520.7, previousClose: 522.3 },
};

const demoPositions: any[] = [
  {
    id: 'demo-pos-aapl',
    symbol: 'AAPL',
    displayName: 'Apple Inc. (demo)',
    assetType: 'stock',
    quantity: 2.5,
    averageCost: 190.25,
    currency: 'USD',
    purchaseDate: '2026-06-01',
    notes: 'Posición demo',
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'demo-pos-voo',
    symbol: 'VOO',
    displayName: 'Vanguard S&P 500 ETF (demo)',
    assetType: 'etf',
    quantity: 1.2,
    averageCost: 540,
    currency: 'USD',
    purchaseDate: '2026-05-15',
    notes: null,
    createdAt: now(),
    updatedAt: now(),
  },
];

const round2Local = (value: number) => Math.round(value * 100) / 100;

function enrichDemoPosition(position: any, totalValue: number | null) {
  const quote = DEMO_QUOTES[position.symbol];
  const costBasis = round2Local(position.quantity * position.averageCost);
  if (!quote) {
    return {
      ...position,
      costBasis,
      currentPrice: null,
      marketValue: null,
      unrealizedGainLoss: null,
      unrealizedGainLossPct: null,
      dayChange: null,
      dayChangePct: null,
      weight: null,
      priceAsOf: null,
      priceStatus: 'unavailable',
    };
  }
  const marketValue = round2Local(position.quantity * quote.price);
  const gain = round2Local(marketValue - costBasis);
  return {
    ...position,
    costBasis,
    currentPrice: quote.price,
    marketValue,
    unrealizedGainLoss: gain,
    unrealizedGainLossPct: costBasis > 0 ? round2Local((gain / costBasis) * 100) : null,
    dayChange: round2Local(position.quantity * (quote.price - quote.previousClose)),
    dayChangePct: round2Local(((quote.price - quote.previousClose) / quote.previousClose) * 100),
    weight:
      totalValue && totalValue > 0 ? Math.round((marketValue / totalValue) * 10000) / 10000 : null,
    priceAsOf: now(),
    priceStatus: 'fresh',
  };
}

function demoTotals() {
  const totalValue = demoPositions.reduce(
    (acc, position) =>
      acc + (DEMO_QUOTES[position.symbol]?.price ?? 0) * Number(position.quantity),
    0,
  );
  return { totalValue: round2Local(totalValue) };
}

@Controller('investments')
class LocalInvestmentsController {
  private guard() {
    if (localPlan() !== 'premium') {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'premium_required',
        message: 'Esta funcionalidad requiere el Plan Premium.',
      });
    }
  }

  @Get('portfolio')
  portfolio() {
    this.guard();
    return {
      id: 'demo-portfolio',
      userId,
      name: 'Mi Portafolio (demo)',
      baseCurrency: 'USD',
      isDefault: true,
      createdAt: now(),
      updatedAt: now(),
    };
  }

  @Get('positions')
  positions() {
    this.guard();
    const { totalValue } = demoTotals();
    return {
      portfolioId: 'demo-portfolio',
      baseCurrency: 'USD',
      items: demoPositions.map((position) => enrichDemoPosition(position, totalValue)),
      marketDataStatus: 'fresh',
      marketDataSource: 'mock',
      weightsBasis: 'market_value',
      asOf: now(),
      marketData: {
        provider: 'mock',
        status: 'fresh',
        isMock: true,
        asOf: now(),
        marketStatus: 'closed',
        failedSymbols: [],
      },
    };
  }

  @Post('positions')
  create(@Body() body: any) {
    this.guard();
    const symbol = String(body.symbol ?? '').toUpperCase();
    const position = {
      id: randomUUID(),
      symbol,
      displayName: DEMO_QUOTES[symbol]?.name ?? null,
      assetType: body.assetType ?? 'stock',
      quantity: Number(body.quantity ?? 0),
      averageCost: Number(body.averageCost ?? 0),
      currency: 'USD',
      purchaseDate: body.purchaseDate ?? null,
      notes: body.notes ?? null,
      createdAt: now(),
      updatedAt: now(),
    };
    demoPositions.push(position);
    return { position: enrichDemoPosition(position, demoTotals().totalValue), warnings: [] };
  }

  @Patch('positions/:id')
  update(@Param('id') id: string, @Body() body: any) {
    this.guard();
    const position = demoPositions.find((item) => item.id === id);
    if (position) Object.assign(position, body, { updatedAt: now() });
    return position ? enrichDemoPosition(position, demoTotals().totalValue) : { id };
  }

  @Delete('positions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    this.guard();
    const index = demoPositions.findIndex((item) => item.id === id);
    if (index >= 0) demoPositions.splice(index, 1);
  }

  @Get('summary')
  summary() {
    this.guard();
    const { totalValue } = demoTotals();
    const enriched = demoPositions.map((position) => enrichDemoPosition(position, totalValue));
    const costBasis = round2Local(enriched.reduce((acc, p) => acc + p.costBasis, 0));
    const gain = round2Local((totalValue ?? 0) - costBasis);
    const sorted = [...enriched].sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0));
    return {
      portfolioId: 'demo-portfolio',
      baseCurrency: 'USD',
      positionsCount: enriched.length,
      costBasis,
      marketValue: totalValue,
      unrealizedGainLoss: gain,
      unrealizedGainLossPct: costBasis > 0 ? round2Local((gain / costBasis) * 100) : null,
      dayChange: round2Local(enriched.reduce((acc, p) => acc + (p.dayChange ?? 0), 0)),
      dayChangePct: null,
      topPosition: sorted[0] ? { symbol: sorted[0].symbol, weight: sorted[0].weight ?? 0 } : null,
      topThreeConcentration: Math.min(
        1,
        Math.round(sorted.slice(0, 3).reduce((acc, p) => acc + (p.weight ?? 0), 0) * 10000) / 10000,
      ),
      weightsBasis: 'market_value',
      marketDataStatus: 'fresh',
      marketDataSource: 'mock',
      asOf: now(),
      updatedAt: now(),
      marketData: {
        provider: 'mock',
        status: 'fresh',
        isMock: true,
        asOf: now(),
        marketStatus: 'closed',
        failedSymbols: [],
      },
    };
  }

  @Get('allocation')
  allocation() {
    this.guard();
    const { totalValue } = demoTotals();
    const enriched = demoPositions.map((position) => enrichDemoPosition(position, totalValue));
    const byType = new Map<string, number>();
    for (const item of enriched) {
      byType.set(item.assetType, (byType.get(item.assetType) ?? 0) + (item.marketValue ?? 0));
    }
    return {
      portfolioId: 'demo-portfolio',
      basis: 'market_value',
      items: enriched
        .map((item) => ({
          symbol: item.symbol,
          displayName: item.displayName,
          assetType: item.assetType,
          value: item.marketValue ?? 0,
          weight: item.weight ?? 0,
        }))
        .sort((a, b) => b.weight - a.weight),
      byAssetType: [...byType.entries()].map(([assetType, value]) => ({
        assetType,
        value: round2Local(value),
        weight: totalValue > 0 ? Math.round((value / totalValue) * 10000) / 10000 : 0,
      })),
      marketDataStatus: 'fresh',
      marketDataSource: 'mock',
      asOf: now(),
      marketData: {
        provider: 'mock',
        status: 'fresh',
        isMock: true,
        asOf: now(),
        marketStatus: 'closed',
        failedSymbols: [],
      },
    };
  }

  @Get('performance')
  performance() {
    this.guard();
    const { totalValue } = demoTotals();
    const costBasis = demoPositions.reduce(
      (acc, position) => acc + position.quantity * position.averageCost,
      0,
    );
    // Snapshots demo de los últimos 10 días (etiquetados como demo/mock).
    const points = Array.from({ length: 10 }).map((_, index) => {
      const date = new Date(Date.now() - (9 - index) * 86_400_000).toISOString().slice(0, 10);
      const drift = 1 + (index - 5) * 0.004;
      const marketValue = round2Local(totalValue * drift);
      return {
        date,
        costBasis: round2Local(costBasis),
        marketValue,
        unrealizedGainLoss: round2Local(marketValue - costBasis),
        marketDataStatus: 'fresh',
      };
    });
    return {
      portfolioId: 'demo-portfolio',
      range: 'ALL',
      points,
      insufficientData: points.length < 2,
      historyStartsAt: points[0]?.date ?? null,
    };
  }

  @Get('symbols/search')
  search(@Query('query') query = '') {
    this.guard();
    const normalized = query.trim().toLowerCase();
    return {
      items: Object.entries(DEMO_QUOTES)
        .filter(
          ([symbol, meta]) =>
            !normalized ||
            symbol.toLowerCase().startsWith(normalized) ||
            meta.name.toLowerCase().includes(normalized),
        )
        .map(([symbol, meta]) => ({
          symbol,
          name: meta.name,
          assetType: meta.assetType,
          region: 'United States',
          currency: 'USD',
        })),
      marketDataSource: 'mock',
    };
  }

  @Get('symbols/:symbol/quote')
  quote(@Param('symbol') rawSymbol: string) {
    this.guard();
    const symbol = rawSymbol.toUpperCase();
    const meta = DEMO_QUOTES[symbol];
    if (!meta) {
      return { symbol, quote: null, status: 'unavailable', marketDataSource: 'mock' };
    }
    return {
      symbol,
      status: 'fresh',
      quote: {
        symbol,
        price: meta.price,
        currency: 'USD',
        previousClose: meta.previousClose,
        change: round2Local(meta.price - meta.previousClose),
        changePct: round2Local(((meta.price - meta.previousClose) / meta.previousClose) * 100),
        asOf: now(),
      },
      marketDataSource: 'mock',
    };
  }

  @Get('symbols/:symbol/history')
  history(@Param('symbol') rawSymbol: string, @Query('range') range = '3M') {
    this.guard();
    const symbol = rawSymbol.toUpperCase();
    const meta = DEMO_QUOTES[symbol];
    const days = range === '1M' ? 22 : range === '6M' ? 131 : range === '1Y' ? 261 : 66;
    const base = meta?.price ?? 100;
    const points = Array.from({ length: days }).map((_, index) => {
      const date = new Date(Date.now() - (days - 1 - index) * 86_400_000);
      const wave = Math.sin(index / 9) * 0.06 + Math.sin(index / 3.1) * 0.015;
      return { date: date.toISOString().slice(0, 10), close: round2Local(base * (1 + wave)) };
    });
    return { symbol, range, points, marketDataSource: 'mock' };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: BACKEND_ENV_FILE }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
  ],
  controllers: [
    LocalAuthController,
    LocalUserController,
    LocalFinancialProfileController,
    LocalCategoryController,
    LocalTransactionsController,
    LocalBudgetsController,
    LocalGoalsController,
    LocalDashboardController,
    LocalAssistantController,
    LocalHealthController,
    LocalSubscriptionsController,
    LocalInvestmentsController,
  ],
})
export class LocalDevModule {}
