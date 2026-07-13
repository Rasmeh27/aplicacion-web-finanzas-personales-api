import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailModule } from '../../integrations/email/email.module';
import { Transaction } from '../movements/entities/transaction.entity';
import { Budget } from '../planning/entities/budget.entity';
import { Debt } from '../planning/entities/debt.entity';
import { FinancialGoal } from '../planning/entities/financial-goal.entity';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { AssistantAlertsController } from './assistant-alerts.controller';
import { AssistantAlertsService } from './assistant-alerts.service';

// Modulo 5: Asistente y alertas
@Module({
  imports: [
    TypeOrmModule.forFeature([Budget, Transaction, Debt, FinancialGoal]),
    EmailModule,
    SubscriptionsModule,
  ],
  controllers: [AssistantAlertsController],
  providers: [AssistantAlertsService],
})
export class AssistantAlertsModule {}
