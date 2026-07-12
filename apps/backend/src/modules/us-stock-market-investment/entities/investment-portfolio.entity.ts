import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

/**
 * Portafolio de inversiones del usuario. En esta fase cada usuario opera sobre
 * un único portafolio predeterminado (is_default) que se crea de forma
 * perezosa e idempotente al entrar al módulo de inversiones.
 */
@Entity('investment_portfolios')
@Index(['userId'])
@Index(['userId', 'deletedAt'])
export class InvestmentPortfolio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ type: 'text' })
  name: string;

  @Column({ name: 'base_currency', type: 'text', default: 'USD' })
  baseCurrency: string;

  @Column({ name: 'is_default', type: 'boolean', default: true })
  isDefault: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date | null;
}
