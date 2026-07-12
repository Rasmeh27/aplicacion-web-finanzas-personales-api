import Link from 'next/link';
import { Lock, type LucideIcon } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

type SidebarNavItemProps = {
  href: string;
  label: string;
  icon: LucideIcon;
  active?: boolean;
  badge?: string;
  /** Función Premium bloqueada para el usuario actual (muestra candado). */
  locked?: boolean;
};

export function SidebarNavItem({
  href,
  label,
  icon: Icon,
  active = false,
  badge,
  locked = false,
}: SidebarNavItemProps) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition',
        active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900',
      )}
    >
      <Icon
        className={cn(
          'h-5 w-5 shrink-0 transition',
          active ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600',
        )}
      />
      <span className="flex-1 whitespace-nowrap">{label}</span>
      {locked ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
          <Lock className="h-3 w-3" />
          {badge}
        </span>
      ) : badge ? (
        <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}
