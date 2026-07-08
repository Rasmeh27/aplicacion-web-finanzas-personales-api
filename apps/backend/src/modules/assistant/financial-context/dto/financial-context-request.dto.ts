import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Periodo de análisis (fechas date-only, inclusive). */
export class FinancialPeriodDto {
  @IsString()
  @Matches(DATE_ONLY, { message: 'from must be YYYY-MM-DD' })
  from: string;

  @IsString()
  @Matches(DATE_ONLY, { message: 'to must be YYYY-MM-DD' })
  to: string;
}

/**
 * Request del endpoint INTERNO `POST /api/v1/internal/assistant/financial-context`.
 *
 * Lo envía el ai-service (nunca el frontend). `user_id`/`plan`/`allowed_scopes`
 * fueron construidos originalmente por este backend autenticado al llamar al
 * ai-service; aquí se re-validan defensivamente (user existe, scopes coherentes
 * con el plan). El ValidationPipe global (whitelist + forbidNonWhitelisted)
 * rechaza cualquier campo extra con 400.
 */
export class FinancialContextRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  request_id: string;

  @IsUUID()
  user_id: string;

  @IsIn(['basic', 'premium'])
  plan: 'basic' | 'premium';

  @IsArray()
  @ArrayNotEmpty()
  @IsIn(['app_usage', 'finance_basic', 'finance_premium', 'user_private'], {
    each: true,
  })
  allowed_scopes: string[];

  @IsOptional()
  @IsIn(['es', 'en'])
  locale?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => FinancialPeriodDto)
  period?: FinancialPeriodDto;

  /** Mensaje del usuario (opcional, solo para contexto; no se persiste aquí). */
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  question?: string;
}
