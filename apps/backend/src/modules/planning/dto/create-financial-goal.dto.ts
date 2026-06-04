import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Length,
  Min,
  MinLength,
} from 'class-validator';

export class CreateFinancialGoalDto {
  @ApiProperty({
    example: 'Fondo de emergencia',
    description: 'Nombre de la meta financiera.',
  })
  @IsString()
  @MinLength(3)
  name: string;

  @ApiProperty({
    example: 50000,
    description: 'Monto objetivo de la meta financiera.',
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  targetAmount: number;

  @ApiPropertyOptional({
    example: 5000,
    default: 0,
    description: 'Monto inicial ahorrado para la meta.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  currentAmount?: number;

  @ApiPropertyOptional({
    example: 'DOP',
    default: 'DOP',
    description: 'Moneda en formato ISO de 3 letras.',
  })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiPropertyOptional({
    example: '2026-12-31',
    description: 'Fecha objetivo para completar la meta.',
  })
  @IsOptional()
  @IsDateString()
  targetDate?: string;
}
