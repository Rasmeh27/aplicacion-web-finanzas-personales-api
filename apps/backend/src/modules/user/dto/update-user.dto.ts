import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class UpdateUserPreferencesDto {
  @ApiPropertyOptional({
    example: 'DOP',
    description: 'Moneda principal del usuario en formato ISO 4217.',
  })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  @Matches(/^[A-Z]{3}$/)
  primaryCurrency?: string;

  @ApiPropertyOptional({
    example: 'DOP',
    description: 'Alias temporal para compatibilidad con el frontend actual.',
  })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  @Matches(/^[A-Z]{3}$/)
  currency?: string;
}
