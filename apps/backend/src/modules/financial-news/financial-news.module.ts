import { Module } from '@nestjs/common';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { FinancialNewsController } from './financial-news.controller';
import { FinancialNewsService } from './financial-news.service';

@Module({
  imports: [SubscriptionsModule],
  controllers: [FinancialNewsController],
  providers: [FinancialNewsService],
  exports: [FinancialNewsService],
})
export class FinancialNewsModule {}
