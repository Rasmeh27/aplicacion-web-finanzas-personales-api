import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from '../category/entities/category.entity';
import { Budget } from './entities/budget.entity';
import { BudgetController } from './budget.controller';
import { BudgetService } from './budget.service';
import { CreateCategoryBudgetUseCase } from './use-cases/create-category-budget.use-case';
import { CreateMonthlyBudgetUseCase } from './use-cases/create-monthly-budget.use-case';

@Module({
  imports: [TypeOrmModule.forFeature([Budget, Category])],
  controllers: [BudgetController],
  providers: [BudgetService, CreateMonthlyBudgetUseCase, CreateCategoryBudgetUseCase],
  exports: [BudgetService],
})
export class BudgetModule {}
