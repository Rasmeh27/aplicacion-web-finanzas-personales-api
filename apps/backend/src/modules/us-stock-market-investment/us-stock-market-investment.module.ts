import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketDataModule } from '../../integrations/market-data/market-data.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { InvestmentPortfolio } from './entities/investment-portfolio.entity';
import { InvestmentPortfolioSnapshot } from './entities/investment-portfolio-snapshot.entity';
import { InvestmentPosition } from './entities/investment-position.entity';
import { InvestmentsController } from './investments.controller';
import { InvestmentAnalyticsService } from './services/investment-analytics.service';
import { InvestmentContextService } from './services/investment-context.service';
import { InvestmentPortfolioService } from './services/investment-portfolio.service';
import { InvestmentPositionsService } from './services/investment-positions.service';

// Modulo 6: Inversion U.S Stock Market (Plan Premium)
@Module({
  imports: [
    TypeOrmModule.forFeature([
      InvestmentPortfolio,
      InvestmentPosition,
      InvestmentPortfolioSnapshot,
    ]),
    SubscriptionsModule,
    MarketDataModule,
  ],
  controllers: [InvestmentsController],
  providers: [
    InvestmentPortfolioService,
    InvestmentPositionsService,
    InvestmentAnalyticsService,
    InvestmentContextService,
  ],
  exports: [InvestmentContextService],
})
export class UsStockMarketInvestmentModule {}
