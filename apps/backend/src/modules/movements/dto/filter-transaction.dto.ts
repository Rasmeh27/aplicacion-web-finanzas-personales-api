import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  IsDateString,
  IsInt,
  MaxLength,
  Min,
  Max,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  Validate,
  ValidationArguments,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  TransactionClassification,
  TransactionType,
} from '../entities/transaction.entity';

/**
 * Valida que startDate sea menor o igual a endDate cuando ambas fechas existen.
 */
@ValidatorConstraint({ name: 'isStartDateBeforeEndDate', async: false })
export class IsStartDateBeforeEndDateConstraint
  implements ValidatorConstraintInterface
{
  validate(endDate: string, args: ValidationArguments): boolean {
    const filters = args.object as FilterTransactionDto;
    if (!filters.startDate || !endDate) return true;

    return new Date(filters.startDate) <= new Date(endDate);
  }

  defaultMessage(): string {
    return 'startDate must be less than or equal to endDate';
  }
}

/**
 * DTO para filtrar transacciones
 *
 * Soporta los siguientes filtros:
 * - type: income o expense
 * - categoryId: UUID de la categoría
 * - startDate: Fecha de inicio (ISO 8601)
 * - endDate: Fecha de fin (ISO 8601)
 * - limit: Cantidad de registros (1-100, default: 20)
 * - offset: Salto de registros (default: 0)
 */
export class FilterTransactionDto {
  @ApiPropertyOptional({
    enum: TransactionType,
    description: 'Filtrar por tipo de movimiento',
    example: 'income',
  })
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @ApiPropertyOptional({
    enum: TransactionClassification,
    description: 'Filtrar por clasificación de finanzas personales',
    example: 'fixed_expense',
  })
  @IsOptional()
  @IsEnum(TransactionClassification)
  classification?: TransactionClassification;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Filtrar por ID de categoría',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Búsqueda por descripción o comercio',
    example: 'supermercado',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({
    format: 'date',
    description: 'Fecha de inicio del rango (ISO 8601: YYYY-MM-DD)',
    example: '2026-01-01',
  })
  @IsOptional()
  @IsDateString(
    { strict: true },
    { message: 'startDate must be a valid ISO 8601 date' },
  )
  startDate?: string;

  @ApiPropertyOptional({
    format: 'date',
    description: 'Fecha de fin del rango (ISO 8601: YYYY-MM-DD)',
    example: '2026-12-31',
  })
  @IsOptional()
  @IsDateString(
    { strict: true },
    { message: 'endDate must be a valid ISO 8601 date' },
  )
  @Validate(IsStartDateBeforeEndDateConstraint, {
    message: 'startDate must be less than or equal to endDate',
  })
  endDate?: string;

  @ApiPropertyOptional({
    type: Number,
    description: 'Cantidad de registros a retornar (máximo 100)',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'limit must be at least 1' })
  @Max(100, { message: 'limit cannot exceed 100' })
  limit?: number = 20;

  @ApiPropertyOptional({
    type: Number,
    description: 'Número de registros a saltar para paginación',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0, { message: 'offset must be greater than or equal to 0' })
  offset?: number = 0;
}
