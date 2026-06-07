import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Debt } from './debt.entity';

@Entity('debt_payments')
@Index(['userId', 'debtId'])
export class DebtPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'debt_id' })
  debtId: string;

  @ManyToOne(() => Debt, { onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'debt_id', referencedColumnName: 'id' },
    { name: 'user_id', referencedColumnName: 'userId' },
  ])
  debt: Debt;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ name: 'payment_date', type: 'date' })
  paymentDate: string;

  @Column({ type: 'text', nullable: true })
  note: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
