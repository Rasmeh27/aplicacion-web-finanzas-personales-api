import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { SupabaseModule } from './integrations/supabase/supabase.module';

// Modulos principales del proyecto
import { AccountProfileModule } from './modules/account-profile/account-profile.module';
import { MovementsModule } from './modules/movements/movements.module';
import { PlanningModule } from './modules/planning/planning.module';
import { DashboardReportsModule } from './modules/dashboard-reports/dashboard-reports.module';
import { AssistantAlertsModule } from './modules/assistant-alerts/assistant-alerts.module';
import { UsStockMarketInvestmentModule } from './modules/us-stock-market-investment/us-stock-market-investment.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { AssistantModule } from './modules/assistant/assistant.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.getOrThrow<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: false,
        logging: config.get<string>('NODE_ENV') === 'development',
        ssl:
          config.get<string>('DATABASE_SSL') === 'true'
            ? {
                rejectUnauthorized: false,
              }
            : false,
      }),
    }),

    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    SupabaseModule,

    AccountProfileModule,
    MovementsModule,
    PlanningModule,
    DashboardReportsModule,
    AssistantAlertsModule,
    UsStockMarketInvestmentModule,
    SubscriptionsModule,
    AssistantModule,
  ],
})
export class AppModule {}
