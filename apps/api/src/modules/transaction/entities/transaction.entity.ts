import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, Index,
} from 'typeorm';
import { User }     from '../../user/entities/user.entity';
import { Category } from '../../category/entities/category.entity';

export enum TransactionType { INCOME = 'income', EXPENSE = 'expense' }
export enum RecurrenceFrequency { NONE = 'none', DAILY = 'daily', WEEKLY = 'weekly', MONTHLY = 'monthly', YEARLY = 'yearly' }

@Entity('transactions')
@Index(['userId', 'date'])
@Index(['userId', 'type'])
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, (u) => u.transactions, { onDelete: 'CASCADE' })
  user: User;

  @Column({ type: 'enum', enum: TransactionType })
  type: TransactionType;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column()
  description: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({ nullable: true })
  categoryId: string;

  @ManyToOne(() => Category, { nullable: true })
  category: Category;

  @Column({ type: 'enum', enum: RecurrenceFrequency, default: RecurrenceFrequency.NONE })
  recurrence: RecurrenceFrequency;

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
