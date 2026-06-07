import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreateDebtPaymentDto {
  @ApiProperty({
    example: 7500,
    description: 'Monto pagado a la deuda.',
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  @ApiPropertyOptional({
    example: '2026-06-30',
    description: 'Fecha en que se realizo el pago. Si no se envia, se usa la fecha actual.',
  })
  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @ApiPropertyOptional({
    example: 'Pago mensual',
    description: 'Nota opcional del pago.',
  })
  @IsOptional()
  @IsString()
  note?: string;
}
