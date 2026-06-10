import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateFinancialProfileDto {
  @ApiPropertyOptional({ example: 'Ana Perez' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  fullName?: string;

  @ApiPropertyOptional({ example: 'DOP' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  @Matches(/^[A-Z]{3}$/)
  primaryCurrency?: string;

  @ApiProperty({ example: 45000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  monthlyIncomeEstimate: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  monthlySavingTargetPct?: number;
}
