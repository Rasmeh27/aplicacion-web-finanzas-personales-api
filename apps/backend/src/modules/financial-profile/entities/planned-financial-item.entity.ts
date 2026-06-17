import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

export enum PlannedFinancialItemType {
  INCOME = 'income',
  FIXED_EXPENSE = 'fixed_expense',
  VARIABLE_EXPENSE = 'variable_expense',
}

export enum FinancialItemFrequency {
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

// Postgres returns numeric/decimal columns as strings; keep them as numbers in JS.
const numericTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) =>
    value === null || value === undefined ? null : Number(value),
};

/**
 * Estimated / planned financial items captured during onboarding.
 * Reserved for planned amounts only — real transactions live in `movements`.
 */
@Entity('planned_financial_items')
@Index('idx_planned_financial_items_user_id', ['userId'])
@Index('idx_planned_financial_items_user_type', ['userId', 'type'])
@Index('idx_planned_financial_items_user_active', ['userId', 'isActive'])
export class PlannedFinancialItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({
    type: 'enum',
    enum: PlannedFinancialItemType,
    enumName: 'planned_financial_item_type',
  })
  type: PlannedFinancialItemType;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, transformer: numericTransformer })
  amount: number;

  @Column({ type: 'varchar', length: 3, default: 'DOP' })
  currency: string;

  @Column({
    type: 'enum',
    enum: FinancialItemFrequency,
    enumName: 'financial_item_frequency',
    default: FinancialItemFrequency.MONTHLY,
  })
  frequency: FinancialItemFrequency;

  @Column({ name: 'category_name', type: 'text', nullable: true })
  categoryName: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
