'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { AssistantDebugPanel } from './AssistantDebugPanel';
import { AssistantMarkdownMessage } from './AssistantMarkdownMessage';
import type { ChatMessage } from '../types';

const seconds = (ms?: number) => (ms == null ? '' : `${(ms / 1000).toFixed(1)}s`);

export function AssistantMessageBubble({
  message,
  dev,
  onRetry,
}: {
  message: ChatMessage;
  dev: boolean;
  onRetry: (question: string) => void;
}) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white">
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>
      </div>
    );
  }

  const isError = message.status === 'error';
  const isTruncated = !isError && message.metadata?.truncated === true;
  const flags = message.qaFlags ?? [];

  return (
    <div className="flex flex-col items-start gap-1.5">
      <div
        className={cn(
          'max-w-[90%] rounded-2xl rounded-bl-sm border px-4 py-3 text-sm',
          isError
            ? 'border-rose-200 bg-rose-50 text-rose-700'
            : 'border-slate-200 bg-white text-slate-800',
        )}
      >
        {isError ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : (
          <AssistantMarkdownMessage content={message.content} />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 pl-1">
        {message.latencyMs != null ? (
          <span className={cn('text-[11px] font-semibold', isError ? 'text-rose-500' : 'text-slate-400')}>
            {isError
              ? `Error ${message.httpStatus ?? '(timeout)'} después de ${seconds(message.latencyMs)}`
              : `Respondido en ${seconds(message.latencyMs)}`}
          </span>
        ) : null}

        {(isError || isTruncated) && message.retryQuestion ? (
          <button
            type="button"
            onClick={() => onRetry(message.retryQuestion as string)}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border bg-white px-2 py-0.5 text-[11px] font-semibold transition',
              isError
                ? 'border-rose-200 text-rose-600 hover:bg-rose-50'
                : 'border-amber-300 text-amber-700 hover:bg-amber-50',
            )}
          >
            <RefreshCw className="h-3 w-3" />
            Reintentar
          </button>
        ) : null}
      </div>

      {isTruncated ? (
        <div className="flex items-start gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-700">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>La respuesta quedó incompleta. Puedes reintentar para verla completa.</span>
        </div>
      ) : null}

      {dev && flags.length > 0 ? (
        <div className="flex items-start gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-700">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>QA warning: posible fuga — {flags.join(', ')}</span>
        </div>
      ) : null}

      {dev && !isError ? (
        <AssistantDebugPanel
          metadata={message.metadata}
          latencyMs={message.latencyMs}
        />
      ) : null}
    </div>
  );
}
