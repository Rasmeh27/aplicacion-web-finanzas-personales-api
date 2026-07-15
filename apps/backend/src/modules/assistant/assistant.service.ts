import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { AiServiceClient } from './clients/ai-service.client';
import { AssistantChatRequestDto } from './dto/assistant-chat-request.dto';
import { AssistantChatResponseDto } from './dto/assistant-chat-response.dto';
import {
  AssistantMessageDto,
  AssistantSessionMessagesResponseDto,
} from './dto/assistant-message-response.dto';
import {
  AssistantSessionDto,
  AssistantSessionItemResponseDto,
  AssistantSessionListResponseDto,
} from './dto/assistant-session-response.dto';
import { UpdateAssistantSessionDto } from './dto/update-assistant-session.dto';
import {
  AssistantMessage,
  AssistantMessageRole,
} from './entities/assistant-message.entity';
import {
  AssistantSession,
  AssistantSessionStatus,
} from './entities/assistant-session.entity';
import { UserPlanService } from '../subscriptions/user-plan.service';
import {
  AiServiceChatRequest,
  AiServiceChatResponse,
  KnowledgeScope,
  PlanType,
} from './types/ai-service-contract.types';

/** Metadata del AI Service que es seguro persistir (nunca secretos ni PII). */
const STORABLE_METADATA_KEYS = [
  'request_id',
  'rag_enabled',
  'financial_context_enabled',
  'investment_context_enabled',
  // Señales de diagnóstico (booleanos/strings, sin PII): truncación de la
  // respuesta y si la obtención del contexto financiero falló (fail-open).
  'financial_context_fetch_failed',
  'finish_reason',
  'truncated',
  'llm_provider',
  'llm_model',
] as const;

const MAX_TITLE_LENGTH = 60;

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);

  constructor(
    private readonly aiService: AiServiceClient,
    private readonly userPlanService: UserPlanService,
    @InjectRepository(AssistantSession)
    private readonly sessionRepo: Repository<AssistantSession>,
    @InjectRepository(AssistantMessage)
    private readonly messageRepo: Repository<AssistantMessage>,
  ) {}

  /**
   * Flujo de chat con persistencia:
   *  1. Resuelve/crea la sesión (aislada por user_id).
   *  2. Guarda el mensaje del usuario.
   *  3. Llama al AI Service.
   *  4. Si el AI Service responde OK, guarda la respuesta del asistente.
   *     Si falla, NO guarda respuesta del asistente y relanza el error.
   */
  async chat(
    userId: string,
    email: string | undefined,
    dto: AssistantChatRequestDto,
  ): Promise<AssistantChatResponseDto> {
    const requestId = randomUUID();
    // El plan SIEMPRE se resuelve en el backend (nunca viene del frontend).
    // Para sesiones existentes usamos el plan ACTUAL del usuario en el request
    // al ai-service; `plan_at_creation` de la sesión no se modifica.
    const { plan } = await this.userPlanService.resolveUserPlan(userId);
    const allowedScopes = this.allowedScopesForPlan(plan);

    const session = dto.session_id
      ? await this.getOwnedSessionOrFail(userId, dto.session_id)
      : await this.createSession(userId, plan, dto.message);

    // 2. Persistir mensaje del usuario ANTES de llamar al AI Service.
    await this.messageRepo.save(
      this.messageRepo.create({
        sessionId: session.id,
        userId,
        role: AssistantMessageRole.USER,
        content: dto.message,
      }),
    );

    const payload: AiServiceChatRequest = {
      request_id: requestId,
      user: { id: userId, email },
      plan,
      allowed_scopes: allowedScopes,
      message: dto.message,
      session_id: session.id,
      locale: 'es',
      metadata: { source: 'web_app' },
    };

    this.logger.log(
      `assistant.chat start request_id=${requestId} session_id=${session.id} ` +
        `user_hash=${this.hashUserId(userId)} plan=${plan}`,
    );
    const startedAt = Date.now();

    let result: AiServiceChatResponse;
    try {
      result = await this.aiService.chat(payload);
    } catch (error) {
      // El mensaje del usuario ya quedó guardado; NO guardamos respuesta del
      // asistente. Se relanza el error de gateway ya saneado por el client.
      this.logger.warn(
        `assistant.chat failed request_id=${requestId} session_id=${session.id} ` +
          `status=error ai_latency_ms=${Date.now() - startedAt} ` +
          `reason=${(error as Error)?.name ?? 'unknown'}`,
      );
      throw error;
    }
    const aiLatencyMs = Date.now() - startedAt;

    const storedMetadata = this.sanitizeAiMetadata(result.metadata, requestId);

    // 4. Persistir respuesta del asistente.
    await this.messageRepo.save(
      this.messageRepo.create({
        sessionId: session.id,
        userId,
        role: AssistantMessageRole.ASSISTANT,
        content: result.message,
        requestId: (storedMetadata.request_id as string) ?? requestId,
        provider: (storedMetadata.llm_provider as string) ?? null,
        model: (storedMetadata.llm_model as string) ?? null,
        metadata: storedMetadata,
      }),
    );

    // Refrescar updated_at de la sesión para el orden por recencia.
    await this.sessionRepo.update(
      { id: session.id, userId },
      { updatedAt: new Date() },
    );

    // Log de diagnóstico (Fase 4): sin importes, sin mensaje, sin PII. El
    // user_id va hasheado; solo banderas y tamaños agregados.
    this.logger.log(
      `assistant.chat done request_id=${requestId} session_id=${session.id} status=ok ` +
        `ai_latency_ms=${aiLatencyMs} response_chars=${result.message?.length ?? 0} ` +
        `financial_context_present=${storedMetadata.financial_context_enabled === true} ` +
        `financial_context_fetch_failed=${storedMetadata.financial_context_fetch_failed === true} ` +
        `truncated=${storedMetadata.truncated === true}`,
    );

    return {
      ok: result.ok,
      message: result.message,
      session_id: session.id,
      metadata: this.toClientMetadata(storedMetadata),
    };
  }

  /**
   * Hash corto y estable del user_id para logs. No reversible sin fuerza bruta
   * del espacio de UUIDs; suficiente para correlacionar sin exponer el id real.
   */
  private hashUserId(userId: string): string {
    return createHash('sha256').update(userId).digest('hex').slice(0, 12);
  }

  /** Lista las sesiones ACTIVAS del usuario, más recientes primero. */
  async listSessions(userId: string): Promise<AssistantSessionListResponseDto> {
    const sessions = await this.sessionRepo.find({
      where: { userId, status: AssistantSessionStatus.ACTIVE },
      order: { updatedAt: 'DESC' },
    });
    return { ok: true, items: sessions.map((s) => this.toSessionDto(s)) };
  }

  /** Devuelve los mensajes de una sesión propia del usuario. */
  async getSessionMessages(
    userId: string,
    sessionId: string,
  ): Promise<AssistantSessionMessagesResponseDto> {
    const session = await this.getOwnedSessionOrFail(userId, sessionId);
    const messages = await this.messageRepo.find({
      where: { sessionId: session.id, userId },
      order: { createdAt: 'ASC' },
    });
    return {
      ok: true,
      session: {
        id: session.id,
        title: session.title,
        status: session.status,
      },
      items: messages.map((m) => this.toMessageDto(m)),
    };
  }

  /** Actualiza el título de una sesión propia. */
  async updateSession(
    userId: string,
    sessionId: string,
    dto: UpdateAssistantSessionDto,
  ): Promise<AssistantSessionItemResponseDto> {
    const session = await this.getOwnedSessionOrFail(userId, sessionId);
    if (dto.title !== undefined) {
      session.title = dto.title.trim();
    }
    const saved = await this.sessionRepo.save(session);
    return { ok: true, item: this.toSessionDto(saved) };
  }

  /** "Elimina" una sesión propia archivándola (no borra mensajes). */
  async archiveSession(
    userId: string,
    sessionId: string,
  ): Promise<{ ok: true }> {
    const session = await this.getOwnedSessionOrFail(userId, sessionId);
    if (session.status !== AssistantSessionStatus.ARCHIVED) {
      session.status = AssistantSessionStatus.ARCHIVED;
      await this.sessionRepo.save(session);
    }
    return { ok: true };
  }

  /**
   * Busca una sesión por id filtrando SIEMPRE por user_id. Si no existe o
   * pertenece a otro usuario devuelve 404 (no 403) para no filtrar existencia.
   */
  private async getOwnedSessionOrFail(
    userId: string,
    sessionId: string,
  ): Promise<AssistantSession> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, userId },
    });
    if (!session) {
      throw new NotFoundException('Assistant session not found');
    }
    return session;
  }

  private async createSession(
    userId: string,
    plan: PlanType,
    firstMessage: string,
  ): Promise<AssistantSession> {
    const session = this.sessionRepo.create({
      userId,
      title: this.buildSessionTitle(firstMessage),
      planAtCreation: plan,
      status: AssistantSessionStatus.ACTIVE,
    });
    return this.sessionRepo.save(session);
  }

  private buildSessionTitle(message: string): string {
    const trimmed = (message ?? '').trim();
    if (!trimmed) return 'Nueva conversación';
    return trimmed.length > MAX_TITLE_LENGTH
      ? `${trimmed.slice(0, MAX_TITLE_LENGTH)}…`
      : trimmed;
  }

  /**
   * Mantiene solo las claves seguras de la metadata del AI Service y garantiza
   * los flags de estado. Descarta allowed_scopes, user, email, prompt, errores
   * crudos, API keys y cualquier otra cosa no permitida.
   */
  private sanitizeAiMetadata(
    raw: Record<string, unknown> | undefined,
    fallbackRequestId: string,
  ): Record<string, unknown> {
    const source = raw ?? {};
    const clean: Record<string, unknown> = {};
    for (const key of STORABLE_METADATA_KEYS) {
      if (source[key] !== undefined) {
        clean[key] = source[key];
      }
    }
    if (clean.request_id === undefined) clean.request_id = fallbackRequestId;
    if (clean.rag_enabled === undefined) clean.rag_enabled = false;
    if (clean.financial_context_enabled === undefined) {
      clean.financial_context_enabled = false;
    }
    if (clean.investment_context_enabled === undefined) {
      clean.investment_context_enabled = false;
    }
    if (clean.financial_context_fetch_failed === undefined) {
      clean.financial_context_fetch_failed = false;
    }
    if (clean.truncated === undefined) clean.truncated = false;
    return clean;
  }

  /** Subconjunto de metadata que se expone al frontend. */
  private toClientMetadata(
    stored: Record<string, unknown>,
  ): Record<string, unknown> {
    return {
      request_id: stored.request_id,
      rag_enabled: stored.rag_enabled ?? false,
      financial_context_enabled: stored.financial_context_enabled ?? false,
      investment_context_enabled: stored.investment_context_enabled ?? false,
      // Permite al frontend avisar que la respuesta quedó incompleta y ofrecer
      // reintentar. NO se expone financial_context_fetch_failed ni finish_reason
      // (diagnóstico interno).
      truncated: stored.truncated ?? false,
    };
  }

  private toSessionDto(session: AssistantSession): AssistantSessionDto {
    return {
      id: session.id,
      title: session.title ?? null,
      status: session.status,
      plan_at_creation: session.planAtCreation,
      created_at: session.createdAt,
      updated_at: session.updatedAt,
    };
  }

  private toMessageDto(message: AssistantMessage): AssistantMessageDto {
    const dto: AssistantMessageDto = {
      id: message.id,
      role: message.role,
      content: message.content,
      created_at: message.createdAt,
    };
    if (message.metadata) {
      dto.metadata = this.toClientMetadata(message.metadata);
    }
    return dto;
  }

  private allowedScopesForPlan(plan: PlanType): KnowledgeScope[] {
    if (plan === 'premium') {
      return ['app_usage', 'finance_basic', 'finance_premium', 'user_private'];
    }
    return ['app_usage', 'finance_basic'];
  }
}
