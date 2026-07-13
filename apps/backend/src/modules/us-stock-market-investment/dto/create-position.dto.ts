import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { InvestmentAssetType } from '../entities/investment-position.entity';

export class CreatePositionDto {
  @ApiProperty({
    example: 'AAPL',
    description: 'Símbolo del activo en EE. UU. Se normaliza a mayúsculas.',
  })
  @IsString()
  @Matches(/^[A-Za-z0-9.-]{1,12}$/, {
    message: 'symbol must be 1-12 characters (letters, digits, dot or dash)',
  })
  symbol: string;

  @ApiProperty({ enum: InvestmentAssetType, example: InvestmentAssetType.STOCK })
  @IsEnum(InvestmentAssetType)
  assetType: InvestmentAssetType;

  @ApiProperty({
    example: 2.5,
    description:
      'Cantidad de títulos. Soporta fracciones; la BD la almacena con 8 decimales.',
  })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  @Max(1_000_000_000)
  quantity: number;

  @ApiProperty({
    example: 190.25,
    description: 'Costo promedio por título en USD (la BD almacena 6 decimales).',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1_000_000_000)
  averageCost: number;

  @ApiPropertyOptional({ example: '2026-07-01' })
  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @ApiPropertyOptional({ example: 'Posición principal' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({
    example: 'Apple Inc.',
    description: 'Nombre para mostrar; si se omite se intenta resolver del proveedor.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  displayName?: string;
}
