import { Module } from '@nestjs/common';
import { MovementsModule as TransactionMovementsModule } from './transaction.module';

// Modulo 2: Movimientos
@Module({
  imports: [TransactionMovementsModule],
  exports: [TransactionMovementsModule],
})
export class MovementsModule {}
