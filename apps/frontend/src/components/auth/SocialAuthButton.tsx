import type { ReactNode } from 'react';

type SocialAuthButtonProps = {
  icon: ReactNode;
  children: ReactNode;
};

export function SocialAuthButton({ icon, children }: SocialAuthButtonProps) {
  return (
    <button
      type="button"
      className="flex h-14 flex-1 items-center justify-center gap-3 rounded-2xl border border-slate-200/80 bg-white/80 px-5 text-sm font-semibold text-slate-950 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-950/5 focus:outline-none focus:ring-4 focus:ring-blue-100"
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}
