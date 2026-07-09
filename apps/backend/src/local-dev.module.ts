import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Module, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { randomUUID } from 'crypto';

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
    return { message: 'Logged out successfully.' };
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
    const totalIncome = transactions.filter((tx) => tx.type === 'income').reduce((sum, tx) => sum + Number(tx.amount), 0);
    const totalExpenses = transactions.filter((tx) => tx.type === 'expense').reduce((sum, tx) => sum + Number(tx.amount), 0);
    return {
      year: 2026,
      month: 7,
      totalIncome,
      totalRegularIncome: totalIncome,
      totalExtraIncome: 0,
      totalExpenses,
      totalFixedExpenses: 25000,
      totalVariableExpenses: totalExpenses - 25000,
      balance: totalIncome - totalExpenses,
      savingsRate: Math.round(((totalIncome - totalExpenses) / totalIncome) * 100),
      transactionCount: transactions.length,
    };
  }

  @Post()
  create(@Body() body: any) {
    const category = categories.find((item) => item.id === body.categoryId) ?? null;
    const transaction = {
      id: randomUUID(),
      userId,
      type: ['regular_income', 'extra_income'].includes(body.classification) ? 'income' : 'expense',
      classification: body.classification,
      amount: body.amount,
      currency: body.currency ?? 'DOP',
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
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
  ],
})
export class LocalDevModule {}
