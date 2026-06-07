import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum DebtStatus {
  ACTIVE = 'active',
  PAID = 'paid',
  CANCELLED = 'cancelled',
}

@Entity('debts')
@Index(['userId', 'status'])
export class Debt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text', nullable: true })
  creditor: string;

  @Column({ name: 'initial_amount', type: 'decimal', precision: 12, scale: 2 })
  initialAmount: number;

  @Column({
    name: 'minimum_payment',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  minimumPayment: number;

  @Column({
    name: 'interest_rate_pct',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
  })
  interestRatePct: number;

  @Column({ name: 'due_day', type: 'int', nullable: true })
  dueDay: number;

  @Column({ default: 'DOP' })
  currency: string;

  @Column({
    type: 'enum',
    enum: DebtStatus,
    enumName: 'debt_status',
    default: DebtStatus.ACTIVE,
  })
  status: DebtStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
