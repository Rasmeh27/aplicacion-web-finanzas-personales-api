'use client';

import { Sparkles } from 'lucide-react';
import { useTranslation } from '@/shared/i18n/useTranslation';
import type { TranslationKey } from '@/shared/i18n/translations';

export function ComingSoon({ titleKey }: { titleKey: TranslationKey }) {
  const { t } = useTranslation();
  const title = t(titleKey);

  return (
    <div>
      <header>
        <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{t('comingSoon.subtitle')}</p>
      </header>

      <div className="mt-8 flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
          <Sparkles className="h-6 w-6" />
        </span>
        <p className="text-sm font-medium text-slate-500">{t('comingSoon.working', { section: title })}</p>
      </div>
    </div>
  );
}
