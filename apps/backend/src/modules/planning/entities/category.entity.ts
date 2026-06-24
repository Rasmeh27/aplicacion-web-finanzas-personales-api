import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { TransactionClassification } from '../../movements/entities/transaction.enums';

export enum CategoryType {
  INCOME = 'income',
  EXPENSE = 'expense',
}

@Entity('categories')
@Index(['userId', 'type'])
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'text' })
  name: string;

  @Column({
    type: 'enum',
    enum: CategoryType,
    enumName: 'movement_type',
    default: CategoryType.EXPENSE,
  })
  type: CategoryType;

  /**
   * Clasificación de finanzas personales (opcional). Agrupa categorías como
   * regular_income / extra_income / fixed_expense / variable_expense.
   */
  @Column({
    type: 'enum',
    enum: TransactionClassification,
    enumName: 'transaction_classification',
    nullable: true,
  })
  classification: TransactionClassification | null;

  @Column({ type: 'text', nullable: true })
  icon: string;

  @Column({ type: 'text', nullable: true })
  color: string;

  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
