import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCategoryBudgetDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Categoria a la que pertenece el presupuesto.',
  })
  @IsUUID()
  categoryId: string;

  @ApiPropertyOptional({
    example: 'Presupuesto comida junio 2026',
    description: 'Nombre del presupuesto. Si no se envia, se genera automaticamente.',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    example: 6,
    minimum: 1,
    maximum: 12,
    description: 'Mes del presupuesto por categoria.',
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
    description: 'Ano del presupuesto por categoria.',
  })
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;

  @ApiProperty({
    example: 8500,
    description: 'Limite de presupuesto para la categoria.',
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
