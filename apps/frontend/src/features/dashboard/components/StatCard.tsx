import type { LucideIcon } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

type StatCardAccent = 'indigo' | 'emerald' | 'rose' | 'violet';

type StatCardProps = {
  label: string;
  value: string;
  icon: LucideIcon;
  accent?: StatCardAccent;
  hint?: string;
};

const accentStyles: Record<StatCardAccent, string> = {
  indigo: 'bg-indigo-50 text-indigo-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  rose: 'bg-rose-50 text-rose-600',
  violet: 'bg-violet-50 text-violet-600',
};

export function StatCard({ label, value, icon: Icon, accent = 'indigo', hint }: StatCardProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <span className={cn('flex h-11 w-11 items-center justify-center rounded-2xl', accentStyles[accent])}>
          <Icon className="h-5 w-5" />
        </span>
        {hint ? <span className="text-xs font-semibold text-slate-400">{hint}</span> : null}
      </div>
      <p className="mt-5 text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black tracking-tight text-slate-950">{value}</p>
    </div>
  );
}
