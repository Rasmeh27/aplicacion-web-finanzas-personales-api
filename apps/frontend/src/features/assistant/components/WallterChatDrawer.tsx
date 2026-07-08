'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Bot, MessageSquarePlus, X } from 'lucide-react';
import { useWallterStore } from '@/store/slices/wallter.store';
import { sendAssistantMessage } from '../services/assistant.service';
import { detectAssistantLeaks } from '../utils/detect-leaks';
import { AssistantMessageBubble } from './AssistantMessageBubble';
import { AssistantComposer, ComposerLoadingHint } from './AssistantComposer';
import type { AssistantSafeMetadata, ChatErrorKind, ChatMessage } from '../types';

const DEV = process.env.NODE_ENV !== 'production';

const WALLTER_INTRO =
  'Hola, soy Wallter, tu asistente financiero. Puedo ayudarte a entender tus gastos, ' +
  'crear metas, revisar tu presupuesto y responder preguntas sobre cómo usar la app. ' +
  'Para darte mejores respuestas, uso el conocimiento de la plataforma y, cuando aplica, ' +
  'un resumen seguro de tu información financiera.';

const SUGGESTED: string[] = [
  '¿Cómo registro un gasto?',
  '¿Cómo creo una meta de ahorro?',
  '¿Cómo van mis gastos este mes?',
  '¿Qué puedo hacer para ahorrar más?',
  '¿Qué es un fondo de emergencia?',
  '¿Debo tomar un préstamo para invertir?',
];

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.round(Math.random() * 1e9)}`;

const pickSafeMetadata = (metadata: unknown): AssistantSafeMetadata | undefined => {
  if (!metadata || typeof metadata !== 'object') return undefined;
  const m = metadata as Record<string, unknown>;
  return {
    request_id: typeof m.request_id === 'string' ? m.request_id : undefined,
    rag_enabled: typeof m.rag_enabled === 'boolean' ? m.rag_enabled : undefined,
    financial_context_enabled:
      typeof m.financial_context_enabled === 'boolean' ? m.financial_context_enabled : undefined,
  };
};

function classifyError(error: unknown): { kind: ChatErrorKind; httpStatus?: number; content: string } {
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED' || /timeout/i.test(error.message)) {
      return { kind: 'timeout', content: 'Wallter tardó demasiado en responder. Intenta nuevamente.' };
    }
    const status = error.response?.status;
    if (status === 401) {
      return { kind: 'http', httpStatus: 401, content: 'Tu sesión expiró. Inicia sesión nuevamente.' };
    }
    if (status === 400) {
      return {
        kind: 'http',
        httpStatus: 400,
        content: 'No pude enviar esta pregunta. Revisa el mensaje e intenta otra vez.',
      };
    }
    if (status === 503 || status === 504) {
      return {
        kind: 'http',
        httpStatus: status,
        content: 'Wallter tardó demasiado en responder. Intenta nuevamente.',
      };
    }
    if (status === 500 || status === 502) {
      return {
        kind: 'http',
        httpStatus: status,
        content: 'Wallter no está disponible ahora mismo. Intenta más tarde.',
      };
    }
    return { kind: 'network', content: 'Wallter no está disponible ahora mismo. Intenta más tarde.' };
  }
  return { kind: 'unknown', content: 'Ocurrió un error inesperado. Intenta nuevamente.' };
}

export function WallterChatDrawer() {
  const isOpen = useWallterStore((s) => s.isOpen);
  const close = useWallterStore((s) => s.close);
  const messages = useWallterStore((s) => s.messages);
  const loading = useWallterStore((s) => s.loading);
  const activeSessionId = useWallterStore((s) => s.activeSessionId);
  const appendMessage = useWallterStore((s) => s.appendMessage);
  const setLoading = useWallterStore((s) => s.setLoading);
  const setActiveSessionId = useWallterStore((s) => s.setActiveSessionId);
  const resetConversation = useWallterStore((s) => s.resetConversation);

  const [input, setInput] = useState('');
  const [elapsedSec, setElapsedSec] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, close]);

  useEffect(() => {
    if (!loading) {
      setElapsedSec(0);
      return;
    }
    const start = Date.now();
    const id = setInterval(() => setElapsedSec(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, [loading]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading, isOpen]);

  const send = async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    appendMessage({ id: newId(), role: 'user', content: trimmed });
    setLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;
    const startedAt = performance.now();

    try {
      const res = await sendAssistantMessage(
        { message: trimmed, session_id: activeSessionId ?? undefined },
        { signal: controller.signal },
      );
      const latencyMs = performance.now() - startedAt;
      if (res.session_id) setActiveSessionId(res.session_id);
      appendMessage({
        id: newId(),
        role: 'assistant',
        content: res.message ?? '',
        latencyMs,
        status: 'ok',
        metadata: pickSafeMetadata(res.metadata),
        qaFlags: detectAssistantLeaks(res.message ?? ''),
      });
    } catch (error) {
      if (axios.isCancel(error)) return; // user cancelled — no error bubble
      const latencyMs = performance.now() - startedAt;
      const classified = classifyError(error);
      appendMessage({
        id: newId(),
        role: 'assistant',
        content: classified.content,
        latencyMs,
        status: 'error',
        errorKind: classified.kind,
        httpStatus: classified.httpStatus,
        retryQuestion: trimmed,
      });
      if (classified.httpStatus === 401) router.push('/auth/login');
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  const handleSend = () => {
    const question = input;
    setInput('');
    void send(question);
  };

  const cancel = () => abortRef.current?.abort();

  const newChat = () => {
    cancel();
    resetConversation();
    setInput('');
  };

  if (!isOpen) return null;

  const isEmpty = messages.length === 0;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-[1px]" onClick={close} aria-hidden />
      <div
        role="dialog"
        aria-label="Chat con Wallter"
        className="fixed inset-y-0 right-0 z-50 flex h-full w-full flex-col bg-[#F8FAFC] shadow-2xl sm:w-[460px]"
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-600 text-white">
              <Bot className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-black tracking-tight text-slate-950">Wallter</p>
              <p className="text-[11px] font-medium text-slate-500">
                Tu asistente financiero ·{' '}
                <span className={loading ? 'text-amber-600' : 'text-emerald-600'}>
                  {loading ? 'Analizando…' : 'En línea'}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={newChat}
              title="Nuevo chat"
              className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-indigo-600"
            >
              <MessageSquarePlus className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={close}
              title="Cerrar"
              aria-label="Cerrar"
              className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Body */}
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {isEmpty ? (
            <div className="space-y-4">
              <div className="rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-700">
                {WALLTER_INTRO}
              </div>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED.map((question) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => void send(question)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-indigo-300 hover:text-indigo-700"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message: ChatMessage) => (
              <AssistantMessageBubble key={message.id} message={message} dev={DEV} onRetry={send} />
            ))
          )}

          {loading ? (
            <div className="rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-4 py-2.5">
              <ComposerLoadingHint elapsedSec={elapsedSec} />
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-white px-4 py-3">
          <AssistantComposer
            value={input}
            onChange={setInput}
            onSubmit={handleSend}
            onCancel={cancel}
            loading={loading}
          />
        </div>
      </div>
    </>
  );
}
