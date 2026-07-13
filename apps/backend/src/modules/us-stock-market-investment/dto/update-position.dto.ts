import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { InvestmentAssetType } from '../entities/investment-position.entity';

/**
 * Actualización parcial de una posición. El símbolo NO es editable: para
 * cambiar de activo se elimina la posición y se crea una nueva (mantiene
 * consistente la restricción de duplicados y la trazabilidad).
 */
export class UpdatePositionDto {
  @ApiPropertyOptional({ enum: InvestmentAssetType })
  @IsOptional()
  @IsEnum(InvestmentAssetType)
  assetType?: InvestmentAssetType;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  @Max(1_000_000_000)
  quantity?: number;

  @ApiPropertyOptional({ example: 185.4 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1_000_000_000)
  averageCost?: number;

  @ApiPropertyOptional({ example: '2026-07-01' })
  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @ApiPropertyOptional({ example: 'Actualizada tras nueva compra' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({ example: 'Apple Inc.' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  displayName?: string;
}
