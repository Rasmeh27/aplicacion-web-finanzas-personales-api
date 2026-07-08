import apiClient from '@/lib/api/client';
import type {
  AssistantChatResponse,
  AssistantSession,
  AssistantSessionMessagesResponse,
  AssistantSessionsResponse,
} from '../types';

/**
 * Client-side timeout for a single assistant turn. Kept ABOVE the backend's
 * gateway timeout to the ai-service (AI_SERVICE_TIMEOUT_MS, 60s) so we normally
 * receive the backend's controlled 503 instead of aborting first.
 */
export const ASSISTANT_TIMEOUT_MS = 75_000;

/**
 * Whitelist for the chat body. The frontend may send ONLY `message` and an
 * optional `session_id`. user_id / plan / allowed_scopes / email / metadata are
 * resolved server-side and MUST NOT originate here — this helper makes that
 * guarantee explicit and unit-testable.
 */
export function buildChatBody(
  message: string,
  sessionId?: string,
): { message: string; session_id?: string } {
  const body: { message: string; session_id?: string } = { message };
  if (sessionId) body.session_id = sessionId;
  return body;
}

export type SendOptions = { signal?: AbortSignal };

/**
 * Send a message to the assistant THROUGH THE BACKEND (never the ai-service
 * directly). Auth (Bearer JWT), base URL and 401-refresh are handled by the
 * shared `apiClient`.
 */
export async function sendAssistantMessage(
  payload: { message: string; session_id?: string },
  options?: SendOptions,
): Promise<AssistantChatResponse> {
  const { data } = await apiClient.post<AssistantChatResponse>(
    '/assistant/chat',
    buildChatBody(payload.message, payload.session_id),
    { timeout: ASSISTANT_TIMEOUT_MS, signal: options?.signal },
  );
  return data;
}

/** Backwards-compatible helper used by the simpler /ai-assistant QA screen. */
export async function askAssistant(
  question: string,
  sessionId?: string,
  options?: SendOptions,
): Promise<AssistantChatResponse> {
  return sendAssistantMessage({ message: question, session_id: sessionId }, options);
}

export async function listAssistantSessions(): Promise<AssistantSession[]> {
  const { data } = await apiClient.get<AssistantSessionsResponse>('/assistant/sessions');
  return data.items ?? [];
}

export async function getAssistantMessages(
  sessionId: string,
): Promise<AssistantSessionMessagesResponse> {
  const { data } = await apiClient.get<AssistantSessionMessagesResponse>(
    `/assistant/sessions/${sessionId}/messages`,
  );
  return data;
}

export async function updateAssistantSessionTitle(
  sessionId: string,
  title: string,
): Promise<void> {
  await apiClient.patch(`/assistant/sessions/${sessionId}`, { title });
}

export async function archiveAssistantSession(sessionId: string): Promise<void> {
  await apiClient.delete(`/assistant/sessions/${sessionId}`);
}

export const assistantService = {
  ask: askAssistant,
  sendAssistantMessage,
  listAssistantSessions,
  getAssistantMessages,
  updateAssistantSessionTitle,
  archiveAssistantSession,
};
