/**
 * Internal contract between the NestJS backend and the FastAPI AI service.
 *
 * Every authorization-relevant value here is ALWAYS derived by the backend from
 * the authenticated user (JWT, database, plans module). It must never originate
 * from the frontend.
 */

export type PlanType = 'basic' | 'premium';

export type KnowledgeScope =
  | 'app_usage'
  | 'finance_basic'
  | 'finance_premium'
  | 'user_private';

export interface AiServiceChatRequest {
  request_id: string;
  user: {
    id: string;
    email?: string;
  };
  plan: PlanType;
  allowed_scopes: KnowledgeScope[];
  message: string;
  session_id?: string;
  locale?: 'es' | 'en';
  metadata?: Record<string, unknown>;
}

export interface AiServiceChatResponse {
  ok: boolean;
  message: string;
  session_id?: string;
  metadata?: Record<string, unknown>;
}
