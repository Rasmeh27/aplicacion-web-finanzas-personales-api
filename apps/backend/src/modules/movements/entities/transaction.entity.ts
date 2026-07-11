import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Category } from '../../planning/entities/category.entity';
import { TransactionClassification, TransactionType } from './transaction.enums';

// Re-export para mantener los imports existentes desde la entidad.
export {
  CLASSIFICATION_TO_TYPE,
  TransactionClassification,
  TransactionType,
} from './transaction.enums';

export enum TransactionRecurrenceFrequency {
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

@Entity('movements')
@Index(['userId', 'date'])
@Index(['userId', 'type', 'date'])
@Index(['userId', 'classification', 'date'])
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, (user) => user.transactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({
    type: 'enum',
    enum: TransactionType,
    enumName: 'movement_type',
  })
  type: TransactionType;

  @Column({
    type: 'enum',
    enum: TransactionClassification,
    enumName: 'transaction_classification',
  })
  classification: TransactionClassification;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ default: 'DOP' })
  currency: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'movement_date', type: 'date' })
  date: string;

  @Column({ name: 'category_id', nullable: true })
  categoryId: string;

  @ManyToOne(() => Category, { nullable: true })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column({ name: 'is_recurring', type: 'boolean', default: false })
  isRecurring: boolean;

  @Column({ name: 'recurrence_frequency', type: 'text', nullable: true })
  recurrenceFrequency: TransactionRecurrenceFrequency | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date | null;
}
