import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { CreateFinancialGoalDto } from './create-financial-goal.dto';
import { FinancialGoalStatus } from '../entities/financial-goal.entity';

export class UpdateFinancialGoalDto extends PartialType(CreateFinancialGoalDto) {
  @ApiPropertyOptional({
    enum: FinancialGoalStatus,
    description: 'Estado de la meta (active, paused, completed, cancelled).',
  })
  @IsOptional()
  @IsEnum(FinancialGoalStatus)
  status?: FinancialGoalStatus;
}
