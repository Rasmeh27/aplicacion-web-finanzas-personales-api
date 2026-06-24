'use client';

import { Calendar, FileText, Hash, Tag, type LucideIcon } from 'lucide-react';
import { Modal } from '@/shared/components/Modal';
import { formatCurrency } from '@/shared/utils/format-currency';
import { CLASSIFICATION_META, type Transaction } from '../types';

type Props = {
  transaction: Transaction | null;
  onClose: () => void;
};

const formatDate = (value: string): string => {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-DO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
};

function DetailRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
}) {
  return (
    <div className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-1 break-words text-sm font-semibold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

export function TransactionDetailModal({ transaction, onClose }: Props) {
  if (!transaction) return null;

  const meta = CLASSIFICATION_META[transaction.classification];
  const isIncome = meta.type === 'income';
  const amount = formatCurrency(Number(transaction.amount), transaction.currency);

  return (
    <Modal open={Boolean(transaction)} title="Detalle de transacción" onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Monto</p>
          <p
            className={
              isIncome
                ? 'mt-1 break-words text-3xl font-black text-emerald-600'
                : 'mt-1 break-words text-3xl font-black text-rose-600'
            }
          >
            {isIncome ? '+' : '-'}
            {amount}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-500">{meta.label}</p>
        </div>

        <DetailRow icon={FileText} label="Descripción" value={transaction.description || 'Sin descripción'} />
        <DetailRow icon={Tag} label="Categoría" value={transaction.category?.name ?? 'Sin categoría'} />
        <DetailRow icon={Calendar} label="Fecha" value={formatDate(transaction.date)} />
        <DetailRow icon={Hash} label="ID" value={transaction.id} />

        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Notas</p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
            {transaction.notes?.trim() || 'Sin notas adicionales.'}
          </p>
        </div>
      </div>
    </Modal>
  );
}
