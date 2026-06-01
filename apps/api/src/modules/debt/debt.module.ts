import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Debt } from './entities/debt.entity';
import { DebtController } from './debt.controller';
import { DebtService } from './debt.service';

@Module({
  imports: [TypeOrmModule.forFeature([Debt])],
  controllers: [DebtController],
  providers: [DebtService],
  exports: [DebtService],
})
export class DebtModule {}
