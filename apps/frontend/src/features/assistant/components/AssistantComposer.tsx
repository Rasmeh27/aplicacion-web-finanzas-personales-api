'use client';

import { type KeyboardEvent } from 'react';
import { Loader2, Send, X } from 'lucide-react';

/**
 * Message composer. Enter sends, Shift+Enter inserts a newline. The send button
 * is disabled while a request is in flight; a Cancel button aborts it.
 */
export function AssistantComposer({
  value,
  onChange,
  onSubmit,
  onCancel,
  loading,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!loading && value.trim()) onSubmit();
    }
  };

  return (
    <div className="mt-3 flex items-end gap-2">
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        rows={2}
        placeholder="Escribe tu pregunta…  (Enter para enviar, Shift+Enter para nueva línea)"
        disabled={loading}
        className="flex-1 resize-none rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-950 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
      />
      {loading ? (
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-[52px] items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-rose-300 hover:text-rose-600"
        >
          <X className="h-4 w-4" />
          Cancelar
        </button>
      ) : (
        <button
          type="button"
          onClick={onSubmit}
          disabled={!value.trim()}
          className="inline-flex h-[52px] items-center gap-2 rounded-2xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          Enviar
        </button>
      )}
    </div>
  );
}

export function ComposerLoadingHint({ elapsedSec }: { elapsedSec: number }) {
  return (
    <div className="mt-2 flex items-center gap-2 text-xs font-medium text-slate-500">
      <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
      {elapsedSec >= 15
        ? 'Esto puede tardar un poco por el análisis con IA.'
        : 'Analizando tus datos financieros…'}
      <span className="text-slate-400">({elapsedSec}s)</span>
    </div>
  );
}
