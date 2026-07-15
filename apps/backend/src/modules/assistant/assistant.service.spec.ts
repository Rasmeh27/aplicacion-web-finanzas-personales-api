import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Repository } from 'typeorm';
import { AiServiceClient } from './clients/ai-service.client';
import { AssistantService } from './assistant.service';
import {
  AssistantMessage,
  AssistantMessageRole,
} from './entities/assistant-message.entity';
import {
  AssistantSession,
  AssistantSessionStatus,
} from './entities/assistant-session.entity';
import {
  AiServiceChatRequest,
  AiServiceChatResponse,
} from './types/ai-service-contract.types';
import {
  ResolvedUserPlan,
  UserPlanService,
} from '../subscriptions/user-plan.service';

const USER_A = '550e8400-e29b-41d4-a716-446655440000';
const USER_B = '550e8400-e29b-41d4-a716-4466554400ff';
const SESSION_ID = '11111111-1111-4111-8111-111111111111';

const BASIC_SCOPES = ['app_usage', 'finance_basic'];
const PREMIUM_SCOPES = [
  'app_usage',
  'finance_basic',
  'finance_premium',
  'user_private',
];

type ChatFn = (payload: AiServiceChatRequest) => Promise<AiServiceChatResponse>;
type ResolvePlanFn = (userId: string) => Promise<ResolvedUserPlan>;

function aiResponse(overrides: Record<string, unknown> = {}): AiServiceChatResponse {
  return {
    ok: true,
    message: 'Respuesta generada por la IA.',
    session_id: SESSION_ID,
    metadata: {
      request_id: 'ai-req-1',
      plan: 'basic',
      allowed_scopes: ['app_usage', 'finance_basic'],
      llm_provider: 'mock',
      llm_model: 'mock-llm',
      rag_enabled: false,
      financial_context_enabled: false,
      ...overrides,
    },
  };
}

describe('AssistantService (persistence)', () => {
  let service: AssistantService;
  let sessionRepo: Repository<AssistantSession>;
  let messageRepo: Repository<AssistantMessage>;
  let aiService: { chat: jest.Mock<ChatFn> };
  let userPlan: { resolveUserPlan: jest.Mock<ResolvePlanFn> };

  beforeEach(async () => {
    aiService = { chat: jest.fn<ChatFn>() };
    userPlan = { resolveUserPlan: jest.fn<ResolvePlanFn>() };
    // Por defecto, plan basic (source default). Cada test puede sobreescribirlo.
    userPlan.resolveUserPlan.mockResolvedValue({ plan: 'basic', source: 'default' });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssistantService,
        { provide: AiServiceClient, useValue: aiService },
        { provide: UserPlanService, useValue: userPlan },
        {
          provide: getRepositoryToken(AssistantSession),
          useValue: {
            create: jest.fn((data: Partial<AssistantSession>) => data),
            save: jest.fn((session: Partial<AssistantSession>) => ({
              id: session.id ?? SESSION_ID,
              createdAt: new Date('2026-07-06T00:00:00.000Z'),
              updatedAt: new Date('2026-07-06T00:00:00.000Z'),
              ...session,
            })),
            findOne: jest.fn(),
            find: jest.fn(),
            update: jest.fn(() => ({ affected: 1 })),
          },
        },
        {
          provide: getRepositoryToken(AssistantMessage),
          useValue: {
            create: jest.fn((data: Partial<AssistantMessage>) => data),
            save: jest.fn((message: Partial<AssistantMessage>) => ({
              id: `msg-${message.role}`,
              createdAt: new Date('2026-07-06T00:00:00.000Z'),
              ...message,
            })),
            find: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AssistantService>(AssistantService);
    sessionRepo = module.get(getRepositoryToken(AssistantSession));
    messageRepo = module.get(getRepositoryToken(AssistantMessage));
  });

  describe('chat', () => {
    it('crea una nueva sesion cuando no se envia session_id', async () => {
      aiService.chat.mockResolvedValue(aiResponse());

      const result = await service.chat(USER_A, 'a@example.com', {
        message: 'Quiero organizar mis gastos este mes',
      });

      expect(sessionRepo.create).toHaveBeenCalledWith({
        userId: USER_A,
        title: 'Quiero organizar mis gastos este mes',
        planAtCreation: 'basic',
        status: AssistantSessionStatus.ACTIVE,
      });
      expect(sessionRepo.save).toHaveBeenCalled();
      expect(result.session_id).toBe(SESSION_ID);
      expect(result.ok).toBe(true);
    });

    it('reutiliza la sesion existente del mismo usuario', async () => {
      jest.spyOn(sessionRepo, 'findOne').mockResolvedValue({
        id: SESSION_ID,
        userId: USER_A,
        title: 'Existente',
        planAtCreation: 'basic',
        status: AssistantSessionStatus.ACTIVE,
      } as AssistantSession);
      aiService.chat.mockResolvedValue(aiResponse());

      const result = await service.chat(USER_A, undefined, {
        message: 'Segundo mensaje',
        session_id: SESSION_ID,
      });

      expect(sessionRepo.findOne).toHaveBeenCalledWith({
        where: { id: SESSION_ID, userId: USER_A },
      });
      expect(sessionRepo.create).not.toHaveBeenCalled();
      expect(result.session_id).toBe(SESSION_ID);
    });

    it('rechaza con 404 un session_id inexistente', async () => {
      jest.spyOn(sessionRepo, 'findOne').mockResolvedValue(null);

      await expect(
        service.chat(USER_A, undefined, {
          message: 'hola',
          session_id: SESSION_ID,
        }),
      ).rejects.toThrow(NotFoundException);
      expect(messageRepo.save).not.toHaveBeenCalled();
    });

    it('rechaza con 404 (no 403) la sesion de otro usuario', async () => {
      // El repo filtra por { id, userId }; la sesion de otro usuario no matchea.
      jest.spyOn(sessionRepo, 'findOne').mockResolvedValue(null);

      await expect(
        service.chat(USER_B, undefined, {
          message: 'hola',
          session_id: SESSION_ID,
        }),
      ).rejects.toThrow(NotFoundException);
      expect(sessionRepo.findOne).toHaveBeenCalledWith({
        where: { id: SESSION_ID, userId: USER_B },
      });
    });

    it('guarda mensaje user y assistant cuando el ai-service responde OK', async () => {
      aiService.chat.mockResolvedValue(aiResponse());

      await service.chat(USER_A, 'a@example.com', { message: 'hola' });

      expect(messageRepo.save).toHaveBeenCalledTimes(2);
      expect(messageRepo.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          userId: USER_A,
          role: AssistantMessageRole.USER,
          content: 'hola',
        }),
      );
      expect(messageRepo.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          userId: USER_A,
          role: AssistantMessageRole.ASSISTANT,
          content: 'Respuesta generada por la IA.',
        }),
      );
    });

    it('no guarda respuesta assistant si el ai-service falla', async () => {
      aiService.chat.mockRejectedValue(
        new ServiceUnavailableException('AI service is unavailable'),
      );

      await expect(
        service.chat(USER_A, undefined, { message: 'hola' }),
      ).rejects.toThrow(ServiceUnavailableException);

      // Solo se guardo el mensaje del usuario.
      expect(messageRepo.save).toHaveBeenCalledTimes(1);
      expect(messageRepo.create).toHaveBeenCalledTimes(1);
      expect(messageRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: AssistantMessageRole.USER }),
      );
      expect(sessionRepo.update).not.toHaveBeenCalled();
    });

    it('sanitiza la metadata: guarda solo campos seguros y expone menos al frontend', async () => {
      aiService.chat.mockResolvedValue(
        aiResponse({ user: { id: USER_A }, email: 'a@example.com' }),
      );

      const result = await service.chat(USER_A, 'a@example.com', {
        message: 'hola',
      });

      // Metadata persistida en el mensaje assistant (2da llamada a create).
      const assistantCreateArg = (messageRepo.create as unknown as jest.Mock).mock
        .calls[1][0] as Partial<AssistantMessage>;
      const storedMeta = assistantCreateArg.metadata as Record<string, unknown>;

      expect(storedMeta).toEqual({
        request_id: 'ai-req-1',
        rag_enabled: false,
        financial_context_enabled: false,
        investment_context_enabled: false,
        financial_context_fetch_failed: false,
        truncated: false,
        llm_provider: 'mock',
        llm_model: 'mock-llm',
      });
      // Nunca se persisten estos campos.
      expect(storedMeta).not.toHaveProperty('allowed_scopes');
      expect(storedMeta).not.toHaveProperty('plan');
      expect(storedMeta).not.toHaveProperty('user');
      expect(storedMeta).not.toHaveProperty('email');

      // Al frontend se expone un subconjunto aun mas reducido (+ truncated para
      // avisar respuestas incompletas). NUNCA financial_context_fetch_failed.
      expect(result.metadata).toEqual({
        request_id: 'ai-req-1',
        rag_enabled: false,
        financial_context_enabled: false,
        investment_context_enabled: false,
        truncated: false,
      });
      expect(result.metadata).not.toHaveProperty('llm_provider');
      expect(result.metadata).not.toHaveProperty('allowed_scopes');
      expect(result.metadata).not.toHaveProperty('financial_context_fetch_failed');
      expect(result.metadata).not.toHaveProperty('finish_reason');
    });

    it('propaga truncated al frontend cuando el ai-service marca la respuesta cortada', async () => {
      aiService.chat.mockResolvedValue(
        aiResponse({
          financial_context_enabled: true,
          truncated: true,
          finish_reason: 'length',
        }),
      );

      const result = await service.chat(USER_A, undefined, { message: 'hola' });

      // El frontend recibe truncated=true para avisar y ofrecer reintentar.
      expect(result.metadata.truncated).toBe(true);
      // finish_reason es diagnóstico interno: se persiste pero no se expone.
      expect(result.metadata).not.toHaveProperty('finish_reason');

      const assistantCreateArg = (messageRepo.create as unknown as jest.Mock).mock
        .calls[1][0] as Partial<AssistantMessage>;
      const storedMeta = assistantCreateArg.metadata as Record<string, unknown>;
      expect(storedMeta.truncated).toBe(true);
      expect(storedMeta.finish_reason).toBe('length');
    });

    it('persiste financial_context_fetch_failed pero NO lo expone al frontend', async () => {
      aiService.chat.mockResolvedValue(
        aiResponse({
          financial_context_enabled: false,
          financial_context_fetch_failed: true,
        }),
      );

      const result = await service.chat(USER_A, undefined, {
        message: '¿Cómo ves mis finanzas?',
      });

      const assistantCreateArg = (messageRepo.create as unknown as jest.Mock).mock
        .calls[1][0] as Partial<AssistantMessage>;
      const storedMeta = assistantCreateArg.metadata as Record<string, unknown>;
      expect(storedMeta.financial_context_fetch_failed).toBe(true);
      // El frontend nunca ve la causa interna del fallo.
      expect(result.metadata).not.toHaveProperty('financial_context_fetch_failed');
    });

    it('no incluye user_id en el payload de logs (hash) ni en la respuesta', async () => {
      aiService.chat.mockResolvedValue(aiResponse());

      const result = await service.chat(USER_A, 'a@example.com', { message: 'hola' });

      // El id real del usuario no viaja en la metadata expuesta.
      expect(JSON.stringify(result.metadata)).not.toContain(USER_A);
      // El payload al ai-service sí lleva el id (contrato interno), pero el email
      // se resuelve en backend; el frontend nunca los envió.
      const payload = aiService.chat.mock.calls[0][0];
      expect(payload.user.id).toBe(USER_A);
    });

    it('cuando el resolver devuelve basic, el ai-service recibe scopes basic', async () => {
      userPlan.resolveUserPlan.mockResolvedValue({ plan: 'basic', source: 'default' });
      aiService.chat.mockResolvedValue(aiResponse());

      await service.chat(USER_A, undefined, { message: 'hola' });

      const payload = aiService.chat.mock.calls[0][0];
      expect(payload.plan).toBe('basic');
      expect(payload.allowed_scopes).toEqual(BASIC_SCOPES);
      // Nueva sesion guarda el plan resuelto.
      expect(sessionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ planAtCreation: 'basic' }),
      );
    });

    it('cuando el resolver devuelve premium, el ai-service recibe scopes premium', async () => {
      userPlan.resolveUserPlan.mockResolvedValue({
        plan: 'premium',
        source: 'subscription',
        subscription_id: 'sub-1',
      });
      aiService.chat.mockResolvedValue(aiResponse({ plan: 'premium' }));

      await service.chat(USER_A, undefined, { message: 'hola' });

      const payload = aiService.chat.mock.calls[0][0];
      expect(payload.plan).toBe('premium');
      expect(payload.allowed_scopes).toEqual(PREMIUM_SCOPES);
      expect(sessionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ planAtCreation: 'premium' }),
      );
    });

    it('sesion existente conserva plan_at_creation pero usa el plan ACTUAL del usuario', async () => {
      // La sesion fue creada como basic; el usuario ahora es premium.
      jest.spyOn(sessionRepo, 'findOne').mockResolvedValue({
        id: SESSION_ID,
        userId: USER_A,
        title: 'Existente',
        planAtCreation: 'basic',
        status: AssistantSessionStatus.ACTIVE,
      } as AssistantSession);
      userPlan.resolveUserPlan.mockResolvedValue({
        plan: 'premium',
        source: 'subscription',
        subscription_id: 'sub-1',
      });
      aiService.chat.mockResolvedValue(aiResponse({ plan: 'premium' }));

      await service.chat(USER_A, undefined, {
        message: 'segundo mensaje',
        session_id: SESSION_ID,
      });

      // No se recrea la sesion: plan_at_creation queda intacto.
      expect(sessionRepo.create).not.toHaveBeenCalled();
      // Pero el request al ai-service usa el plan actual (premium).
      const payload = aiService.chat.mock.calls[0][0];
      expect(payload.plan).toBe('premium');
      expect(payload.allowed_scopes).toEqual(PREMIUM_SCOPES);
    });
  });

  describe('listSessions', () => {
    it('devuelve solo sesiones activas del usuario ordenadas por updated_at DESC', async () => {
      jest.spyOn(sessionRepo, 'find').mockResolvedValue([
        {
          id: SESSION_ID,
          userId: USER_A,
          title: 'Mi sesion',
          planAtCreation: 'basic',
          status: AssistantSessionStatus.ACTIVE,
          createdAt: new Date('2026-07-06T00:00:00.000Z'),
          updatedAt: new Date('2026-07-06T00:00:00.000Z'),
        } as AssistantSession,
      ]);

      const result = await service.listSessions(USER_A);

      expect(sessionRepo.find).toHaveBeenCalledWith({
        where: { userId: USER_A, status: AssistantSessionStatus.ACTIVE },
        order: { updatedAt: 'DESC' },
      });
      expect(result.ok).toBe(true);
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual({
        id: SESSION_ID,
        title: 'Mi sesion',
        status: 'active',
        plan_at_creation: 'basic',
        created_at: new Date('2026-07-06T00:00:00.000Z'),
        updated_at: new Date('2026-07-06T00:00:00.000Z'),
      });
    });
  });

  describe('getSessionMessages', () => {
    it('devuelve mensajes solo de una sesion propia', async () => {
      jest.spyOn(sessionRepo, 'findOne').mockResolvedValue({
        id: SESSION_ID,
        userId: USER_A,
        title: 'Mi sesion',
        status: AssistantSessionStatus.ACTIVE,
      } as AssistantSession);
      jest.spyOn(messageRepo, 'find').mockResolvedValue([
        {
          id: 'm1',
          role: AssistantMessageRole.USER,
          content: 'hola',
          createdAt: new Date('2026-07-06T00:00:00.000Z'),
          metadata: null,
        } as unknown as AssistantMessage,
        {
          id: 'm2',
          role: AssistantMessageRole.ASSISTANT,
          content: 'respuesta',
          createdAt: new Date('2026-07-06T00:00:01.000Z'),
          metadata: {
            request_id: 'ai-req-1',
            rag_enabled: false,
            financial_context_enabled: false,
            llm_provider: 'mock',
            llm_model: 'mock-llm',
          },
        } as unknown as AssistantMessage,
      ]);

      const result = await service.getSessionMessages(USER_A, SESSION_ID);

      expect(messageRepo.find).toHaveBeenCalledWith({
        where: { sessionId: SESSION_ID, userId: USER_A },
        order: { createdAt: 'ASC' },
      });
      expect(result.session).toEqual({
        id: SESSION_ID,
        title: 'Mi sesion',
        status: 'active',
      });
      expect(result.items[0]).toEqual({
        id: 'm1',
        role: 'user',
        content: 'hola',
        created_at: new Date('2026-07-06T00:00:00.000Z'),
      });
      // El mensaje assistant expone solo metadata segura (sin provider/model).
      expect(result.items[1].metadata).toEqual({
        request_id: 'ai-req-1',
        rag_enabled: false,
        financial_context_enabled: false,
        investment_context_enabled: false,
        truncated: false,
      });
    });

    it('rechaza con 404 los mensajes de una sesion ajena/inexistente', async () => {
      jest.spyOn(sessionRepo, 'findOne').mockResolvedValue(null);

      await expect(
        service.getSessionMessages(USER_B, SESSION_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateSession', () => {
    it('permite cambiar el titulo solo de la sesion propia', async () => {
      jest.spyOn(sessionRepo, 'findOne').mockResolvedValue({
        id: SESSION_ID,
        userId: USER_A,
        title: 'Viejo',
        planAtCreation: 'basic',
        status: AssistantSessionStatus.ACTIVE,
        createdAt: new Date('2026-07-06T00:00:00.000Z'),
        updatedAt: new Date('2026-07-06T00:00:00.000Z'),
      } as AssistantSession);

      const result = await service.updateSession(USER_A, SESSION_ID, {
        title: 'Nuevo titulo',
      });

      expect(sessionRepo.findOne).toHaveBeenCalledWith({
        where: { id: SESSION_ID, userId: USER_A },
      });
      expect(sessionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: SESSION_ID, title: 'Nuevo titulo' }),
      );
      expect(result.item.title).toBe('Nuevo titulo');
    });

    it('rechaza con 404 actualizar una sesion ajena', async () => {
      jest.spyOn(sessionRepo, 'findOne').mockResolvedValue(null);

      await expect(
        service.updateSession(USER_B, SESSION_ID, { title: 'x' }),
      ).rejects.toThrow(NotFoundException);
      expect(sessionRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('archiveSession', () => {
    it('archiva solo la sesion propia', async () => {
      jest.spyOn(sessionRepo, 'findOne').mockResolvedValue({
        id: SESSION_ID,
        userId: USER_A,
        title: 'Mi sesion',
        planAtCreation: 'basic',
        status: AssistantSessionStatus.ACTIVE,
      } as AssistantSession);

      const result = await service.archiveSession(USER_A, SESSION_ID);

      expect(sessionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: SESSION_ID,
          status: AssistantSessionStatus.ARCHIVED,
        }),
      );
      expect(result).toEqual({ ok: true });
    });

    it('rechaza con 404 archivar una sesion ajena', async () => {
      jest.spyOn(sessionRepo, 'findOne').mockResolvedValue(null);

      await expect(service.archiveSession(USER_B, SESSION_ID)).rejects.toThrow(
        NotFoundException,
      );
      expect(sessionRepo.save).not.toHaveBeenCalled();
    });
  });
});
