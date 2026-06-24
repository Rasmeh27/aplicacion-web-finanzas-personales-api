'use client';

import { cn } from '@/shared/utils/cn';
import { BUDGET_STATUS_META, type BudgetStatus } from '../types';

type Props = {
  usagePct: number;
  status: BudgetStatus;
};

export function BudgetProgressBar({ usagePct, status }: Props) {
  // La barra se limita visualmente a 100%, pero el texto muestra el % real.
  const width = Math.min(Math.max(usagePct, 0), 100);

  return (
    <div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn('h-full rounded-full transition-all', BUDGET_STATUS_META[status].bar)}
          style={{ width: `${width}%` }}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-xs font-semibold">
        <span
          className={cn(
            status === 'exceeded'
              ? 'text-rose-600'
              : status === 'warning'
                ? 'text-amber-600'
                : 'text-emerald-600',
          )}
        >
          {usagePct}% usado
        </span>
        <span className="text-slate-400">{BUDGET_STATUS_META[status].label}</span>
      </div>
    </div>
  );
}
