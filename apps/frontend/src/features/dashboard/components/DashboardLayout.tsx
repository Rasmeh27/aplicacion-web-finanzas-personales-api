'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/slices/auth.store';
import { useTranslation } from '@/shared/i18n/useTranslation';
import { WallterChatBubble } from '@/features/assistant/components/WallterChatBubble';
import { Sidebar } from './Sidebar';

const getStoredToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
};

export function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const [isReady, setIsReady] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = accessToken ?? getStoredToken();

    if (!token) {
      router.replace('/auth/login');
      return;
    }

    // Rely on the locally persisted auth store — no backend call needed here.
    if (user && !user.onboardingCompletedAt) {
      router.replace('/onboarding/financial-profile');
      return;
    }

    setIsReady(true);
  }, [accessToken, user, router]);

  if (!isReady) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#F8FAFC] text-slate-950">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-600 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
          <span suppressHydrationWarning>{mounted ? t('common.loading') : ''}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-950">
      <Sidebar />
      <div className="lg:pl-[280px]">
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</main>
      </div>
      <WallterChatBubble />
    </div>
  );
}
