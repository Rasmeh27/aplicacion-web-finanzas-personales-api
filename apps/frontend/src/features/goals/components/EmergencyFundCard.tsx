'use client';

import { ShieldCheck } from 'lucide-react';
import { formatCurrency } from '@/shared/utils/format-currency';
import type { EmergencyFundInfo } from '../types';

type Props = {
  info: EmergencyFundInfo;
  currency: string;
  onConfigure: () => void;
};

/**
 * Card del Fondo de emergencia cuando todavía no está creado como meta.
 * - suggested: muestra el monto sugerido (3 meses de gastos) editable.
 * - unavailable: invita a configurarlo manualmente (sin inventar un monto).
 */
export function EmergencyFundCard({ info, currency, onConfigure }: Props) {
  const isSuggested = info.status === 'suggested' && info.suggestedTargetAmount;

  return (
    <div className="rounded-3xl border border-dashed border-indigo-200 bg-indigo-50/40 p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black tracking-tight text-slate-950">
                Fondo de emergencia
              </h3>
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
                Sugerida
              </span>
            </div>
            {isSuggested ? (
              <p className="mt-1 text-sm text-slate-600">
                Te sugerimos ahorrar{' '}
                <span className="font-bold text-slate-900">
                  {formatCurrency(info.suggestedTargetAmount as number, currency)}
                </span>{' '}
                ({info.monthsCovered} meses de tus gastos estimados).
              </p>
            ) : (
              <p className="mt-1 max-w-md text-sm text-slate-600">
                Aún no tenemos datos suficientes para sugerir un monto. Configura tu fondo de
                emergencia con la meta que prefieras.
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onConfigure}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-sm shadow-indigo-600/25 transition hover:bg-indigo-700"
        >
          Configurar fondo
        </button>
      </div>
    </div>
  );
}
