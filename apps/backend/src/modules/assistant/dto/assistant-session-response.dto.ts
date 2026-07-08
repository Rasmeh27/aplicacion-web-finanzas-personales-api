import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Vista pública de una sesión (sin user_id ni datos internos). */
export class AssistantSessionDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional({ nullable: true, example: 'Organizar mis gastos' })
  title: string | null;

  @ApiProperty({ example: 'active', enum: ['active', 'archived'] })
  status: string;

  @ApiProperty({ example: 'basic', enum: ['basic', 'premium'] })
  plan_at_creation: string;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;
}

/** Respuesta de `GET /assistant/sessions`. */
export class AssistantSessionListResponseDto {
  @ApiProperty({ example: true })
  ok: boolean;

  @ApiProperty({ type: [AssistantSessionDto] })
  items: AssistantSessionDto[];
}

/** Respuesta de `PATCH /assistant/sessions/:sessionId`. */
export class AssistantSessionItemResponseDto {
  @ApiProperty({ example: true })
  ok: boolean;

  @ApiProperty({ type: AssistantSessionDto })
  item: AssistantSessionDto;
}
