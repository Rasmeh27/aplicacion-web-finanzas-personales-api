import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, OneToOne, OneToMany,
} from 'typeorm';
import { FinancialProfile } from '../../financial-profile/entities/financial-profile.entity';
import { Transaction }      from '../../transaction/entities/transaction.entity';

export enum UserStatus { ACTIVE = 'active', INACTIVE = 'inactive', SUSPENDED = 'suspended' }

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  passwordHash: string;

  @Column({ nullable: true })
  firstName: string;

  @Column({ nullable: true })
  lastName: string;

  @Column({ default: 'DOP' })
  currency: string;

  @Column({ default: 'es' })
  locale: string;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @Column({ default: false })
  mfaEnabled: boolean;

  @Column({ nullable: true, select: false })
  mfaSecret: string;

  @Column({ nullable: true })
  lastLoginAt: Date;

  @OneToOne(() => FinancialProfile, (fp) => fp.user, { cascade: true })
  financialProfile: FinancialProfile;

  @OneToMany(() => Transaction, (t) => t.user)
  transactions: Transaction[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
