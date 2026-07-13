'use client';

import { useState } from 'react';
import { Check, Lock, Sparkles } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { useTranslation } from '@/shared/i18n/useTranslation';
import type { TranslationKey } from '@/shared/i18n/translations';
import { UpgradeModal } from '@/features/subscription/components/UpgradeModal';

const BENEFIT_KEYS: TranslationKey[] = [
  'plan.feature.investments',
  'plan.feature.portfolioAnalytics',
  'plan.feature.premiumAssistant',
  'plan.feature.concentration',
];

/**
 * Pantalla Premium bloqueada para usuarios Basic: la ruta /investments nunca
 * parece rota; muestra el valor de la función y el CTA de mejora (que no
 * autoasigna el plan).
 */
export function InvestmentsLocked() {
  const { t } = useTranslation();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  return (
    <div>
      <PageHeader title={t('investments.title')} description={t('investments.subtitle')} />

      <div className="mt-8 flex flex-col items-center rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
        <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-50 text-indigo-600">
          <Lock className="h-8 w-8" />
        </span>
        <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-950">
          {t('investments.locked.title')}
        </h2>
        <p className="mt-2 max-w-lg text-sm leading-6 text-slate-500">
          {t('investments.locked.subtitle')}
        </p>

        <div className="mt-6 w-full max-w-md rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5 text-left">
          <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">
            {t('investments.locked.benefitsTitle')}
          </p>
          <ul className="mt-3 space-y-2">
            {BENEFIT_KEYS.map((key) => (
              <li key={key} className="flex items-start gap-2 text-sm text-slate-700">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                {t(key)}
              </li>
            ))}
          </ul>
        </div>

        <button
          type="button"
          onClick={() => setUpgradeOpen(true)}
          className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-indigo-600/25 transition hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-xl"
        >
          <Sparkles className="h-4 w-4" />
          {t('plan.upgradeCta')}
        </button>
      </div>

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </div>
  );
}
