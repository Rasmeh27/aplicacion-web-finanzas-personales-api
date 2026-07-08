import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AssistantMessage } from './assistant-message.entity';

export enum AssistantSessionStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

/**
 * Conversación del asistente de IA de un usuario. Cada sesión pertenece a un
 * único usuario (`user_id`) y agrupa sus mensajes. El aislamiento por usuario
 * se aplica SIEMPRE en las consultas (WHERE user_id = usuario autenticado);
 * la RLS de la tabla es defensa en profundidad.
 */
@Entity('assistant_sessions')
@Index(['userId', 'updatedAt'])
@Index(['userId', 'status'])
export class AssistantSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'text', nullable: true })
  title: string | null;

  /** Plan del usuario al momento de crear la sesión: 'basic' | 'premium'. */
  @Column({ name: 'plan_at_creation', type: 'varchar', length: 20, default: 'basic' })
  planAtCreation: string;

  @Column({ type: 'varchar', length: 20, default: AssistantSessionStatus.ACTIVE })
  status: AssistantSessionStatus;

  @OneToMany(() => AssistantMessage, (message) => message.session)
  messages: AssistantMessage[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
