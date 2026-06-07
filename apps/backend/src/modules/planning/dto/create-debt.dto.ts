import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Length,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreateDebtDto {
  @ApiProperty({
    example: 'Prestamo del carro',
    description: 'Nombre de la deuda.',
  })
  @IsString()
  @MinLength(3)
  name: string;

  @ApiPropertyOptional({
    example: 'Banco Popular',
    description: 'Persona o entidad a la que se le debe.',
  })
  @IsOptional()
  @IsString()
  creditor?: string;

  @ApiProperty({
    example: 150000,
    description: 'Monto inicial de la deuda.',
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  initialAmount: number;

  @ApiPropertyOptional({
    example: 7500,
    default: 0,
    description: 'Pago minimo mensual.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  minimumPayment?: number;

  @ApiPropertyOptional({
    example: 12.5,
    default: 0,
    description: 'Tasa de interes anual en porcentaje.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  interestRatePct?: number;

  @ApiPropertyOptional({
    example: 15,
    minimum: 1,
    maximum: 31,
    description: 'Dia del mes en que vence el pago.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  dueDay?: number;

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
