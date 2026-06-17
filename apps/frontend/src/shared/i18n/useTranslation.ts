'use client';

import { useLocaleStore, type Locale } from '@/store/slices/locale.store';
import { translations, type TranslationKey } from './translations';

type TranslateParams = Record<string, string | number>;

export function useTranslation() {
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);

  const t = (key: TranslationKey, params?: TranslateParams): string => {
    let value = translations[locale][key] ?? translations.es[key] ?? key;

    if (params) {
      for (const [paramKey, paramValue] of Object.entries(params)) {
        value = value.replace(`{${paramKey}}`, String(paramValue));
      }
    }

    return value;
  };

  return { t, locale, setLocale };
}

export type { Locale, TranslationKey };
