import {
  Entity, PrimaryColumn, Column,
  CreateDateColumn, UpdateDateColumn, OneToMany,
} from 'typeorm';
import { Transaction } from '../../movements/entities/transaction.entity';

@Entity('profiles')
export class User {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'full_name', type: 'text', nullable: true })
  fullName: string;

  @Column({ name: 'primary_currency', type: 'varchar', length: 3, default: 'DOP' })
  primaryCurrency: string;

  @Column({
    name: 'monthly_income_estimate',
    type: 'numeric',
    precision: 14,
    scale: 2,
    default: 0,
  })
  monthlyIncomeEstimate: number;

  @Column({
    name: 'monthly_saving_target_pct',
    type: 'numeric',
    precision: 5,
    scale: 2,
    default: 0,
  })
  monthlySavingTargetPct: number;

  @OneToMany(() => Transaction, (t) => t.user)
  transactions: Transaction[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
