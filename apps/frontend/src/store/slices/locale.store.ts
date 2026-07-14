import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Locale = 'es' | 'en';

type LocaleState = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: 'es',
      setLocale: (locale) => set({ locale }),
    }),
    { name: 'moni-locale' },
  ),
);
