import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './entities/transaction.entity';
import { User } from '../user/entities/user.entity';
import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';
import { CurrencyConversionService } from './currency-conversion.service';
import { FilterTransactionsUseCase } from './use-cases/cu-011-filter-movements.use-case';

@Module({
  imports: [TypeOrmModule.forFeature([Transaction, User])],
  controllers: [TransactionController],
  providers: [TransactionService, CurrencyConversionService, FilterTransactionsUseCase],
  exports: [TransactionService, CurrencyConversionService],
})
export class MovementsModule {}
