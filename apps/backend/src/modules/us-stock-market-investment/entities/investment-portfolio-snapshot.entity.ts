import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { InvestmentPortfolio } from './investment-portfolio.entity';

export type SnapshotMarketDataStatus = 'fresh' | 'partial' | 'stale' | 'unavailable';

/**
 * Evolución diaria REAL del portafolio: un snapshot por portafolio y día.
 * El historial comienza cuando la aplicación empieza a usarse; nunca se
 * reconstruye retroactivamente como si fuera desempeño histórico real.
 */
@Entity('investment_portfolio_snapshots')
@Unique('uq_investment_snapshots_portfolio_date', ['portfolioId', 'snapshotDate'])
@Index(['userId'])
@Index(['portfolioId', 'snapshotDate'])
export class InvestmentPortfolioSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'portfolio_id' })
  portfolioId: string;

  @ManyToOne(() => InvestmentPortfolio, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'portfolio_id' })
  portfolio?: InvestmentPortfolio;

  @Column({ name: 'snapshot_date', type: 'date' })
  snapshotDate: string;

  @Column({ name: 'cost_basis', type: 'decimal', precision: 18, scale: 2 })
  costBasis: number;

  @Column({
    name: 'market_value',
    type: 'decimal',
    precision: 18,
    scale: 2,
    nullable: true,
  })
  marketValue: number | null;

  @Column({
    name: 'unrealized_gain_loss',
    type: 'decimal',
    precision: 18,
    scale: 2,
    nullable: true,
  })
  unrealizedGainLoss: number | null;

  @Column({ type: 'text', default: 'USD' })
  currency: string;

  @Column({ name: 'market_data_status', type: 'text' })
  marketDataStatus: SnapshotMarketDataStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
