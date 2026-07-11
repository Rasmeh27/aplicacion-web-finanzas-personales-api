import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CreateFinancialGoalDto } from './dto/create-financial-goal.dto';
import { UpdateFinancialGoalDto } from './dto/update-financial-goal.dto';
import { CreateGoalContributionDto } from './dto/create-goal-contribution.dto';
import { ConfigureEmergencyFundDto } from './dto/configure-emergency-fund.dto';
import {
  FinancialGoal,
  FinancialGoalStatus,
} from './entities/financial-goal.entity';
import { GoalContribution } from './entities/goal-contribution.entity';
import { User } from '../user/entities/user.entity';
import { CreateFinancialGoalUseCase } from './use-cases/cu-015-create-financial-goal.use-case';

export const EMERGENCY_FUND_NAME = 'Fondo de emergencia';
export const EMERGENCY_FUND_MONTHS = 3;

export type EmergencyFundStatus = 'active' | 'suggested' | 'unavailable';

export interface EmergencyFundInfo {
  status: EmergencyFundStatus;
  goalId: string | null;
  targetAmount: number | null;
  currentAmount: number | null;
  progressPct: number | null;
  /** Monto sugerido (3 meses de gastos) cuando aún no está configurado. */
  suggestedTargetAmount: number | null;
  monthsCovered: number;
}

export interface GoalsSummary {
  totalSaved: number;
  totalTarget: number;
  overallProgressPct: number;
  activeGoalsCount: number;
  completedGoalsCount: number;
  emergencyFund: EmergencyFundInfo;
}

@Injectable()
export class FinancialGoalService {
  constructor(
    @InjectRepository(FinancialGoal)
    private readonly goalRepo: Repository<FinancialGoal>,
    @InjectRepository(GoalContribution)
    private readonly contributionRepo: Repository<GoalContribution>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly createFinancialGoalUseCase: CreateFinancialGoalUseCase,
  ) {}

  create(userId: string, dto: CreateFinancialGoalDto): Promise<FinancialGoal> {
    return this.createFinancialGoalUseCase.execute(userId, dto);
  }

  async list(userId: string): Promise<FinancialGoal[]> {
    await this.ensureEmergencyFundGoal(userId);

    return this.goalRepo.find({
      where: { userId },
      // Fondo de emergencia (predeterminada) primero, luego por fecha de creación.
      order: { isDefault: 'DESC', createdAt: 'ASC' },
    });
  }

  async findOne(userId: string, id: string): Promise<FinancialGoal> {
    const goal = await this.goalRepo.findOne({ where: { id, userId } });
    if (!goal) throw new NotFoundException('Meta financiera no encontrada');
    return goal;
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateFinancialGoalDto,
  ): Promise<FinancialGoal> {
    const goal = await this.findOne(userId, id);

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (name.length < 3) {
        throw new BadRequestException('El nombre de la meta debe tener al menos 3 caracteres');
      }
      goal.name = name;
    }
    if (dto.targetAmount !== undefined) goal.targetAmount = dto.targetAmount;
    if (dto.currentAmount !== undefined) {
      if (dto.currentAmount < 0) {
        throw new BadRequestException('El monto actual no puede ser negativo');
      }
      goal.currentAmount = dto.currentAmount;
    }
    if (dto.currency !== undefined) goal.currency = dto.currency.toUpperCase();
    if (dto.targetDate !== undefined) goal.targetDate = dto.targetDate;
    if (dto.status !== undefined) goal.status = dto.status;

    if (Number(goal.currentAmount) > Number(goal.targetAmount)) {
      throw new BadRequestException(
        'El monto actual no puede ser mayor que el monto objetivo',
      );
    }

    // Re-evalúa completado si no fue forzado explícitamente a otro estado.
    if (dto.status === undefined) {
      goal.status =
        Number(goal.currentAmount) >= Number(goal.targetAmount)
          ? FinancialGoalStatus.COMPLETED
          : FinancialGoalStatus.ACTIVE;
    }

    return this.goalRepo.save(goal);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOne(userId, id);
    await this.goalRepo.softDelete({ id, userId });
  }

  /**
   * Aporta dinero a una meta dentro de una transacción de base de datos:
   * crea el GoalContribution, incrementa currentAmount y marca completed si
   * alcanza el objetivo. Nunca registra el aporte como inversión.
   */
  async addContribution(
    userId: string,
    goalId: string,
    dto: CreateGoalContributionDto,
  ): Promise<{ goal: FinancialGoal; contribution: GoalContribution }> {
    return this.dataSource.transaction(async (manager) => {
      const goalRepo = manager.getRepository(FinancialGoal);
      const contributionRepo = manager.getRepository(GoalContribution);

      const goal = await goalRepo.findOne({
        where: { id: goalId, userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!goal) throw new NotFoundException('Meta financiera no encontrada');
      if (goal.status === FinancialGoalStatus.CANCELLED) {
        throw new BadRequestException('No se puede aportar a una meta cancelada');
      }

      const contribution = contributionRepo.create({
        userId,
        goalId,
        amount: dto.amount,
        currency: (dto.currency ?? goal.currency ?? 'DOP').toUpperCase(),
        contributionDate: dto.contributionDate ?? this.buildTodayDateString(),
        note: dto.note?.trim() || null,
      });
      const savedContribution = await contributionRepo.save(contribution);

      const newAmount = this.round2(Number(goal.currentAmount) + Number(dto.amount));
      goal.currentAmount = newAmount;
      if (newAmount >= Number(goal.targetAmount)) {
        goal.status = FinancialGoalStatus.COMPLETED;
      } else if (goal.status === FinancialGoalStatus.COMPLETED) {
        // Si por alguna razón estaba completada y baja el objetivo, se reactiva.
        goal.status = FinancialGoalStatus.ACTIVE;
      }
      const savedGoal = await goalRepo.save(goal);

      return { goal: savedGoal, contribution: savedContribution };
    });
  }

  async listContributions(userId: string, goalId: string): Promise<GoalContribution[]> {
    await this.findOne(userId, goalId);
    return this.contributionRepo.find({
      where: { userId, goalId },
      order: { contributionDate: 'DESC', createdAt: 'DESC' },
    });
  }

  async summary(userId: string): Promise<GoalsSummary> {
    await this.ensureEmergencyFundGoal(userId);

    const goals = await this.goalRepo.find({ where: { userId } });
    const active = goals.filter((g) => g.status === FinancialGoalStatus.ACTIVE);
    const completed = goals.filter((g) => g.status === FinancialGoalStatus.COMPLETED);

    // Para el progreso global se ignoran las metas canceladas.
    const relevant = goals.filter((g) => g.status !== FinancialGoalStatus.CANCELLED);
    const totalSaved = this.round2(
      relevant.reduce((acc, g) => acc + Number(g.currentAmount), 0),
    );
    const totalTarget = this.round2(
      relevant.reduce((acc, g) => acc + Number(g.targetAmount), 0),
    );
    const overallProgressPct =
      totalTarget > 0 ? this.round2(Math.min((totalSaved / totalTarget) * 100, 100)) : 0;

    return {
      totalSaved,
      totalTarget,
      overallProgressPct,
      activeGoalsCount: active.length,
      completedGoalsCount: completed.length,
      emergencyFund: await this.getEmergencyFundInfo(userId, goals),
    };
  }

  /**
   * Configura/crea explícitamente el Fondo de emergencia (CTA "Configurar fondo").
   * Idempotente: si ya existe lo devuelve.
   */
  async configureEmergencyFund(
    userId: string,
    dto: ConfigureEmergencyFundDto = {},
  ): Promise<FinancialGoal> {
    const existing = await this.findDefaultGoal(userId);
    if (existing) return existing;

    const suggested = await this.calculateSuggestedEmergencyFund(userId);
    const targetAmount = dto.targetAmount ?? suggested;
    if (!targetAmount || targetAmount <= 0) {
      throw new BadRequestException(
        'Indica un monto objetivo para el fondo de emergencia (no hay datos suficientes para sugerirlo).',
      );
    }

    const currentAmount = dto.currentAmount ?? 0;
    if (currentAmount < 0 || currentAmount > targetAmount) {
      throw new BadRequestException('El monto actual del fondo de emergencia no es válido');
    }

    const goal = this.goalRepo.create({
      userId,
      name: EMERGENCY_FUND_NAME,
      targetAmount,
      currentAmount,
      currency: (dto.currency ?? 'DOP').toUpperCase(),
      targetDate: dto.targetDate ?? null,
      isDefault: true,
      status:
        currentAmount >= targetAmount
          ? FinancialGoalStatus.COMPLETED
          : FinancialGoalStatus.ACTIVE,
    });
    return this.goalRepo.save(goal);
  }

  /**
   * Persiste automáticamente el Fondo de emergencia (Opción A) solo cuando el
   * usuario aún no tiene ninguna meta y existe un monto razonable que calcular
   * (3 meses de gastos del onboarding). Si no hay datos no inventa un monto.
   */
  async ensureEmergencyFundGoal(userId: string): Promise<FinancialGoal | null> {
    const existing = await this.findDefaultGoal(userId);
    if (existing) return existing;

    const totalGoals = await this.goalRepo.count({ where: { userId } });
    if (totalGoals > 0) return null;

    const suggested = await this.calculateSuggestedEmergencyFund(userId);
    if (!suggested || suggested <= 0) return null;

    const goal = this.goalRepo.create({
      userId,
      name: EMERGENCY_FUND_NAME,
      targetAmount: suggested,
      currentAmount: 0,
      currency: 'DOP',
      targetDate: null,
      isDefault: true,
      status: FinancialGoalStatus.ACTIVE,
    });
    return this.goalRepo.save(goal);
  }

  private async getEmergencyFundInfo(
    userId: string,
    goals: FinancialGoal[],
  ): Promise<EmergencyFundInfo> {
    const goal = goals.find((g) => g.isDefault) ?? null;

    if (goal) {
      const target = Number(goal.targetAmount);
      const current = Number(goal.currentAmount);
      return {
        status: 'active',
        goalId: goal.id,
        targetAmount: this.round2(target),
        currentAmount: this.round2(current),
        progressPct: target > 0 ? this.round2(Math.min((current / target) * 100, 100)) : 0,
        suggestedTargetAmount: null,
        monthsCovered: EMERGENCY_FUND_MONTHS,
      };
    }

    const suggested = await this.calculateSuggestedEmergencyFund(userId);
    return {
      status: suggested && suggested > 0 ? 'suggested' : 'unavailable',
      goalId: null,
      targetAmount: null,
      currentAmount: null,
      progressPct: null,
      suggestedTargetAmount: suggested && suggested > 0 ? this.round2(suggested) : null,
      monthsCovered: EMERGENCY_FUND_MONTHS,
    };
  }

  private findDefaultGoal(userId: string): Promise<FinancialGoal | null> {
    return this.goalRepo.findOne({ where: { userId, isDefault: true } });
  }

  /** 3 meses de gastos estimados (fijos + variables) del perfil/onboarding. */
  private async calculateSuggestedEmergencyFund(userId: string): Promise<number | null> {
    const profile = await this.userRepo.findOne({ where: { id: userId } });
    if (!profile) return null;

    const monthlyExpenses =
      Number(profile.monthlyFixedExpenseEstimate ?? 0) +
      Number(profile.monthlyVariableExpenseEstimate ?? 0);

    if (!Number.isFinite(monthlyExpenses) || monthlyExpenses <= 0) return null;
    return this.round2(monthlyExpenses * EMERGENCY_FUND_MONTHS);
  }

  private buildTodayDateString(): string {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
      today.getDate(),
    ).padStart(2, '0')}`;
  }

  private round2(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
