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

  /**
   * Monto en la moneda base del usuario (DOP). Es el valor YA convertido y es lo
   * que suman/muestran los reportes y el panel. Si el usuario ingresó en otra
   * moneda, el monto y la moneda originales quedan en `originalAmount`/
   * `originalCurrency`.
   */
  @Column({ type: 'decimal', precision: 14, scale: 2 })
  amount: number;

  /** Moneda de `amount` (moneda base del usuario). */
  @Column({ default: 'DOP' })
  currency: string;

  /** Monto tal como lo ingresó el usuario (antes de convertir). */
  @Column({ name: 'original_amount', type: 'decimal', precision: 14, scale: 2, nullable: true })
  originalAmount: number | null;

  /** Moneda que ingresó el usuario (p. ej. USD). */
  @Column({ name: 'original_currency', length: 3, nullable: true })
  originalCurrency: string | null;

  /** Tasa aplicada al convertir de `originalCurrency` a `currency` (base). */
  @Column({ name: 'exchange_rate', type: 'decimal', precision: 18, scale: 6, default: 1 })
  exchangeRate: number;

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
