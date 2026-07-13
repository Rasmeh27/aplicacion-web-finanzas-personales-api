'use client';

import { ArrowUpRight, Check, Sparkles } from 'lucide-react';
import { Modal } from '@/shared/components/Modal';
import { useTranslation } from '@/shared/i18n/useTranslation';
import type { TranslationKey } from '@/shared/i18n/translations';

const PREMIUM_FEATURE_KEYS: TranslationKey[] = [
  'plan.feature.investments',
  'plan.feature.portfolioAnalytics',
  'plan.feature.premiumAssistant',
  'plan.feature.concentration',
];

type UpgradeModalProps = {
  open: boolean;
  onClose: () => void;
};

/**
 * CTA reutilizable de mejora de cuenta (Configuración, Inversiones bloqueadas
 * y futuros CTA Premium).
 *
 * Seguridad: este modal NUNCA cambia el plan. Si existe
 * NEXT_PUBLIC_PREMIUM_CHECKOUT_URL redirige al checkout externo; si no,
 * comunica claramente que el pago aún no está habilitado.
 */
export function UpgradeModal({ open, onClose }: UpgradeModalProps) {
  const { t } = useTranslation();
  const checkoutUrl = process.env.NEXT_PUBLIC_PREMIUM_CHECKOUT_URL;

  const goToCheckout = () => {
    if (checkoutUrl) window.location.assign(checkoutUrl);
  };

  return (
    <Modal open={open} title={t('upgrade.title')} description={t('upgrade.subtitle')} onClose={onClose}>
      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <Sparkles className="h-4 w-4" />
          </span>
          <p className="text-sm font-black tracking-tight text-slate-950">
            {t('plan.premiumName')}
          </p>
        </div>
        <ul className="mt-3 space-y-2">
          {PREMIUM_FEATURE_KEYS.map((key) => (
            <li key={key} className="flex items-start gap-2 text-sm text-slate-700">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              {t(key)}
            </li>
          ))}
        </ul>
      </div>

      {!checkoutUrl ? (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-medium text-amber-800">
          {t('upgrade.checkoutUnavailable')}
          {process.env.NODE_ENV !== 'production' ? (
            <span className="mt-1 block text-amber-700/80">{t('upgrade.devHint')}</span>
          ) : null}
        </p>
      ) : null}

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          {t('upgrade.close')}
        </button>
        {checkoutUrl ? (
          <button
            type="button"
            onClick={goToCheckout}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700"
          >
            {t('upgrade.goToCheckout')}
            <ArrowUpRight className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </Modal>
  );
}
