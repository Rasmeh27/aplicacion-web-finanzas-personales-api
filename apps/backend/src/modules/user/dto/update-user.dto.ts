import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class UpdateUserPreferencesDto {
  @ApiPropertyOptional({
    example: 'Fabian Alcantara',
    description: 'Nombre completo que se muestra en el perfil.',
  })
  @IsOptional()
  @IsString()
  @Length(2, 120)
  fullName?: string;

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
