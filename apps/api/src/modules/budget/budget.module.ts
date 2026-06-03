import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Budget } from './entities/budget.entity';
import { BudgetController } from './budget.controller';
import { BudgetService } from './budget.service';
import { CreateMonthlyBudgetUseCase } from './use-cases/create-monthly-budget.use-case';

@Module({
  imports: [TypeOrmModule.forFeature([Budget])],
  controllers: [BudgetController],
  providers: [BudgetService, CreateMonthlyBudgetUseCase],
  exports: [BudgetService],
})
export class BudgetModule {}
