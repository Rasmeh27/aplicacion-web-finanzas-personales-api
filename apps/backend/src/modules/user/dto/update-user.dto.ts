import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Length, Matches, Max, Min } from 'class-validator';

export class UpdateUserPreferencesDto {
  @ApiPropertyOptional({
    example: 'Fabian Alcantara',
    description: 'Nombre completo que se muestra en el perfil.',
  })
  @IsOptional()
  @IsString()
  @Length(2, 120)
  fullName?: string;

  @ApiPropertyOptional({
    example: 'DOP',
    description: 'Moneda principal del usuario en formato ISO 4217.',
  })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  @Matches(/^[A-Z]{3}$/)
  primaryCurrency?: string;

  @ApiPropertyOptional({
    example: 'DOP',
    description: 'Alias temporal para compatibilidad con el frontend actual.',
  })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  @Matches(/^[A-Z]{3}$/)
  currency?: string;

  @ApiPropertyOptional({ example: 45000, description: 'Ingreso mensual estimado.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  monthlyIncomeEstimate?: number;

  @ApiPropertyOptional({ example: 20, description: 'Porcentaje mensual objetivo de ahorro.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  monthlySavingTargetPct?: number;

  @ApiPropertyOptional({ example: 9000, description: 'Monto mensual objetivo de ahorro.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  monthlySavingTargetAmount?: number;

  @ApiPropertyOptional({ example: 15000, description: 'Gastos fijos mensuales estimados.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  monthlyFixedExpenseEstimate?: number;

  @ApiPropertyOptional({ example: 8000, description: 'Gastos variables mensuales estimados.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  monthlyVariableExpenseEstimate?: number;
}
