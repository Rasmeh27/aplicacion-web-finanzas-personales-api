import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  FinancialGoal,
  FinancialGoalStatus,
} from '../../planning/entities/financial-goal.entity';

export interface FinancialGoalSummaryItem {
  goalId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  remainingAmount: number;
  progressPercentage: number;
  status: FinancialGoalStatus;
  targetDate: string | null;
}

export interface FinancialGoalsSummaryResponse {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  pausedGoals: number;
  cancelledGoals: number;
  totalTargetAmount: number;
  totalCurrentAmount: number;
  overallProgressPercentage: number;
  currency: string;
  goals: FinancialGoalSummaryItem[];
}

@Injectable()
export class ViewFinancialGoalsSummaryUseCase {
  constructor(
    @InjectRepository(FinancialGoal)
    private readonly goalRepo: Repository<FinancialGoal>,
  ) {}

  async execute(userId: string): Promise<FinancialGoalsSummaryResponse> {
    const goals = await this.goalRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    const totalTargetAmount = this.sumAmounts(
      goals.map((goal) => goal.targetAmount),
    );
    const totalCurrentAmount = this.sumAmounts(
      goals.map((goal) => goal.currentAmount),
    );

    return {
      totalGoals: goals.length,
      activeGoals: this.countByStatus(goals, FinancialGoalStatus.ACTIVE),
      completedGoals: this.countByStatus(goals, FinancialGoalStatus.COMPLETED),
      pausedGoals: this.countByStatus(goals, FinancialGoalStatus.PAUSED),
      cancelledGoals: this.countByStatus(goals, FinancialGoalStatus.CANCELLED),
      totalTargetAmount,
      totalCurrentAmount,
      overallProgressPercentage: this.calculatePercentage(
        totalCurrentAmount,
        totalTargetAmount,
      ),
      currency: 'DOP',
      goals: goals.map((goal) => this.toSummaryItem(goal)),
    };
  }

  private toSummaryItem(goal: FinancialGoal): FinancialGoalSummaryItem {
    const targetAmount = Number(goal.targetAmount);
    const currentAmount = Number(goal.currentAmount);

    return {
      goalId: goal.id,
      name: goal.name,
      targetAmount: this.roundMoney(targetAmount),
      currentAmount: this.roundMoney(currentAmount),
      remainingAmount: this.roundMoney(Math.max(targetAmount - currentAmount, 0)),
      progressPercentage: this.calculatePercentage(currentAmount, targetAmount),
      status: goal.status,
      targetDate: goal.targetDate ?? null,
    };
  }

  private countByStatus(
    goals: FinancialGoal[],
    status: FinancialGoalStatus,
  ): number {
    return goals.filter((goal) => goal.status === status).length;
  }

  private calculatePercentage(currentAmount: number, targetAmount: number): number {
    if (targetAmount <= 0) return 0;
    return Math.round((currentAmount / targetAmount) * 10000) / 100;
  }

  private sumAmounts(amounts: number[]): number {
    return this.roundMoney(
      amounts.reduce((total, amount) => total + Number(amount), 0),
    );
  }

  private roundMoney(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
