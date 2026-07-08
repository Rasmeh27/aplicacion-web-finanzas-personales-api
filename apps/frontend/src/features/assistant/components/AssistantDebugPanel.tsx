'use client';

import type { AssistantSafeMetadata } from '../types';

/**
 * Dev-only panel with SAFE fields the backend exposes + client-side latency.
 * NEVER renders user_id, plan, allowed_scopes, chunks, prompts, raw financial
 * context or provider/model (the backend does not expose those to the client).
 */
export function AssistantDebugPanel({
  metadata,
  latencyMs,
  httpStatus,
}: {
  metadata?: AssistantSafeMetadata;
  latencyMs?: number;
  httpStatus?: number;
}) {
  return (
    <details className="w-full max-w-[85%] rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-500">
      <summary className="cursor-pointer font-semibold text-slate-500">Debug (dev)</summary>
      <ul className="mt-1.5 space-y-0.5">
        <li>
          <span className="font-mono">request_id</span>: {metadata?.request_id ?? '—'}
        </li>
        <li>
          <span className="font-mono">rag_enabled</span>: {String(metadata?.rag_enabled ?? '—')}
        </li>
        <li>
          <span className="font-mono">financial_context_enabled</span>:{' '}
          {String(metadata?.financial_context_enabled ?? '—')}
        </li>
        <li>
          <span className="font-mono">latency_ms</span>:{' '}
          {latencyMs != null ? Math.round(latencyMs) : '—'}
        </li>
        {httpStatus != null ? (
          <li>
            <span className="font-mono">http_status</span>: {httpStatus}
          </li>
        ) : null}
      </ul>
    </details>
  );
}
