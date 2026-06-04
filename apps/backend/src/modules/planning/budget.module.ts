import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Budget } from './entities/budget.entity';
import { Category } from './entities/category.entity';
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
export class PlanningModule {}
