import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Length,
} from 'class-validator';

/**
 * Configura/crea el Fondo de emergencia. Si no se envía targetAmount el servicio
 * intenta sugerir 3 meses de gastos (fijos + variables) a partir del onboarding.
 */
export class ConfigureEmergencyFundDto {
  @ApiPropertyOptional({
    example: 90000,
    description:
      'Monto objetivo. Si se omite se sugiere 3 meses de gastos estimados del onboarding.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  targetAmount?: number;

  @ApiPropertyOptional({ example: 0, description: 'Monto inicial ya ahorrado.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  currentAmount?: number;

  @ApiPropertyOptional({ example: 'DOP' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  targetDate?: string;
}
