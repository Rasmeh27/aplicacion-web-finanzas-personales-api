import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AssistantSession } from './assistant-session.entity';

export enum AssistantMessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

/**
 * Mensaje persistido de una conversación del asistente. Guarda tanto el turno
 * del usuario como la respuesta del asistente.
 *
 * Privacidad: NUNCA se persiste el email del usuario, prompts internos, API
 * keys, allowed_scopes ni datos financieros privados. `metadata` solo contiene
 * la metadata saneada del AI Service (ver AssistantService.sanitizeAiMetadata).
 */
@Entity('assistant_messages')
@Index(['sessionId', 'createdAt'])
@Index(['userId'])
export class AssistantMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'session_id' })
  sessionId: string;

  @ManyToOne(() => AssistantSession, (session) => session.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'session_id' })
  session?: AssistantSession;

  /** Denormalizado a propósito para aislar y filtrar por usuario sin joins. */
  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 20 })
  role: AssistantMessageRole;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'request_id', type: 'text', nullable: true })
  requestId: string | null;

  @Column({ type: 'text', nullable: true })
  provider: string | null;

  @Column({ type: 'text', nullable: true })
  model: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
