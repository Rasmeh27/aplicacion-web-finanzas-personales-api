import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

/**
 * Actualiza un presupuesto. No se permite cambiar categoría/mes/año
 * (eso definiría un presupuesto distinto); para eso se crea uno nuevo.
 */
export class UpdateBudgetDto {
  @ApiPropertyOptional({ example: 9000, description: 'Nuevo límite (> 0).' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amountLimit?: number;

  @ApiPropertyOptional({ example: 75, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  alertThresholdPct?: number;

  @ApiPropertyOptional({ example: 'DOP' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  @Matches(/^[A-Za-z]{3}$/)
  currency?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
