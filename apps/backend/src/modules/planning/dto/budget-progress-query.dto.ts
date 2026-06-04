import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class BudgetProgressQueryDto {
  @ApiProperty({
    example: 6,
    minimum: 1,
    maximum: 12,
    description: 'Mes del avance del presupuesto.',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @ApiProperty({
    example: 2026,
    minimum: 2000,
    maximum: 2100,
    description: 'Ano del avance del presupuesto.',
  })
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;
}
