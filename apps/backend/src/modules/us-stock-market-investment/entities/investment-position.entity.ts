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
import { InvestmentPortfolio } from './investment-portfolio.entity';

export enum InvestmentAssetType {
  STOCK = 'stock',
  ETF = 'etf',
}

/**
 * Posición manual de un activo de EE. UU. (acción o ETF) dentro de un
 * portafolio. `user_id` se denormaliza a propósito: TODAS las consultas deben
 * filtrar por user_id, nunca confiar solo en portfolio_id.
 */
@Entity('investment_positions')
@Index(['userId'])
@Index(['userId', 'deletedAt'])
@Index(['portfolioId'])
export class InvestmentPosition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ name: 'portfolio_id' })
  portfolioId: string;

  @ManyToOne(() => InvestmentPortfolio, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'portfolio_id' })
  portfolio?: InvestmentPortfolio;

  /** Símbolo normalizado en mayúsculas (p. ej. AAPL, BRK.B). */
  @Column({ type: 'text' })
  symbol: string;

  @Column({ name: 'display_name', type: 'text', nullable: true })
  displayName: string | null;

  @Column({ name: 'asset_type', type: 'text' })
  assetType: InvestmentAssetType;

  /** Soporta acciones fraccionadas (hasta 8 decimales). */
  @Column({ type: 'decimal', precision: 20, scale: 8 })
  quantity: number;

  @Column({ name: 'average_cost', type: 'decimal', precision: 18, scale: 6 })
  averageCost: number;

  @Column({ type: 'text', default: 'USD' })
  currency: string;

  @Column({ name: 'purchase_date', type: 'date', nullable: true })
  purchaseDate: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date | null;
}
