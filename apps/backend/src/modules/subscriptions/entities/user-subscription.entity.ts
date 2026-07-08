import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum UserSubscriptionStatus {
  ACTIVE = 'active',
  TRIALING = 'trialing',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  EXPIRED = 'expired',
}

/**
 * Suscripción de un usuario a un plan. FUENTE DE VERDAD del plan del usuario.
 * El plan efectivo se resuelve en UserPlanService: solo cuenta como premium si
 * hay una suscripción en estado active/trialing, vigente (current_period_end en
 * el futuro o nulo) y con plan_code = 'premium'. En cualquier otro caso el
 * fallback seguro es 'basic'.
 */
@Entity('user_subscriptions')
@Index(['userId'])
@Index(['userId', 'status'])
@Index(['planCode'])
export class UserSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  /** FK lógica a subscription_plans.code ('basic' | 'premium'). */
  @Column({ name: 'plan_code', type: 'text' })
  planCode: string;

  @Column({ type: 'text' })
  status: UserSubscriptionStatus;

  @Column({ name: 'started_at', type: 'timestamptz' })
  startedAt: Date;

  @Column({ name: 'current_period_start', type: 'timestamptz', nullable: true })
  currentPeriodStart: Date | null;

  @Column({ name: 'current_period_end', type: 'timestamptz', nullable: true })
  currentPeriodEnd: Date | null;

  @Column({ name: 'canceled_at', type: 'timestamptz', nullable: true })
  canceledAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
