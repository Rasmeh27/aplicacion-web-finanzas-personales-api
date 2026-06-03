import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { SupabaseModule } from '@integrations/supabase/supabase.module';

// Domain modules
import { AuthModule }             from '@modules/auth/auth.module';
import { UserModule }             from '@modules/user/user.module';
import { FinancialProfileModule } from '@modules/financial-profile/financial-profile.module';
import { TransactionModule }      from '@modules/transaction/transaction.module';
import { CategoryModule }         from '@modules/category/category.module';
import { BudgetModule }           from '@modules/budget/budget.module';
import { GoalModule }             from '@modules/goal/goal.module';
import { DebtModule }             from '@modules/debt/debt.module';
import { HealthSnapshotModule }   from '@modules/health-snapshot/health-snapshot.module';
import { ReportModule }           from '@modules/report/report.module';
import { AiAssistantModule }      from '@modules/ai-assistant/ai-assistant.module';
import { InvestmentModule }       from '@modules/investment/investment.module';
import { WatchlistModule }        from '@modules/watchlist/watchlist.module';
import { NewsModule }             from '@modules/news/news.module';
import { NotificationModule }     from '@modules/notification/notification.module';
import { AuditModule }            from '@modules/audit/audit.module';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/api/.env', '.env', '../../.env'],
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: false,
        logging: config.get('NODE_ENV') === 'development',
        ssl:
          config.get<string>('DATABASE_SSL') === 'true'
            ? { rejectUnauthorized: false }
            : false,
      }),
    }),

    // Rate limiting
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    SupabaseModule,

    // Domain modules
    AuthModule,
    UserModule,
    FinancialProfileModule,
    TransactionModule,
    CategoryModule,
    BudgetModule,
    GoalModule,
    DebtModule,
    HealthSnapshotModule,
    ReportModule,
    AiAssistantModule,
    InvestmentModule,
    WatchlistModule,
    NewsModule,
    NotificationModule,
    AuditModule,
  ],
})
export class AppModule {}
