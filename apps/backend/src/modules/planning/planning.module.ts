import { Module } from '@nestjs/common';
import { PlanningModule as BudgetPlanningModule } from './budget.module';

// Modulo 3: Planificacion
@Module({
  imports: [BudgetPlanningModule],
  exports: [BudgetPlanningModule],
})
export class PlanningModule {}
