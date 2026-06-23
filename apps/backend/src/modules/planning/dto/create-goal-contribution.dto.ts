import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export class CreateGoalContributionDto {
  @ApiProperty({ example: 1000, description: 'Monto a aportar a la meta (> 0).' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  @ApiPropertyOptional({ example: 'DOP', description: 'Moneda ISO de 3 letras.' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiPropertyOptional({ example: '2026-06-22', description: 'Fecha del aporte (YYYY-MM-DD).' })
  @IsOptional()
  @IsDateString()
  contributionDate?: string;

  @ApiPropertyOptional({ example: 'Ahorro de la quincena' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
