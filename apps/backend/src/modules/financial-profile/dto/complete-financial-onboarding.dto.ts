import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { FinancialItemFrequency } from '../entities/planned-financial-item.entity';

export class FinancialItemDto {
  @ApiProperty({ example: 'Salario', maxLength: 120 })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;

  @ApiProperty({ example: 45000, minimum: 0.01 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ enum: FinancialItemFrequency, default: FinancialItemFrequency.MONTHLY })
  @IsOptional()
  @IsEnum(FinancialItemFrequency)
  frequency: FinancialItemFrequency = FinancialItemFrequency.MONTHLY;

  @ApiPropertyOptional({ example: 'Vivienda', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  categoryName?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class CompleteFinancialOnboardingDto {
  @ApiPropertyOptional({ example: 'DOP', default: 'DOP' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  @Matches(/^[A-Z]{3}$/)
  primaryCurrency: string = 'DOP';

  @ApiPropertyOptional({ example: 20, minimum: 0, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  monthlySavingTargetPct?: number;

  @ApiPropertyOptional({ example: 9000, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  monthlySavingTargetAmount?: number;

  @ApiProperty({ type: [FinancialItemDto], description: 'At least one income source is required.' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => FinancialItemDto)
  incomeSources: FinancialItemDto[];

  @ApiPropertyOptional({ type: [FinancialItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FinancialItemDto)
  fixedExpenses?: FinancialItemDto[];

  @ApiPropertyOptional({ type: [FinancialItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FinancialItemDto)
  variableExpenses?: FinancialItemDto[];
}
