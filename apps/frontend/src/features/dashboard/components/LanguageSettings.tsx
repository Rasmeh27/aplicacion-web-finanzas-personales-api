'use client';

import { Check, Languages } from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { useTranslation } from '@/shared/i18n/useTranslation';
import type { Locale } from '@/store/slices/locale.store';
import type { TranslationKey } from '@/shared/i18n/translations';

const LANGUAGE_OPTIONS: { value: Locale; labelKey: TranslationKey; nativeName: string }[] = [
  { value: 'es', labelKey: 'language.es', nativeName: 'Español' },
  { value: 'en', labelKey: 'language.en', nativeName: 'English' },
];

export function LanguageSettings() {
  const { t, locale, setLocale } = useTranslation();

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
          <Languages className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-base font-bold text-slate-950">{t('settings.language.title')}</h2>
          <p className="mt-1 text-sm text-slate-500">{t('settings.language.description')}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {LANGUAGE_OPTIONS.map((option) => {
          const isActive = option.value === locale;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setLocale(option.value)}
              aria-pressed={isActive}
              className={cn(
                'flex items-center justify-between rounded-2xl border px-4 py-4 text-left transition',
                isActive
                  ? 'border-indigo-300 bg-indigo-50'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
              )}
            >
              <span>
                <span className="block text-sm font-bold text-slate-950">{option.nativeName}</span>
                <span className="mt-0.5 block text-xs font-medium text-slate-500">{t(option.labelKey)}</span>
              </span>
              {isActive ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-2.5 py-1 text-[11px] font-bold text-white">
                  <Check className="h-3 w-3" />
                  {t('settings.language.active')}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
