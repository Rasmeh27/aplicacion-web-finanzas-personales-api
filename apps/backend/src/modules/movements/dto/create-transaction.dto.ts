import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  Min,
  Validate,
} from 'class-validator';
import {
  TransactionClassification,
  TransactionType,
} from '../entities/transaction.entity';
import { IsTypeCoherentWithClassificationConstraint } from '../validators/classification-type.validator';

export class CreateTransactionDto {
  @ApiProperty({
    enum: TransactionClassification,
    description:
      'Clasificación de finanzas personales. Determina el tipo (income/expense).',
  })
  @IsEnum(TransactionClassification)
  classification: TransactionClassification;

  @ApiPropertyOptional({
    enum: TransactionType,
    description:
      'Opcional. Si se envía debe ser coherente con la clasificación; si se omite se deriva automáticamente.',
  })
  @IsOptional()
  @IsEnum(TransactionType)
  @Validate(IsTypeCoherentWithClassificationConstraint)
  type?: TransactionType;

  @ApiProperty({ example: 1500.0 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ example: 'DOP' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  @Matches(/^[A-Z]{3}$/)
  currency?: string;

  @ApiProperty({ example: 'Salario mensual' })
  @IsString()
  @Length(1, 240)
  @Matches(/\S/, { message: 'description must contain text' })
  description: string;

  @ApiPropertyOptional({ example: 'Pago vía transferencia' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({ example: '2026-05-01' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
