import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Clean response returned to the frontend. Internal details (internal API key,
 * raw AI-service errors, the full internal request, internal metadata) are
 * never exposed here.
 */
export class AssistantChatResponseDto {
  @ApiProperty({ example: true })
  ok: boolean;

  @ApiProperty({
    example:
      'El asistente de finanzas está conectado correctamente. Aún no tengo ' +
      'acceso a tu contexto financiero real ni a la base de conocimiento.',
  })
  message: string;

  @ApiPropertyOptional({ example: 'b3f1c0de-0000-4000-8000-000000000000' })
  session_id?: string;

  @ApiPropertyOptional({
    type: Object,
    description:
      'Metadata segura para el frontend: request_id, rag_enabled, ' +
      'financial_context_enabled. No incluye allowed_scopes, user, email ni prompts.',
    example: {
      request_id: '...',
      rag_enabled: false,
      financial_context_enabled: false,
    },
  })
  metadata?: Record<string, unknown>;
}
