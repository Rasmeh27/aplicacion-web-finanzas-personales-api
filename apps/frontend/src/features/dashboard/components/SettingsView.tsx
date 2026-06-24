'use client';

import { useTranslation } from '@/shared/i18n/useTranslation';
import { LanguageSettings } from './LanguageSettings';

export function SettingsView() {
  const { t } = useTranslation();

  return (
    <div>
      <header>
        <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{t('settings.title')}</h1>
        <p className="mt-1 text-sm text-slate-500">{t('settings.subtitle')}</p>
      </header>

      <div className="mt-8 max-w-2xl">
        <LanguageSettings />
      </div>
    </div>
  );
}
