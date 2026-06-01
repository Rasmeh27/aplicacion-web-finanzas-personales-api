import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('financial_profiles')
export class FinancialProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @OneToOne(() => User, (user) => user.financialProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  monthlyIncome: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  monthlyExpenses: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  savingsGoal: number;

  @Column({ nullable: true })
  riskTolerance: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
