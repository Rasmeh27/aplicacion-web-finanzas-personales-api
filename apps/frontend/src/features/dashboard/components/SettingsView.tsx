'use client';

import { useTranslation } from '@/shared/i18n/useTranslation';
import { PageHeader } from '@/shared/components/PageHeader';
import { LanguageSettings } from './LanguageSettings';

export function SettingsView() {
  const { t } = useTranslation();

  return (
    <div>
      <PageHeader title={t('settings.title')} description={t('settings.subtitle')} />

      <div className="mt-8 max-w-2xl">
        <LanguageSettings />
      </div>
    </div>
  );
}
