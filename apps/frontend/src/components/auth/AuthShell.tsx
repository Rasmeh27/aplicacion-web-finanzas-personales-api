import Link from 'next/link';
import type { ReactNode } from 'react';
import { AuthMarketingPanel } from './AuthMarketingPanel';
import { SmartWalletLogo } from './SmartWalletLogo';

type AuthShellProps = {
  children: ReactNode;
  helperText: string;
  helperHref: string;
  helperAction: string;
  marketingTitle: string;
  marketingVariant?: 'login' | 'register';
};

export function AuthShell({
  children,
  helperText,
  helperHref,
  helperAction,
  marketingTitle,
  marketingVariant = 'login',
}: AuthShellProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f5f7fb] px-4 py-6 text-slate-950 sm:px-6 lg:grid lg:place-items-center lg:p-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.12),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(79,70,229,0.13),transparent_30%)]" />
      <section className="relative mx-auto grid w-full max-w-[1440px] gap-6 rounded-[2.75rem] border border-white/80 bg-white/80 p-4 shadow-2xl shadow-slate-950/10 backdrop-blur-xl lg:grid-cols-[minmax(0,1fr)_560px] lg:p-6">
        <div className="rounded-[2.25rem] bg-white px-5 py-8 sm:px-10 lg:px-16 lg:py-12">
          <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <SmartWalletLogo />
            <p className="text-sm font-medium text-slate-500">
              {helperText}{' '}
              <Link href={helperHref} className="font-bold text-blue-600 transition hover:text-blue-700">
                {helperAction}
              </Link>
            </p>
          </header>

          {children}
        </div>

        <AuthMarketingPanel title={marketingTitle} variant={marketingVariant} />
      </section>
    </main>
  );
}
