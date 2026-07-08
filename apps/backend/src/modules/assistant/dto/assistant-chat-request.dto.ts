import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

/**
 * Payload the FRONTEND is allowed to send to `POST /api/v1/assistant/chat`.
 *
 * IMPORTANT: only `message` and `session_id` are accepted. The global
 * ValidationPipe runs with `whitelist` + `forbidNonWhitelisted`, so any other
 * field the client tries to send (`user_id`, `plan`, `allowed_scopes`, `scope`,
 * `tenant_id`, `metadata`, ...) is rejected with HTTP 400. Authorization data
 * is resolved server-side from the authenticated user — never trusted from the
 * request body.
 */
export class AssistantChatRequestDto {
  @ApiProperty({ example: '¿Cómo voy con mi presupuesto este mes?' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  message: string;

  @ApiPropertyOptional({ example: 'b3f1c0de-0000-4000-8000-000000000000' })
  @IsOptional()
  @IsUUID()
  session_id?: string;
}
