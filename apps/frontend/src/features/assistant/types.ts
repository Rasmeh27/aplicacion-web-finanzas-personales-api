/** Assistant types. The frontend talks ONLY to the backend (never the ai-service). */

/** Safe metadata the backend exposes to the frontend (never secrets/PII). */
export type AssistantSafeMetadata = {
  request_id?: string;
  rag_enabled?: boolean;
  financial_context_enabled?: boolean;
};

/** Response shape of `POST /api/v1/assistant/chat` (backend -> frontend). */
export type AssistantChatResponse = {
  ok: boolean;
  message: string;
  session_id?: string;
  metadata?: AssistantSafeMetadata & Record<string, unknown>;
};

export type AssistantSessionStatus = 'active' | 'archived';

/** A persisted chat session (from `GET /assistant/sessions`). */
export type AssistantSession = {
  id: string;
  title: string | null;
  status: AssistantSessionStatus;
  plan_at_creation?: 'basic' | 'premium';
  created_at: string;
  updated_at: string;
};

export type AssistantSessionsResponse = { ok: boolean; items: AssistantSession[] };

/** A persisted message (from `GET /assistant/sessions/:id/messages`). */
export type AssistantHistoryMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: AssistantSafeMetadata;
  created_at: string;
};

export type AssistantSessionMessagesResponse = {
  ok: boolean;
  session: { id: string; title: string | null; status: AssistantSessionStatus };
  items: AssistantHistoryMessage[];
};

export type ChatRole = 'user' | 'assistant';

export type ChatErrorKind = 'timeout' | 'http' | 'network' | 'aborted' | 'unknown';

/** One rendered chat turn kept in local component state. */
export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  /** Round-trip latency measured in the browser (ms). */
  latencyMs?: number;
  status?: 'ok' | 'error';
  errorKind?: ChatErrorKind;
  httpStatus?: number;
  /** Safe metadata for the collapsible debug panel. */
  metadata?: AssistantSafeMetadata;
  /** QA leak flags detected in the assistant text (non-blocking). */
  qaFlags?: string[];
  /** For error turns: the original question, so the user can retry it. */
  retryQuestion?: string;
};
