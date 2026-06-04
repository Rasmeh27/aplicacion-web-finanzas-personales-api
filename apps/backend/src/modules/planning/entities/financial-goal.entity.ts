import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum FinancialGoalStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  PAUSED = 'paused',
  CANCELLED = 'cancelled',
}

@Entity('financial_goals')
@Index(['userId', 'status'])
export class FinancialGoal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'text' })
  name: string;

  @Column({ name: 'target_amount', type: 'decimal', precision: 12, scale: 2 })
  targetAmount: number;

  @Column({
    name: 'current_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  currentAmount: number;

  @Column({ default: 'DOP' })
  currency: string;

  @Column({ name: 'target_date', type: 'date', nullable: true })
  targetDate: string;

  @Column({
    type: 'enum',
    enum: FinancialGoalStatus,
    enumName: 'goal_status',
    default: FinancialGoalStatus.ACTIVE,
  })
  status: FinancialGoalStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
