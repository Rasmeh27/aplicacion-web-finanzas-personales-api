import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, LessThanOrEqual, Repository } from 'typeorm';
import { EmailService } from '../../integrations/email/email.service';
import { Transaction, TransactionType } from '../movements/entities/transaction.entity';
import { Budget } from '../planning/entities/budget.entity';
import { Debt, DebtStatus } from '../planning/entities/debt.entity';
import { FinancialGoal, FinancialGoalStatus } from '../planning/entities/financial-goal.entity';

export type PremiumAlert = {
  type: 'budget' | 'debt' | 'goal' | 'movement';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
};

@Injectable()
export class AssistantAlertsService {
  constructor(
    @InjectRepository(Budget)
    private readonly budgetRepo: Repository<Budget>,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(Debt)
    private readonly debtRepo: Repository<Debt>,
    @InjectRepository(FinancialGoal)
    private readonly goalRepo: Repository<FinancialGoal>,
    private readonly dataSource: DataSource,
    private readonly emailService: EmailService,
  ) {}

  async runPremiumAlerts(userId: string, email: string): Promise<{ alerts: PremiumAlert[]; emailSent: boolean }> {
    await this.ensureNotificationTable();

    const alerts = [
      ...(await this.budgetAlerts(userId)),
      ...(await this.debtAlerts(userId)),
      ...(await this.goalAlerts(userId)),
      ...(await this.unusualMovementAlerts(userId)),
    ];

    for (const alert of alerts) {
      await this.saveNotification(userId, alert);
    }

    let emailSent = false;
    if (alerts.length > 0 && this.emailService.isPremiumAlertEmailConfigured()) {
      await this.emailService.sendPremiumAlertEmail({
        to: email,
        subject: 'Alertas premium de MONI',
        summary: `Encontramos ${alerts.length} alerta(s) financiera(s) que requieren tu atencion.`,
        alerts: alerts.map((alert) => `${alert.title}: ${alert.message}`),
      });
      emailSent = true;
    }

    return { alerts, emailSent };
  }

  private async budgetAlerts(userId: string): Promise<PremiumAlert[]> {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() + 1;
    const periodMonth = `${year}-${String(month).padStart(2, '0')}-01`;
    const startDate = periodMonth;
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(new Date(Date.UTC(year, month, 0)).getUTCDate()).padStart(2, '0')}`;

    const budgets = await this.budgetRepo.find({ where: { userId, isActive: true, periodMonth }, relations: ['category'] });
    const expenses = await this.transactionRepo.find({
      where: { userId, type: TransactionType.EXPENSE, date: Between(startDate, endDate) },
    });

    return budgets.flatMap((budget): PremiumAlert[] => {
      const spent = expenses
        .filter((expense) => expense.categoryId === budget.categoryId)
        .reduce((sum, expense) => sum + Number(expense.amount), 0);
      const limit = Number(budget.limitAmount);
      const usagePct = limit > 0 ? (spent / limit) * 100 : 0;
      const category = budget.category?.name ?? budget.name;

      if (usagePct >= 100) {
        return [{
          type: 'budget' as const,
          severity: 'critical' as const,
          title: `Presupuesto excedido: ${category}`,
          message: `Has usado ${usagePct.toFixed(1)}% del presupuesto de ${category}.`,
        }];
      }

      if (usagePct >= Number(budget.alertThresholdPct ?? 80)) {
        return [{
          type: 'budget' as const,
          severity: 'warning' as const,
          title: `Presupuesto cerca del limite: ${category}`,
          message: `Has usado ${usagePct.toFixed(1)}% del presupuesto de ${category}.`,
        }];
      }

      return [];
    });
  }

  private async debtAlerts(userId: string): Promise<PremiumAlert[]> {
    const now = new Date();
    const day = now.getUTCDate();
    const nextWeek = day + 7;
    const debts = await this.debtRepo.find({
      where: { userId, status: DebtStatus.ACTIVE, dueDay: LessThanOrEqual(nextWeek) },
    });

    return debts
      .filter((debt) => debt.dueDay && debt.dueDay >= day)
      .map((debt) => ({
        type: 'debt',
        severity: 'warning',
        title: `Pago proximo: ${debt.name}`,
        message: `Tu pago minimo de ${debt.currency} ${Number(debt.minimumPayment).toLocaleString('es-DO')} vence el dia ${debt.dueDay}.`,
      }));
  }

  private async goalAlerts(userId: string): Promise<PremiumAlert[]> {
    const today = new Date();
    const in30Days = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 30));
    const goals = await this.goalRepo.find({
      where: {
        userId,
        status: FinancialGoalStatus.ACTIVE,
        targetDate: LessThanOrEqual(in30Days.toISOString().slice(0, 10)),
      },
    });

    return goals
      .filter((goal) => Number(goal.currentAmount) < Number(goal.targetAmount))
      .map((goal) => ({
        type: 'goal',
        severity: 'info',
        title: `Meta cerca de vencer: ${goal.name}`,
        message: `La meta vence el ${goal.targetDate} y va en ${goal.currency} ${Number(goal.currentAmount).toLocaleString('es-DO')} de ${Number(goal.targetAmount).toLocaleString('es-DO')}.`,
      }));
  }

  private async unusualMovementAlerts(userId: string): Promise<PremiumAlert[]> {
    const now = new Date();
    const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
    const endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
    const expenses = await this.transactionRepo.find({
      where: { userId, type: TransactionType.EXPENSE, date: Between(startDate, endDate) },
      order: { date: 'DESC' },
    });

    if (expenses.length < 3) return [];

    const average = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0) / expenses.length;
    return expenses
      .filter((expense) => Number(expense.amount) >= average * 2)
      .slice(0, 3)
      .map((expense) => ({
        type: 'movement',
        severity: 'warning',
        title: 'Movimiento inusual detectado',
        message: `${expense.description ?? 'Gasto'} por ${expense.currency} ${Number(expense.amount).toLocaleString('es-DO')} supera el doble del promedio mensual.`,
      }));
  }

  private async saveNotification(userId: string, alert: PremiumAlert): Promise<void> {
    await this.dataSource.query(
      `
        insert into public.notifications (id, user_id, type, title, message, created_at)
        values (gen_random_uuid(), $1, $2, $3, $4, now())
      `,
      [userId, `premium.${alert.type}.${alert.severity}`, alert.title, alert.message],
    );
  }

  private async ensureNotificationTable(): Promise<void> {
    await this.dataSource.query(`
      create table if not exists public.notifications (
        id uuid primary key default gen_random_uuid(),
        user_id uuid not null,
        type text not null,
        title text not null,
        message text not null,
        read_at timestamptz null,
        created_at timestamptz not null default now()
      )
    `);
  }
}
