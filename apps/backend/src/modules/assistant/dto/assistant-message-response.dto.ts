import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssistantSessionDto } from './assistant-session-response.dto';

/** Vista pública de un mensaje (sin user_id, provider, model ni metadata interna). */
export class AssistantMessageDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: 'user', enum: ['user', 'assistant', 'system'] })
  role: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  created_at: Date;

  @ApiPropertyOptional({
    description:
      'Solo campos seguros: request_id, rag_enabled, financial_context_enabled.',
    example: {
      request_id: '...',
      rag_enabled: false,
      financial_context_enabled: false,
    },
  })
  metadata?: Record<string, unknown>;
}

/** Respuesta de `GET /assistant/sessions/:sessionId/messages`. */
export class AssistantSessionMessagesResponseDto {
  @ApiProperty({ example: true })
  ok: boolean;

  @ApiProperty({
    description: 'Datos mínimos de la sesión.',
    example: { id: '...', title: '...', status: 'active' },
  })
  session: Pick<AssistantSessionDto, 'id' | 'title' | 'status'>;

  @ApiProperty({ type: [AssistantMessageDto] })
  items: AssistantMessageDto[];
}
