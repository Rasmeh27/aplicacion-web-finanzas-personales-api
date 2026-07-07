import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Budget } from '../entities/budget.entity';
import { Category, CategoryType } from '../entities/category.entity';
import {
  Transaction,
  TransactionType,
} from '../../movements/entities/transaction.entity';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { ListBudgetsQueryDto } from './dto/list-budgets-query.dto';

export type BudgetStatus = 'safe' | 'warning' | 'exceeded';

export interface BudgetCategoryView {
  id: string;
  name: string;
  classification: string | null;
  icon: string | null;
  color: string | null;
}

export interface BudgetView {
  id: string;
  name: string;
  category: BudgetCategoryView | null;
  categoryId: string | null;
  month: number;
  year: number;
  amountLimit: number;
  spentAmount: number;
  remainingAmount: number;
  usagePct: number;
  status: BudgetStatus;
  currency: string;
  alertThresholdPct: number;
  isActive: boolean;
}

export interface BudgetListResult {
  items: BudgetView[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface BudgetsSummary {
  month: number;
  year: number;
  totalBudgeted: number;
  totalSpent: number;
  totalRemaining: number;
  overallUsagePct: number;
  activeBudgetsCount: number;
  exceededBudgetsCount: number;
  warningBudgetsCount: number;
  safeBudgetsCount: number;
  categoriesWithoutBudget: number;
}

interface BudgetUsage {
  spentAmount: number;
  remainingAmount: number;
  usagePct: number;
  status: BudgetStatus;
}

@Injectable()
export class BudgetsService {
  constructor(
    @InjectRepository(Budget)
    private readonly budgetRepo: Repository<Budget>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
  ) {}

  async create(userId: string, dto: CreateBudgetDto): Promise<BudgetView[]> {
    const category = await this.validateExpenseCategory(userId, dto.categoryId);
    const periods = this.buildRecurringPeriods(dto.month, dto.year, dto.repeatMonths ?? 1);
    await this.ensureNoDuplicateBudgets(userId, dto.categoryId, periods);

    const budgets = periods.map(({ month, year }) =>
      this.budgetRepo.create({
      userId,
      categoryId: dto.categoryId,
        name: this.buildName(category?.name, year, month),
        periodMonth: this.buildPeriodMonth(year, month),
      periodType: 'monthly',
        month,
        year,
      limitAmount: dto.amountLimit,
      currency: (dto.currency ?? 'DOP').toUpperCase(),
      alertThresholdPct: dto.alertThresholdPct ?? 80,
      isActive: dto.isActive ?? true,
      }),
    );

    const saved = await this.budgetRepo.save(budgets);
    const savedIds = saved.map((budget) => budget.id);
    const reloaded = await this.budgetRepo.find({
      where: savedIds.map((id) => ({ id, userId })),
      relations: ['category'],
      order: { periodMonth: 'ASC' },
    });
    return reloaded.map((budget) => this.toView(budget));
  }

  async findAll(userId: string, filters: ListBudgetsQueryDto = {}): Promise<BudgetListResult> {
    const limit = filters.limit ?? 50;
    const offset = filters.offset ?? 0;

    const where: Record<string, unknown> = { userId };
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.isActive !== undefined) where.isActive = filters.isActive;
    if (filters.month && filters.year) {
      where.periodMonth = this.buildPeriodMonth(filters.year, filters.month);
    }

    const [budgets, total] = await this.budgetRepo.findAndCount({
      where,
      relations: ['category'],
      order: { periodMonth: 'DESC', createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    const spentByPeriod = await this.computeSpentForBudgets(userId, budgets);
    const items = budgets.map((budget) => this.toView(budget, spentByPeriod));

    return { items, total, limit, offset, hasMore: offset + budgets.length < total };
  }

  async findOne(userId: string, id: string): Promise<BudgetView> {
    const budget = await this.reloadWithCategory(id, userId);
    return this.toView(budget);
  }

  async update(userId: string, id: string, dto: UpdateBudgetDto): Promise<BudgetView> {
    const budget = await this.findOneOrFail(userId, id);

    if (dto.amountLimit !== undefined) budget.limitAmount = dto.amountLimit;
    if (dto.alertThresholdPct !== undefined) budget.alertThresholdPct = dto.alertThresholdPct;
    if (dto.currency !== undefined) budget.currency = dto.currency.toUpperCase();
    if (dto.isActive !== undefined) budget.isActive = dto.isActive;

    await this.budgetRepo.save(budget);
    return this.toView(await this.reloadWithCategory(id, userId));
  }

  /**
   * Soft delete: marca el presupuesto como inactivo (no destruye datos ni las
   * transacciones asociadas). El índice único es activo-aware, así que se puede
   * volver a crear un presupuesto para esa categoría/periodo.
   */
  async remove(userId: string, id: string): Promise<{ id: string; isActive: boolean }> {
    const budget = await this.findOneOrFail(userId, id);
    budget.isActive = false;
    await this.budgetRepo.save(budget);
    return { id: budget.id, isActive: false };
  }

  async getSummary(userId: string, month?: number, year?: number): Promise<BudgetsSummary> {
    const now = new Date();
    // Decisión: si no se envían month/year se usa el mes/año actual del servidor.
    const resolvedMonth = this.isValidMonth(month) ? (month as number) : now.getMonth() + 1;
    const resolvedYear = this.isValidYear(year) ? (year as number) : now.getFullYear();

    const budgets = await this.budgetRepo.find({
      where: {
        userId,
        isActive: true,
        periodMonth: this.buildPeriodMonth(resolvedYear, resolvedMonth),
      },
      relations: ['category'],
    });

    const spentByCategory = await this.computeSpentByCategory(userId, resolvedYear, resolvedMonth);

    let totalBudgeted = 0;
    let totalSpent = 0;
    let exceeded = 0;
    let warning = 0;
    let safe = 0;

    for (const budget of budgets) {
      const spent = budget.categoryId ? spentByCategory.get(budget.categoryId) ?? 0 : 0;
      const usage = this.calculateBudgetUsage(budget, spent);
      totalBudgeted += Number(budget.limitAmount);
      totalSpent += usage.spentAmount;
      if (usage.status === 'exceeded') exceeded += 1;
      else if (usage.status === 'warning') warning += 1;
      else safe += 1;
    }

    totalBudgeted = this.round2(totalBudgeted);
    totalSpent = this.round2(totalSpent);
    const totalRemaining = this.round2(totalBudgeted - totalSpent);
    const overallUsagePct = totalBudgeted > 0 ? this.round2((totalSpent / totalBudgeted) * 100) : 0;

    return {
      month: resolvedMonth,
      year: resolvedYear,
      totalBudgeted,
      totalSpent,
      totalRemaining,
      overallUsagePct,
      activeBudgetsCount: budgets.length,
      exceededBudgetsCount: exceeded,
      warningBudgetsCount: warning,
      safeBudgetsCount: safe,
      categoriesWithoutBudget: await this.countExpenseCategoriesWithoutBudget(userId, budgets),
    };
  }

  // --- Validaciones de negocio ---------------------------------------------

  async validateExpenseCategory(userId: string, categoryId: string): Promise<Category> {
    const category = await this.categoryRepo.findOne({ where: { id: categoryId, userId } });
    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }
    if (category.type !== CategoryType.EXPENSE) {
      throw new BadRequestException('Solo se puede presupuestar categorías de gasto');
    }
    return category;
  }

  async ensureNoDuplicateBudget(
    userId: string,
    categoryId: string,
    month: number,
    year: number,
  ): Promise<void> {
    await this.ensureNoDuplicateBudgets(userId, categoryId, [{ month, year }]);
  }

  async ensureNoDuplicateBudgets(
    userId: string,
    categoryId: string,
    periods: Array<{ month: number; year: number }>,
  ): Promise<void> {
    const existing = await this.budgetRepo.find({
      where: {
        userId,
        categoryId,
        periodMonth: Between(
          this.buildPeriodMonth(periods[0].year, periods[0].month),
          this.buildPeriodMonth(periods[periods.length - 1].year, periods[periods.length - 1].month),
        ),
        isActive: true,
      },
    });

    const requestedPeriods = new Set(
      periods.map(({ month, year }) => this.buildPeriodMonth(year, month)),
    );
    const duplicatePeriods = existing
      .filter((budget) => requestedPeriods.has(budget.periodMonth))
      .map((budget) => {
        const { month, year } = this.effectivePeriod(budget);
        return `${String(month).padStart(2, '0')}/${year}`;
      });

    if (duplicatePeriods.length > 0) {
      throw new BadRequestException(
        `Ya existe un presupuesto activo para esa categoría en: ${duplicatePeriods.join(', ')}`,
      );
    }
  }

  // --- Cálculo de uso -------------------------------------------------------

  calculateBudgetUsage(budget: Budget, spentAmount: number): BudgetUsage {
    const limit = Number(budget.limitAmount);
    const spent = this.round2(spentAmount);
    const remainingAmount = this.round2(limit - spent);
    const usagePct = limit > 0 ? this.round2((spent / limit) * 100) : 0;
    const threshold = Number(budget.alertThresholdPct ?? 80);

    let status: BudgetStatus = 'safe';
    if (usagePct >= 100) status = 'exceeded';
    else if (usagePct >= threshold) status = 'warning';

    return { spentAmount: spent, remainingAmount, usagePct, status };
  }

  // --- Helpers privados -----------------------------------------------------

  private async findOneOrFail(userId: string, id: string): Promise<Budget> {
    const budget = await this.budgetRepo.findOne({ where: { id, userId } });
    if (!budget) {
      throw new NotFoundException('Presupuesto no encontrado');
    }
    return budget;
  }

  private async reloadWithCategory(id: string, userId: string): Promise<Budget> {
    const budget = await this.budgetRepo.findOne({
      where: { id, userId },
      relations: ['category'],
    });
    if (!budget) {
      throw new NotFoundException('Presupuesto no encontrado');
    }
    return budget;
  }

  private toView(budget: Budget, spentByPeriod?: Map<string, Map<string, number>>): BudgetView {
    const { month, year } = this.effectivePeriod(budget);
    const spent = this.resolveSpent(budget, month, year, spentByPeriod);
    const usage = this.calculateBudgetUsage(budget, spent);

    return {
      id: budget.id,
      name: budget.name,
      categoryId: budget.categoryId ?? null,
      category: budget.category
        ? {
            id: budget.category.id,
            name: budget.category.name,
            classification: budget.category.classification ?? null,
            icon: budget.category.icon ?? null,
            color: budget.category.color ?? null,
          }
        : null,
      month,
      year,
      amountLimit: this.round2(Number(budget.limitAmount)),
      spentAmount: usage.spentAmount,
      remainingAmount: usage.remainingAmount,
      usagePct: usage.usagePct,
      status: usage.status,
      currency: budget.currency,
      alertThresholdPct: Number(budget.alertThresholdPct ?? 80),
      isActive: budget.isActive ?? true,
    };
  }

  private resolveSpent(
    budget: Budget,
    month: number,
    year: number,
    spentByPeriod?: Map<string, Map<string, number>>,
  ): number {
    if (!budget.categoryId) return 0;
    const map = spentByPeriod?.get(this.periodKey(year, month));
    return map?.get(budget.categoryId) ?? 0;
  }

  /** Calcula el gasto por categoría para todos los periodos presentes en la lista (evita N+1). */
  private async computeSpentForBudgets(
    userId: string,
    budgets: Budget[],
  ): Promise<Map<string, Map<string, number>>> {
    const periods = new Map<string, { year: number; month: number }>();
    for (const budget of budgets) {
      const { month, year } = this.effectivePeriod(budget);
      periods.set(this.periodKey(year, month), { year, month });
    }

    const result = new Map<string, Map<string, number>>();
    for (const [key, { year, month }] of periods) {
      result.set(key, await this.computeSpentByCategory(userId, year, month));
    }
    return result;
  }

  /** Suma de gastos reales (type=expense) por categoría en el mes/año dado. */
  private async computeSpentByCategory(
    userId: string,
    year: number,
    month: number,
  ): Promise<Map<string, number>> {
    const { startDate, endDate } = this.monthRange(year, month);
    const expenses = await this.transactionRepo.find({
      where: {
        userId,
        type: TransactionType.EXPENSE,
        date: Between(startDate, endDate),
      },
    });

    return expenses.reduce((acc, expense) => {
      if (!expense.categoryId) return acc;
      const current = acc.get(expense.categoryId) ?? 0;
      acc.set(expense.categoryId, this.round2(current + Number(expense.amount)));
      return acc;
    }, new Map<string, number>());
  }

  private async countExpenseCategoriesWithoutBudget(
    userId: string,
    activeBudgets: Budget[],
  ): Promise<number> {
    const expenseCategories = await this.categoryRepo.count({
      where: { userId, type: CategoryType.EXPENSE },
    });
    const budgetedCategoryIds = new Set(
      activeBudgets.map((budget) => budget.categoryId).filter((id): id is string => Boolean(id)),
    );
    return Math.max(expenseCategories - budgetedCategoryIds.size, 0);
  }

  private effectivePeriod(budget: Budget): { month: number; year: number } {
    if (this.isValidMonth(budget.month) && this.isValidYear(budget.year)) {
      return { month: Number(budget.month), year: Number(budget.year) };
    }
    // Fallback: derivar de period_month (YYYY-MM-01) para filas legacy.
    const [year, month] = (budget.periodMonth ?? '').split('-');
    return { month: Number(month) || 1, year: Number(year) || new Date().getFullYear() };
  }

  private periodKey(year: number, month: number): string {
    return `${year}-${String(month).padStart(2, '0')}`;
  }

  private buildPeriodMonth(year: number, month: number): string {
    return `${year}-${String(month).padStart(2, '0')}-01`;
  }

  private buildRecurringPeriods(
    startMonth: number,
    startYear: number,
    repeatMonths: number,
  ): Array<{ month: number; year: number }> {
    const periods = Array.from({ length: repeatMonths }, (_, index) => {
      const zeroBasedMonth = startMonth - 1 + index;
      const year = startYear + Math.floor(zeroBasedMonth / 12);
      const month = (zeroBasedMonth % 12) + 1;
      return { month, year };
    });

    if (periods.some(({ year }) => !this.isValidYear(year))) {
      throw new BadRequestException('La recurrencia excede el rango de años permitido.');
    }

    return periods;
  }

  private monthRange(year: number, month: number): { startDate: string; endDate: string } {
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return {
      startDate: this.buildPeriodMonth(year, month),
      endDate: `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
    };
  }

  private buildName(categoryName: string | undefined, year: number, month: number): string {
    const label = categoryName?.trim() || 'Presupuesto';
    return `Presupuesto ${label} ${String(month).padStart(2, '0')}/${year}`;
  }

  private isValidMonth(month?: number | null): boolean {
    return Number.isInteger(Number(month)) && Number(month) >= 1 && Number(month) <= 12;
  }

  private isValidYear(year?: number | null): boolean {
    return Number.isInteger(Number(year)) && Number(year) >= 2000 && Number(year) <= 2100;
  }

  private round2(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
