import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './entities/transaction.entity';
import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';
import { FilterTransactionsUseCase } from './use-cases/cu-011-filter-movements.use-case';

@Module({
  imports: [TypeOrmModule.forFeature([Transaction])],
  controllers: [TransactionController],
  providers: [TransactionService, FilterTransactionsUseCase],
  exports: [TransactionService],
})
export class MovementsModule {}
