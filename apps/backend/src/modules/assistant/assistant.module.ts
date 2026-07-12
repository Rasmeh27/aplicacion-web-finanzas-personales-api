import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { UsStockMarketInvestmentModule } from '../us-stock-market-investment/us-stock-market-investment.module';
import { Budget } from '../planning/entities/budget.entity';
import { Category } from '../planning/entities/category.entity';
import { FinancialGoal } from '../planning/entities/financial-goal.entity';
import { Transaction } from '../movements/entities/transaction.entity';
import { User } from '../user/entities/user.entity';
import { AiServiceClient } from './clients/ai-service.client';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';
import { AssistantSession } from './entities/assistant-session.entity';
import { AssistantMessage } from './entities/assistant-message.entity';
import { FinancialContextController } from './financial-context/financial-context.controller';
import { FinancialContextService } from './financial-context/financial-context.service';
import { InternalApiKeyGuard } from './financial-context/guards/internal-api-key.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AssistantSession,
      AssistantMessage,
      // Entidades read-only para el resumen financiero interno (ai-service).
      User,
      Transaction,
      Budget,
      FinancialGoal,
      Category,
    ]),
    SubscriptionsModule,
    // Contexto premium de inversiones para el resumen financiero interno.
    UsStockMarketInvestmentModule,
  ],
  controllers: [AssistantController, FinancialContextController],
  providers: [AssistantService, AiServiceClient, FinancialContextService, InternalApiKeyGuard],
})
export class AssistantModule {}
