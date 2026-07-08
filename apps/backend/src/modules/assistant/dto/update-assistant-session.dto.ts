import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Campos que el frontend puede modificar de una sesión. Por ahora solo el
 * título. El ValidationPipe global (whitelist + forbidNonWhitelisted) rechaza
 * cualquier otro campo (status, user_id, ...) con HTTP 400.
 */
export class UpdateAssistantSessionDto {
  @ApiPropertyOptional({ example: 'Presupuesto de julio' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title?: string;
}
