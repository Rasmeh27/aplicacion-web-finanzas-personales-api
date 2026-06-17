'use client';

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
import { SmartWalletLogo } from '@/components/auth/SmartWalletLogo';
import { useAuthStore } from '@/store/slices/auth.store';
import { cn } from '@/shared/utils/cn';
import { useTranslation } from '@/shared/i18n/useTranslation';
import type { TranslationKey } from '@/shared/i18n/translations';
import { getHealthScore, type HealthTone } from '../utils/dashboard-data';
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
  const { score, pct, tone } = getHealthScore(user);

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t('sidebar.healthScore')}
        </span>
        <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', HEALTH_BADGE_STYLES[tone])}>
          {t(HEALTH_TONE_LABEL[tone])}
        </span>
      </div>
      <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{score}</p>
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
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[280px] flex-col border-r border-slate-200 bg-white shadow-sm lg:flex">
        <div className="flex items-center gap-2 px-6 py-6">
          <SmartWalletLogo />
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
          <SmartWalletLogo />
          <VersionBadge />
        </div>
        <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2">{renderNav()}</nav>
      </div>
    </>
  );
}
