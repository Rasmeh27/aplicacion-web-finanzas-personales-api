import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { FinancialGoal } from './financial-goal.entity';

/**
 * Aporte de dinero a una meta financiera. Da trazabilidad de cómo crece el
 * currentAmount de la meta. No representa una inversión ni un movimiento de
 * caja (todavía no existe un módulo de cuentas/saldos en el proyecto).
 */
@Entity('goal_contributions')
@Index(['userId'])
@Index(['goalId'])
@Index(['userId', 'goalId', 'contributionDate'])
export class GoalContribution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'goal_id' })
  goalId: string;

  @ManyToOne(() => FinancialGoal, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'goal_id' })
  goal?: FinancialGoal;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ default: 'DOP' })
  currency: string;

  @Column({ name: 'contribution_date', type: 'date' })
  contributionDate: string;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
