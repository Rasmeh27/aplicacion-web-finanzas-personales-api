'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  ArrowLeftRight,
  Landmark,
  LayoutDashboard,
  Settings,
  Sparkles,
  Target,
  User,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { MoniLogo } from '@/components/auth/MoniLogo';
import { useAuthStore } from '@/store/slices/auth.store';
import { cn } from '@/shared/utils/cn';
import { useTranslation } from '@/shared/i18n/useTranslation';
import type { TranslationKey } from '@/shared/i18n/translations';
import { getHealthScore, type HealthTone } from '../utils/dashboard-data';
import {
  dashboardReportsService,
  type FinancialHealthResponse,
  type FinancialHealthStatus,
} from '../services/dashboard-reports.service';
import { SidebarNavItem } from './SidebarNavItem';

type NavItem = {
  href: string;
  labelKey: TranslationKey;
  icon: LucideIcon;
  badge?: string;
};

const navItems: NavItem[] = [
  { href: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { href: '/transactions', labelKey: 'nav.transactions', icon: ArrowLeftRight },
  { href: '/budgets', labelKey: 'nav.budgets', icon: Wallet },
  { href: '/goals', labelKey: 'nav.goals', icon: Target },
  { href: '/debts', labelKey: 'nav.debts', icon: Landmark },
  { href: '/ai-assistant', labelKey: 'nav.aiAssistant', icon: Sparkles, badge: 'PLUS' },
  { href: '/profile', labelKey: 'nav.profile', icon: User },
  { href: '/settings', labelKey: 'nav.settings', icon: Settings },
];

const isActive = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);

const HEALTH_BADGE_STYLES: Record<HealthTone, string> = {
  excellent: 'bg-emerald-100 text-emerald-700',
  good: 'bg-indigo-100 text-indigo-700',
  fair: 'bg-amber-100 text-amber-700',
  poor: 'bg-rose-100 text-rose-700',
  empty: 'bg-slate-200 text-slate-600',
};

const HEALTH_BAR_STYLES: Record<HealthTone, string> = {
  excellent: 'bg-gradient-to-r from-emerald-500 to-teal-500',
  good: 'bg-gradient-to-r from-indigo-500 to-violet-500',
  fair: 'bg-gradient-to-r from-amber-400 to-orange-500',
  poor: 'bg-gradient-to-r from-rose-500 to-red-500',
  empty: 'bg-slate-300',
};

const HEALTH_TONE_LABEL: Record<HealthTone, TranslationKey> = {
  excellent: 'health.excellent',
  good: 'health.good',
  fair: 'health.fair',
  poor: 'health.poor',
  empty: 'health.empty',
};

const HEALTH_STATUS_TONE: Record<FinancialHealthStatus, HealthTone> = {
  excellent: 'excellent',
  stable: 'good',
  attention: 'fair',
  critical: 'poor',
};

const getHealthLetter = (score: number) => {
  if (score >= 900) return 'A+';
  if (score >= 800) return 'A';
  if (score >= 650) return 'B';
  if (score >= 450) return 'C';
  if (score >= 250) return 'D';
  return 'F';
};

const toSidebarHealth = (health: FinancialHealthResponse) => {
  const score = Math.round(health.financialHealthScore * 10);
  const pct = Math.round(health.financialHealthScore);
  const tone = HEALTH_STATUS_TONE[health.status];

  return {
    score,
    pct,
    tone,
    letter: getHealthLetter(score),
  };
};

function VersionBadge() {
  return (
    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
      v2026
    </span>
  );
}

function HealthScoreCard() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const fallbackHealth = getHealthScore(user);
  const [realHealth, setRealHealth] = useState<ReturnType<typeof toSidebarHealth> | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const now = new Date();

    setLoading(true);
    dashboardReportsService
      .financialHealth({ year: now.getFullYear(), month: now.getMonth() + 1 })
      .then((health) => {
        if (!cancelled) setRealHealth(toSidebarHealth(health));
      })
      .catch(() => {
        if (!cancelled) setRealHealth(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const { score, pct, tone, letter } = realHealth ?? fallbackHealth;
  const label = t(HEALTH_TONE_LABEL[tone]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t('sidebar.healthScore')}
        </span>
        <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', HEALTH_BADGE_STYLES[tone])}>
          {label}
        </span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-3xl font-black tracking-tight text-slate-950">{loading && !realHealth ? '...' : score}</p>
          <p className="mt-0.5 text-xs font-bold text-slate-400">de 1000 puntos</p>
        </div>
        <div className="rounded-2xl border border-white bg-white px-3 py-2 text-center shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Letra</p>
          <p className="text-2xl font-semibold leading-none text-slate-800">{letter}</p>
        </div>
      </div>
      <p className="mt-3 text-xs font-medium text-slate-500">
        Clasificación: <span className="font-semibold text-slate-700">{letter} · {label}</span>
      </p>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div className={cn('h-full rounded-full transition-all', HEALTH_BAR_STYLES[tone])} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname() ?? '';
  const { t } = useTranslation();

  const renderNav = () =>
    navItems.map((item) => (
      <SidebarNavItem
        key={item.href}
        href={item.href}
        label={t(item.labelKey)}
        icon={item.icon}
        badge={item.badge}
        active={isActive(pathname, item.href)}
      />
    ));

  return (
    <>
      {/* Desktop: fixed left rail */}
      <aside className="fixed inset-y-0 left-0 z-30 flex w-[280px] flex-col border-r border-slate-200 bg-white shadow-sm max-lg:hidden">
        <div className="flex items-center gap-2 px-6 py-6">
          <MoniLogo />
          <VersionBadge />
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4 pb-4">{renderNav()}</nav>

        <div className="p-4">
          <HealthScoreCard />
        </div>
      </aside>

      {/* Mobile: top bar + horizontally scrollable nav */}
      <div className="lg:hidden">
        <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-3">
          <MoniLogo />
          <VersionBadge />
        </div>
        <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2">{renderNav()}</nav>
      </div>
    </>
  );
}
