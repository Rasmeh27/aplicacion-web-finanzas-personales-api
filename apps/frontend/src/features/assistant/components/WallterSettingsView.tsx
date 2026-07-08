'use client';

import { Bot, Info, MessageCircle, ShieldCheck, Sparkles } from 'lucide-react';
import { useWallterStore } from '@/store/slices/wallter.store';

/**
 * Wallter settings/landing page (route /ai-assistant). This section is NO LONGER
 * the chat — the conversation lives in the global floating bubble/drawer. Here we
 * only describe Wallter, show privacy info and offer a shortcut to open the chat.
 * No fake controls are rendered until real configuration exists.
 */
export function WallterSettingsView() {
  const openChat = useWallterStore((s) => s.open);

  return (
    <div>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-600 text-white">
              <Bot className="h-5 w-5" />
            </span>
            Wallter
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Configura cómo quieres usar tu asistente financiero.
          </p>
        </div>
        <button
          type="button"
          onClick={openChat}
          className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
        >
          <MessageCircle className="h-4 w-4" />
          Abrir chat con Wallter
        </button>
      </header>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <Sparkles className="h-5 w-5" />
          </span>
          <p className="mt-4 text-sm font-semibold text-slate-900">Estado del asistente</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-500">
            <li>
              Conocimiento de la app: <span className="font-semibold text-emerald-600">activo</span>
            </li>
            <li>
              Resumen financiero personal:{' '}
              <span className="font-semibold text-emerald-600">activo</span>
            </li>
          </ul>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <p className="mt-4 text-sm font-semibold text-slate-900">Privacidad</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-500">
            <li>Wallter usa resúmenes financieros agregados, no transacciones crudas.</li>
            <li>No compartas contraseñas, claves ni datos sensibles en el chat.</li>
            <li>Wallter no reemplaza la asesoría de un profesional financiero.</li>
          </ul>
        </div>
      </div>

      <div className="mt-4 flex items-start gap-3 rounded-3xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
          <Info className="h-5 w-5" />
        </span>
        <div>
          <p className="font-semibold text-slate-900">Configuración próximamente</p>
          <p className="mt-1">
            Pronto podrás ajustar preferencias de Wallter desde aquí. Por ahora, abre el chat con el
            botón flotante en la esquina inferior derecha o el botón de arriba.
          </p>
        </div>
      </div>
    </div>
  );
}
