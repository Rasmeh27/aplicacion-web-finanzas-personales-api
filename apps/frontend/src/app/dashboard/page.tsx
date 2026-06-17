'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, CreditCard, Loader2, PiggyBank, WalletCards } from 'lucide-react';
import { SmartWalletLogo } from '@/components/auth/SmartWalletLogo';
import { useAuthStore } from '@/store/slices/auth.store';

const summaryCards = [
  { label: 'Balance', value: '$24,560.75', icon: WalletCards },
  { label: 'Monthly spending', value: '$3,672.50', icon: CreditCard },
  { label: 'Savings goal', value: '61%', icon: PiggyBank },
  { label: 'Reports ready', value: '4', icon: BarChart3 },
];

const getStoredToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
};

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const token = accessToken ?? getStoredToken();

    if (!token) {
      router.replace('/auth/login');
      return;
    }

    // Use the auth store state directly — no extra request needed here.
    if (user && !user.onboardingCompletedAt) {
      router.replace('/onboarding/financial-profile');
      return;
    }

    setIsReady(true);
  }, [accessToken, user, router]);

  if (!isReady) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5f7fb] px-4 text-slate-950">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-600 shadow-xl shadow-slate-950/5">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          Loading your dashboard
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] px-4 py-6 text-slate-950 sm:px-6 lg:p-10">
      <section className="mx-auto w-full max-w-6xl">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <SmartWalletLogo />
          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">
            Dashboard
          </div>
        </header>

        <div className="mt-12">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-blue-600">Overview</p>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950">Welcome to SmartWallet</h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-500">
            Your account is ready. Start from a clear snapshot of balances, spending, savings, and reports.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {summaryCards.map((card) => {
            const Icon = card.icon;

            return (
              <div key={card.label} className="rounded-3xl border border-white/80 bg-white p-6 shadow-xl shadow-slate-950/5">
                <Icon className="h-6 w-6 text-blue-600" />
                <p className="mt-5 text-sm font-semibold text-slate-500">{card.label}</p>
                <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">{card.value}</p>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
