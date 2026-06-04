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

  @Column({ name: 'period_month', type: 'date' })
  periodMonth: string;

  @Column({ name: 'limit_amount', type: 'decimal', precision: 12, scale: 2 })
  limitAmount: number;

  @Column({ default: 'DOP' })
  currency: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
