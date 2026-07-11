'use client';

import { Bot, Info, MessageCircle, ShieldCheck, Sparkles } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
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
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
              <Bot className="h-5 w-5" />
            </span>
            Wallter
          </span>
        }
        description="Configura cómo quieres usar tu asistente financiero."
        action={
        <button
          type="button"
          onClick={openChat}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-indigo-600/25 transition hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-600/25 sm:w-auto"
        >
          <MessageCircle className="h-4 w-4" />
          Abrir chat con Wallter
        </button>
        }
      />

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
