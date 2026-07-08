import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { Budget } from '../../planning/entities/budget.entity';
import { Category } from '../../planning/entities/category.entity';
import {
  FinancialGoal,
  FinancialGoalStatus,
} from '../../planning/entities/financial-goal.entity';
import {
  Transaction,
  TransactionClassification,
  TransactionType,
} from '../../movements/entities/transaction.entity';
import { User } from '../../user/entities/user.entity';
import { FinancialContextRequestDto } from './dto/financial-context-request.dto';
import {
  FinancialBudgetSummaryResponse,
  FinancialCategorySummaryResponse,
  FinancialContextResponseDto,
  FinancialGoalSummaryResponse,
  FinancialPeriodResponse,
} from './dto/financial-context-response.dto';

/** Scopes que cada plan puede pedir (mismas reglas que el ai-service). */
const PLAN_ALLOWED_SCOPES: Record<'basic' | 'premium', ReadonlySet<string>> = {
  basic: new Set(['app_usage', 'finance_basic']),
  premium: new Set(['app_usage', 'finance_basic', 'finance_premium', 'user_private']),
};

/** Mínimo de movimientos en el periodo para un análisis confiable. */
const MIN_TRANSACTIONS_FOR_ANALYSIS = 3;
/** Rango máximo del periodo solicitado (meses calendario). */
const MAX_PERIOD_MONTHS = 12;
const TOP_CATEGORIES_LIMIT = 5;
const BUDGETS_LIMIT = 10;
const GOALS_LIMIT = 5;
const NO_CATEGORY_LABEL = 'Sin categoría';

const round2 = (n: number): number => Math.round(n * 100) / 100;
const round4 = (n: number): number => Math.round(n * 10000) / 10000;

/**
 * Construye el RESUMEN financiero autorizado de un usuario para el asistente.
 *
 * Fuente de verdad: las entidades reales del backend (`movements`, `budgets`,
 * `financial_goals`, `categories`, `profiles`). Devuelve solo agregados —
 * nunca transacciones crudas, merchants, cuentas, tarjetas ni emails. El
 * ai-service consume este resumen para armar el contexto del LLM.
 */
@Injectable()
export class FinancialContextService {
  private readonly logger = new Logger(FinancialContextService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(Budget)
    private readonly budgetRepo: Repository<Budget>,
    @InjectRepository(FinancialGoal)
    private readonly goalRepo: Repository<FinancialGoal>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
  ) {}

  async buildFinancialContext(
    dto: FinancialContextRequestDto,
  ): Promise<FinancialContextResponseDto> {
    const startedAt = Date.now();
    this.assertScopesAllowedForPlan(dto.plan, dto.allowed_scopes);
    const period = this.resolvePeriod(dto.period);

    // El user_id ya nació en este backend autenticado, pero se re-valida.
    const user = await this.userRepo.findOne({
      where: { id: dto.user_id },
      select: ['id', 'primaryCurrency'],
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const transactions = await this.transactionRepo.find({
      where: { userId: dto.user_id, date: Between(period.from, period.to) },
      select: ['amount', 'type', 'classification', 'categoryId', 'date'],
    });

    const warnings: string[] = [];
    const summary = this.buildSummary(transactions, warnings);
    const topCategories = await this.buildTopCategories(
      dto.user_id,
      transactions,
      summary.expense_total,
    );
    const budgets = await this.buildBudgets(dto.user_id, period, transactions);
    const goals = await this.buildGoals(dto.user_id);

    const hasSufficientData =
      summary.transactions_count >= MIN_TRANSACTIONS_FOR_ANALYSIS;
    if (summary.transactions_count === 0) {
      warnings.push(
        'El usuario todavía no tiene movimientos registrados en el periodo consultado.',
      );
    } else if (!hasSufficientData) {
      warnings.push(
        'El usuario todavía no tiene suficientes movimientos registrados para calcular un análisis confiable.',
      );
    }

    this.logger.log(
      `financial-context built request_id=${dto.request_id} user_id=${dto.user_id} ` +
        `period=${period.from}..${period.to} txs=${summary.transactions_count} ` +
        `sufficient=${hasSufficientData} duration_ms=${Date.now() - startedAt}`,
    );

    return {
      ok: true,
      request_id: dto.request_id,
      user_id: dto.user_id,
      period,
      currency: user.primaryCurrency || 'DOP',
      has_sufficient_data: hasSufficientData,
      summary,
      top_categories: topCategories,
      budgets,
      goals,
      warnings,
      metadata: {
        generated_at: new Date().toISOString(),
        source: 'backend_financial_summary',
        raw_transactions_included: false,
      },
    };
  }

  /** Rechaza scopes que el plan no permite (defensa en profundidad). */
  private assertScopesAllowedForPlan(
    plan: 'basic' | 'premium',
    scopes: string[],
  ): void {
    const allowed = PLAN_ALLOWED_SCOPES[plan];
    const forbidden = scopes.filter((s) => !allowed.has(s));
    if (forbidden.length > 0) {
      throw new BadRequestException(
        `plan '${plan}' is not allowed to request scope(s): ${forbidden.sort().join(', ')}`,
      );
    }
  }

  /**
   * Devuelve el periodo validado o, por defecto, el mes calendario actual.
   * Reglas: from <= to y máximo MAX_PERIOD_MONTHS meses calendario.
   */
  private resolvePeriod(
    period?: { from: string; to: string },
  ): FinancialPeriodResponse {
    if (!period) {
      const now = new Date();
      const year = now.getUTCFullYear();
      const month = now.getUTCMonth(); // 0-based
      const from = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
      const to = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      return { from, to };
    }

    const { from, to } = period;
    if (!this.isValidDate(from) || !this.isValidDate(to)) {
      throw new BadRequestException('period dates must be valid YYYY-MM-DD');
    }
    // Comparación lexicográfica válida para YYYY-MM-DD.
    if (from > to) {
      throw new BadRequestException('period.from must be <= period.to');
    }
    const months = this.calendarMonthsBetween(from, to);
    if (months > MAX_PERIOD_MONTHS) {
      throw new BadRequestException(
        `period must not exceed ${MAX_PERIOD_MONTHS} months`,
      );
    }
    return { from, to };
  }

  private isValidDate(value: string): boolean {
    const [y, m, d] = value.split('-').map(Number);
    if (!y || !m || !d) return false;
    const date = new Date(Date.UTC(y, m - 1, d));
    return (
      date.getUTCFullYear() === y &&
      date.getUTCMonth() === m - 1 &&
      date.getUTCDate() === d
    );
  }

  /** Meses calendario cubiertos por el rango, contando ambos extremos. */
  private calendarMonthsBetween(from: string, to: string): number {
    const [fy, fm] = from.split('-').map(Number);
    const [ty, tm] = to.split('-').map(Number);
    return (ty - fy) * 12 + (tm - fm) + 1;
  }

  private buildSummary(
    transactions: Transaction[],
    warnings: string[],
  ): FinancialContextResponseDto['summary'] {
    let income = 0;
    let expense = 0;
    let fixed = 0;
    let variable = 0;
    let classified = 0;

    for (const tx of transactions) {
      const amount = Number(tx.amount) || 0;
      if (tx.type === TransactionType.INCOME) income += amount;
      if (tx.type === TransactionType.EXPENSE) expense += amount;
      if (tx.classification === TransactionClassification.FIXED_EXPENSE) {
        fixed += amount;
        classified++;
      }
      if (tx.classification === TransactionClassification.VARIABLE_EXPENSE) {
        variable += amount;
        classified++;
      }
      if (
        tx.classification === TransactionClassification.REGULAR_INCOME ||
        tx.classification === TransactionClassification.EXTRA_INCOME
      ) {
        classified++;
      }
    }

    const hasExpenses = expense > 0;
    let savingsRate: number | null = null;
    if (income > 0) {
      savingsRate = round4((income - expense) / income);
    } else if (transactions.length > 0) {
      warnings.push(
        'Sin ingresos registrados en el periodo; la tasa de ahorro no es calculable.',
      );
    }

    return {
      income_total: round2(income),
      expense_total: round2(expense),
      // null solo cuando no hay forma de saberlo (sin gastos clasificados).
      fixed_expenses_total: hasExpenses || classified > 0 ? round2(fixed) : null,
      variable_expenses_total:
        hasExpenses || classified > 0 ? round2(variable) : null,
      net_cashflow: round2(income - expense),
      savings_rate: savingsRate,
      transactions_count: transactions.length,
    };
  }

  /** Top categorías de GASTO del periodo (agregado, sin detalle de comercios). */
  private async buildTopCategories(
    userId: string,
    transactions: Transaction[],
    expenseTotal: number,
  ): Promise<FinancialCategorySummaryResponse[]> {
    const byCategory = new Map<string | null, number>();
    for (const tx of transactions) {
      if (tx.type !== TransactionType.EXPENSE) continue;
      const key = tx.categoryId ?? null;
      byCategory.set(key, (byCategory.get(key) ?? 0) + (Number(tx.amount) || 0));
    }
    if (byCategory.size === 0) return [];

    const top = [...byCategory.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_CATEGORIES_LIMIT);

    const ids = top.map(([id]) => id).filter((id): id is string => id !== null);
    const names = new Map<string, string>();
    if (ids.length > 0) {
      // Solo categorías del propio usuario: nunca nombres de otros usuarios.
      const categories = await this.categoryRepo.find({
        where: { id: In(ids), userId },
        select: ['id', 'name'],
      });
      for (const c of categories) names.set(c.id, c.name);
    }

    return top.map(([id, amount]) => ({
      category: (id && names.get(id)) || NO_CATEGORY_LABEL,
      amount: round2(amount),
      percentage: expenseTotal > 0 ? round4(amount / expenseTotal) : 0,
      type: 'expense' as const,
    }));
  }

  /**
   * Presupuestos activos cuyo mes (period_month) cae dentro del periodo.
   * `spent` = gastos del usuario en la categoría del presupuesto durante SU mes
   * (o todos los gastos del mes si el presupuesto es global, sin categoría).
   */
  private async buildBudgets(
    userId: string,
    period: FinancialPeriodResponse,
    transactions: Transaction[],
  ): Promise<FinancialBudgetSummaryResponse[]> {
    const budgets = await this.budgetRepo.find({
      where: {
        userId,
        isActive: true,
        periodMonth: Between(period.from, period.to),
      },
      order: { periodMonth: 'DESC' },
      take: BUDGETS_LIMIT,
    });
    if (budgets.length === 0) return [];

    return budgets.map((budget) => {
      const monthPrefix = String(budget.periodMonth).slice(0, 7); // YYYY-MM
      let spent = 0;
      for (const tx of transactions) {
        if (tx.type !== TransactionType.EXPENSE) continue;
        if (String(tx.date).slice(0, 7) !== monthPrefix) continue;
        if (budget.categoryId && tx.categoryId !== budget.categoryId) continue;
        spent += Number(tx.amount) || 0;
      }
      const budgeted = Number(budget.limitAmount) || 0;
      const threshold = budget.alertThresholdPct ?? 80;
      let status: FinancialBudgetSummaryResponse['status'] = 'on_track';
      if (spent > budgeted) status = 'exceeded';
      else if (budgeted > 0 && (spent / budgeted) * 100 >= threshold)
        status = 'warning';

      return {
        name: budget.name,
        budgeted: round2(budgeted),
        spent: round2(spent),
        remaining: round2(budgeted - spent),
        status,
      };
    });
  }

  /** Metas ACTIVAS resumidas (fondo de emergencia primero). */
  private async buildGoals(
    userId: string,
  ): Promise<FinancialGoalSummaryResponse[]> {
    const goals = await this.goalRepo.find({
      where: { userId, status: FinancialGoalStatus.ACTIVE },
      order: { isDefault: 'DESC', createdAt: 'ASC' },
      take: GOALS_LIMIT,
    });

    return goals.map((goal) => {
      const target = Number(goal.targetAmount) || 0;
      const current = Number(goal.currentAmount) || 0;
      return {
        name: goal.name,
        target_amount: round2(target),
        current_amount: round2(current),
        progress_percentage:
          target > 0 ? Math.round((current / target) * 100) : 0,
      };
    });
  }
}
