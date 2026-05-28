import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';

export enum DebtType { LOAN = 'loan', CREDIT_CARD = 'credit_card', MORTGAGE = 'mortgage', OTHER = 'other' }
export enum DebtStatus { ACTIVE = 'active', PAID = 'paid', DEFAULTED = 'defaulted' }

@Entity('debts')
export class Debt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: DebtType })
  type: DebtType;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  initialAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  remainingBalance: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  monthlyPayment: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  interestRate: number;

  @Column({ nullable: true })
  nextPaymentDate: Date;

  @Column({ nullable: true })
  lender: string;

  @Column({ type: 'enum', enum: DebtStatus, default: DebtStatus.ACTIVE })
  status: DebtStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
