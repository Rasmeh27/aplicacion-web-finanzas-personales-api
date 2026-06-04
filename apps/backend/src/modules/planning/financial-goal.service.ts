import { Injectable } from '@nestjs/common';
import { CreateFinancialGoalDto } from './dto/create-financial-goal.dto';
import { FinancialGoal } from './entities/financial-goal.entity';
import { CreateFinancialGoalUseCase } from './use-cases/cu-015-create-financial-goal.use-case';

@Injectable()
export class FinancialGoalService {
  constructor(
    private readonly createFinancialGoalUseCase: CreateFinancialGoalUseCase,
  ) {}

  create(userId: string, dto: CreateFinancialGoalDto): Promise<FinancialGoal> {
    return this.createFinancialGoalUseCase.execute(userId, dto);
  }
}
