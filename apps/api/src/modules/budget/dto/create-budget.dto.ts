import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBudgetDto {
  @ApiPropertyOptional({
    example: 'Presupuesto mensual junio 2026',
    description: 'Nombre del presupuesto. Si no se envia, se genera automaticamente.',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    example: 6,
    minimum: 1,
    maximum: 12,
    description: 'Mes del presupuesto mensual.',
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
    description: 'Ano del presupuesto mensual.',
  })
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;

  @ApiProperty({
    example: 25000,
    description: 'Limite total del presupuesto mensual.',
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  limitAmount: number;

  @ApiPropertyOptional({
    example: 'DOP',
    default: 'DOP',
    description: 'Moneda en formato ISO de 3 letras.',
  })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;
}
