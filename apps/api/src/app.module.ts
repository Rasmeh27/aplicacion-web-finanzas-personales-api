import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';

// Domain modules (MVP scope)
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { FinancialProfileModule } from './modules/financial-profile/financial-profile.module';
import { TransactionModule } from './modules/transaction/transaction.module';
import { CategoryModule } from './modules/category/category.module';
import { BudgetModule } from './modules/budget/budget.module';
import { GoalModule } from './modules/goal/goal.module';
import { DebtModule } from './modules/debt/debt.module';
import { AiAssistantModule } from './modules/ai-assistant/ai-assistant.module';
import { AuditModule } from './modules/audit/audit.module';

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

    AuthModule,
    UserModule,
    FinancialProfileModule,
    TransactionModule,
    CategoryModule,
    BudgetModule,
    GoalModule,
    DebtModule,
    AiAssistantModule,
    AuditModule,
  ],
})
export class AppModule {}