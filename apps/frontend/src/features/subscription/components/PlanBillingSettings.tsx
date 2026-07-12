'use client';

import { useEffect, useState } from 'react';
import { BadgeCheck, Check, CreditCard, Sparkles } from 'lucide-react';
import { useTranslation } from '@/shared/i18n/useTranslation';
import type { TranslationKey } from '@/shared/i18n/translations';
import { useLocaleStore } from '@/store/slices/locale.store';
import { useSubscriptionStore } from '@/store/slices/subscription.store';
import { UpgradeModal } from './UpgradeModal';

const PREMIUM_FEATURE_KEYS: TranslationKey[] = [
  'plan.feature.investments',
  'plan.feature.portfolioAnalytics',
  'plan.feature.premiumAssistant',
  'plan.feature.concentration',
];

const STATUS_KEY: Record<string, TranslationKey> = {
  active: 'plan.status.active',
  trialing: 'plan.status.trialing',
  past_due: 'plan.status.past_due',
  canceled: 'plan.status.canceled',
  expired: 'plan.status.expired',
};

/** Sección "Plan y facturación" de Configuración. */
export function PlanBillingSettings() {
  const { t } = useTranslation();
  const locale = useLocaleStore((state) => state.locale);
  const subscription = useSubscriptionStore((state) => state.subscription);
  const loading = useSubscriptionStore((state) => state.loading);
  const error = useSubscriptionStore((state) => state.error);
  const refresh = useSubscriptionStore((state) => state.refresh);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  useEffect(() => {
    void refresh({ force: true });
  }, [refresh]);

  const isPremium = subscription?.plan === 'premium';

  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat(locale === 'es' ? 'es-DO' : 'en-US', {
      dateStyle: 'long',
    }).format(new Date(iso));

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <CreditCard className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-black tracking-tight text-slate-950">
              {t('settings.plan.title')}
            </h2>
            <p className="text-sm text-slate-500">{t('settings.plan.description')}</p>
          </div>
        </div>
        {isPremium ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
            <Sparkles className="h-3 w-3" />
            {t('plan.premiumName')}
          </span>
        ) : null}
      </div>

      {loading && !subscription ? (
        <div className="mt-5 h-28 animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />
      ) : error && !subscription ? (
        <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {t('plan.error')}
          <button
            type="button"
            onClick={() => void refresh({ force: true })}
            className="ml-3 rounded-lg border border-rose-300 bg-white px-2.5 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
          >
            {t('investments.retry')}
          </button>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t('plan.current')}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <p className="text-2xl font-black tracking-tight text-slate-950">
                {isPremium ? t('plan.premiumName') : t('plan.basicName')}
              </p>
              {subscription?.status ? (
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                  {t(STATUS_KEY[subscription.status] ?? 'plan.status.none')}
                </span>
              ) : (
                <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
                  {t('plan.status.none')}
                </span>
              )}
            </div>
            {isPremium ? (
              <p className="mt-1.5 text-sm text-slate-500">
                {subscription?.currentPeriodEnd
                  ? t('plan.renewsOn', { date: formatDate(subscription.currentPeriodEnd) })
                  : t('plan.noExpiration')}
              </p>
            ) : null}
          </div>

          {isPremium ? (
            <div>
              <p className="text-sm font-bold text-slate-800">{t('plan.activeFeatures')}</p>
              <ul className="mt-2 space-y-2">
                {PREMIUM_FEATURE_KEYS.map((key) => (
                  <li key={key} className="flex items-start gap-2 text-sm text-slate-600">
                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
                    {t(key)}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <>
              <div>
                <p className="text-sm font-bold text-slate-800">{t('settings.plan.comparison')}</p>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-sm font-black text-slate-950">{t('plan.basicName')}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {t('settings.plan.basicSummary')}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4">
                    <p className="text-sm font-black text-indigo-700">{t('plan.premiumName')}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-600">
                      {t('settings.plan.premiumSummary')}
                    </p>
                  </div>
                </div>
              </div>

              <ul className="space-y-2">
                {PREMIUM_FEATURE_KEYS.map((key) => (
                  <li key={key} className="flex items-start gap-2 text-sm text-slate-600">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    {t(key)}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => setUpgradeOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-indigo-600/25 transition hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-xl"
              >
                <Sparkles className="h-4 w-4" />
                {t('plan.upgradeCta')}
              </button>
            </>
          )}
        </div>
      )}

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </section>
  );
}
