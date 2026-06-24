import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  Index,
} from 'typeorm';
import { Category } from './category.entity';

@Entity('budgets')
@Index(['userId', 'periodMonth'])
@Index(['userId', 'year', 'month'])
@Index(['userId', 'categoryId', 'year', 'month'])
export class Budget {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'category_id', nullable: true })
  categoryId: string;

  @ManyToOne(() => Category, { nullable: true })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column({ type: 'text' })
  name: string;

  /**
   * Periodo almacenado como primer día del mes (legacy + índice). Las columnas
   * month/year son la representación canónica para la API mensual por categoría.
   */
  @Column({ name: 'period_month', type: 'date' })
  periodMonth: string;

  @Column({ name: 'period_type', type: 'text', default: 'monthly' })
  periodType: string;

  @Column({ type: 'int', nullable: true })
  month: number | null;

  @Column({ type: 'int', nullable: true })
  year: number | null;

  @Column({ name: 'limit_amount', type: 'decimal', precision: 12, scale: 2 })
  limitAmount: number;

  @Column({ default: 'DOP' })
  currency: string;

  @Column({ name: 'alert_threshold_pct', type: 'int', default: 80 })
  alertThresholdPct: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
