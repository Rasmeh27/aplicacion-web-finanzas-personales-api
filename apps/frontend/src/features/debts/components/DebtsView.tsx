'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Eye,
  Filter,
  Landmark,
  Loader2,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  WalletCards,
} from 'lucide-react';
import { Modal } from '@/shared/components/Modal';
import { PageHeader } from '@/shared/components/PageHeader';
import { useAuthStore } from '@/store/slices/auth.store';
import { debtService } from '../services/debt.service';
import type { CreateDebtPayload, Debt, DebtPayment, DebtStatus, DebtSummary } from '../types';

type StatusFilter = 'all' | DebtStatus;
type TypeFilter = 'all' | 'loan' | 'card' | 'personal' | 'store' | 'other';

const todayInput = () => new Date().toISOString().slice(0, 10);

const getErrorMessage = (error: unknown, fallback: string): string => {
  const maybe = error as { response?: { data?: { message?: string | string[] } } };
  const message = maybe?.response?.data?.message;
  if (Array.isArray(message)) return message[0] ?? fallback;
  return message ?? fallback;
};

const formatMoney = (value: number | null | undefined, currency = 'DOP') =>
  new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));

const formatDate = (value?: string | null) => {
  if (!value) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-DO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`));
};

const daysUntil = (date?: string | null) => {
  if (!date) return null;
  const today = new Date();
  const target = new Date(`${date}T00:00:00`);
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.ceil((target.getTime() - todayStart.getTime()) / 86400000);
};

const classifyDebt = (debt: Debt): TypeFilter => {
  const text = `${debt.name} ${debt.creditor ?? ''}`.toLowerCase();
  if (text.includes('tarjeta') || text.includes('card') || text.includes('visa') || text.includes('master')) return 'card';
  if (text.includes('personal') || text.includes('persona') || text.includes('familiar') || text.includes('amigo')) return 'personal';
  if (text.includes('tienda') || text.includes('muebler') || text.includes('electro') || text.includes('financiad')) return 'store';
  if (
    text.includes('prestamo') ||
    text.includes('préstamo') ||
    text.includes('banco') ||
    text.includes('bank') ||
    text.includes('popular') ||
    text.includes('bhd') ||
    text.includes('reservas') ||
    text.includes('scotia') ||
    text.includes('financiera')
  ) return 'loan';
  return 'other';
};

const iconForDebt = (debt: Debt) => {
  const type = classifyDebt(debt);
  if (type === 'card') return CreditCard;
  if (type === 'personal') return Landmark;
  return WalletCards;
};

const riskCopy = (summary: DebtSummary | null) => {
  const ratio = summary?.debtIncomeRatio;
  if (ratio === null || ratio === undefined) {
    return {
      title: 'Sin ingresos del mes',
      description: 'Registra tus ingresos para calcular tu ratio de endeudamiento.',
      color: 'text-slate-600',
      bar: 'bg-slate-300',
      percent: 0,
    };
  }
  if (ratio < 30) {
    return {
      title: 'Riesgo saludable',
      description: 'Tu nivel de deuda es manejable. Continúa manteniendo tus pagos al día.',
      color: 'text-emerald-600',
      bar: 'bg-emerald-500',
      percent: ratio,
    };
  }
  if (ratio <= 50) {
    return {
      title: 'Riesgo moderado',
      description: 'Tus pagos de deuda requieren atención. Evita asumir nuevas cuotas.',
      color: 'text-amber-500',
      bar: 'bg-amber-400',
      percent: ratio,
    };
  }
  return {
    title: 'Riesgo alto',
    description: 'Tu deuda consume demasiado ingreso. Prioriza pagos y reduce compromisos.',
    color: 'text-rose-600',
    bar: 'bg-rose-500',
    percent: ratio,
  };
};

function MetricCard({
  icon: Icon,
  label,
  value,
  accent = 'indigo',
}: {
  icon: typeof WalletCards;
  label: string;
  value: string;
  accent?: 'indigo' | 'emerald';
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
      <div className="flex items-center gap-4">
        <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${accent === 'emerald' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
          <Icon className="h-6 w-6" />
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-400">{label}</p>
          <p className="mt-1 text-2xl font-black text-indigo-700">{value}</p>
        </div>
      </div>
    </div>
  );
}

export function DebtsView() {
  const user = useAuthStore((state) => state.user);
  const currency = user?.primaryCurrency ?? 'DOP';
  const [debts, setDebts] = useState<Debt[]>([]);
  const [summary, setSummary] = useState<DebtSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [debtModalOpen, setDebtModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [paymentDebt, setPaymentDebt] = useState<Debt | null>(null);
  const [detailDebt, setDetailDebt] = useState<Debt | null>(null);
  const [detailPayments, setDetailPayments] = useState<DebtPayment[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const [debtForm, setDebtForm] = useState({
    name: '',
    creditor: '',
    initialAmount: '',
    minimumPayment: '',
    interestRatePct: '',
    dueDay: '',
  });
  const [debtSaving, setDebtSaving] = useState(false);

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentDate: todayInput(),
    note: '',
  });
  const [paymentSaving, setPaymentSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, nextSummary] = await Promise.all([debtService.list(), debtService.summary()]);
      setDebts(list);
      setSummary(nextSummary);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudieron cargar tus deudas.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const activeDebts = debts.filter((debt) => debt.status === 'active');
  const upcomingPayments = useMemo(() => (
    activeDebts
      .filter((debt) => debt.nextPaymentDate)
      .sort((a, b) => String(a.nextPaymentDate).localeCompare(String(b.nextPaymentDate)))
      .slice(0, 3)
  ), [activeDebts]);
  const upcomingTotal = upcomingPayments.reduce((sum, debt) => sum + Number(debt.minimumPayment ?? 0), 0);
  const risk = riskCopy(summary);

  const filteredDebts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return debts.filter((debt) => {
      if (statusFilter !== 'all' && debt.status !== statusFilter) return false;
      if (typeFilter !== 'all' && classifyDebt(debt) !== typeFilter) return false;
      if (!query) return true;
      return `${debt.name} ${debt.creditor ?? ''}`.toLowerCase().includes(query);
    });
  }, [debts, search, statusFilter, typeFilter]);

  const openPayment = (debt: Debt) => {
    setPaymentDebt(debt);
    setPaymentForm({
      amount: debt.minimumPayment ? String(debt.minimumPayment) : '',
      paymentDate: todayInput(),
      note: '',
    });
    setActionError(null);
  };

  const resetDebtForm = () => {
    setDebtForm({ name: '', creditor: '', initialAmount: '', minimumPayment: '', interestRatePct: '', dueDay: '' });
  };

  const openCreateDebt = () => {
    setEditingDebt(null);
    resetDebtForm();
    setActionError(null);
    setDebtModalOpen(true);
  };

  const openEditDebt = (debt: Debt) => {
    setEditingDebt(debt);
    setDebtForm({
      name: debt.name,
      creditor: debt.creditor ?? '',
      initialAmount: String(debt.initialAmount ?? ''),
      minimumPayment: String(debt.minimumPayment ?? ''),
      interestRatePct: String(debt.interestRatePct ?? ''),
      dueDay: debt.dueDay ? String(debt.dueDay) : '',
    });
    setActionError(null);
    setDebtModalOpen(true);
  };

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setTypeFilter('all');
  };

  const handleSaveDebt = async () => {
    setDebtSaving(true);
    setActionError(null);
    try {
      const payload: CreateDebtPayload = {
        name: debtForm.name.trim(),
        creditor: debtForm.creditor.trim() || undefined,
        initialAmount: Number(debtForm.initialAmount),
        minimumPayment: Number(debtForm.minimumPayment || 0),
        interestRatePct: Number(debtForm.interestRatePct || 0),
        dueDay: debtForm.dueDay ? Number(debtForm.dueDay) : undefined,
        currency,
      };
      if (editingDebt) {
        await debtService.update(editingDebt.id, payload);
      } else {
        await debtService.create(payload);
      }
      setDebtModalOpen(false);
      setEditingDebt(null);
      resetDebtForm();
      await load();
    } catch (err) {
      setActionError(getErrorMessage(err, editingDebt ? 'No se pudo actualizar la deuda.' : 'No se pudo crear la deuda.'));
    } finally {
      setDebtSaving(false);
    }
  };

  const handleDeleteDebt = async (debt: Debt) => {
    const confirmed = window.confirm(`¿Eliminar la deuda "${debt.name}"? Se ocultará de tus listas y se conservará la trazabilidad.`);
    if (!confirmed) return;

    setActionError(null);
    try {
      await debtService.remove(debt.id);
      await load();
    } catch (err) {
      setActionError(getErrorMessage(err, 'No se pudo eliminar la deuda.'));
    }
  };

  const handleRegisterPayment = async () => {
    if (!paymentDebt) return;
    setPaymentSaving(true);
    setActionError(null);
    try {
      await debtService.registerPayment(paymentDebt.id, {
        amount: Number(paymentForm.amount),
        paymentDate: paymentForm.paymentDate,
        note: paymentForm.note.trim() || undefined,
      });
      setPaymentDebt(null);
      await load();
    } catch (err) {
      setActionError(getErrorMessage(err, 'No se pudo registrar el pago.'));
    } finally {
      setPaymentSaving(false);
    }
  };

  const openDetail = async (debt: Debt) => {
    setDetailDebt(debt);
    setDetailPayments([]);
    setDetailLoading(true);
    try {
      setDetailPayments(await debtService.listPayments(debt.id));
    } catch (err) {
      setActionError(getErrorMessage(err, 'No se pudieron cargar los pagos.'));
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <>
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          title="Deudas"
          description="Controla tus préstamos, pagos pendientes y ratio de endeudamiento."
          action={
          <button
            type="button"
            onClick={openCreateDebt}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-indigo-600/25 transition hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-600/25 sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Nueva deuda
          </button>
          }
        />

        {error ? (
          <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {error}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={WalletCards} label="Total pendiente" value={loading ? '...' : formatMoney(summary?.totalPending, currency)} />
          <MetricCard icon={CalendarDays} label="Pago mínimo mensual" value={loading ? '...' : formatMoney(summary?.totalMinimumPayment, currency)} />
          <MetricCard icon={AlertCircle} label="Ratio deuda/ingreso" value={summary?.debtIncomeRatio === null || summary?.debtIncomeRatio === undefined ? 'N/D' : `${summary.debtIncomeRatio}%`} />
          <MetricCard icon={CheckCircle2} label="Deudas activas" value={String(summary?.activeDebtsCount ?? 0)} accent="emerald" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-950/5">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <ShieldCheck className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-black text-slate-950">Salud de deuda</h2>
                    <p className={`mt-5 text-2xl font-black ${risk.color}`}>{risk.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{risk.description}</p>
                  </div>
                  <p className={`text-2xl font-black ${risk.color}`}>
                    {summary?.debtIncomeRatio === null || summary?.debtIncomeRatio === undefined ? 'N/D' : `${summary.debtIncomeRatio}%`}
                  </p>
                </div>
                <div className="mt-8">
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${risk.bar}`} style={{ width: `${Math.min(risk.percent, 100)}%` }} />
                  </div>
                  <div className="mt-4 grid grid-cols-4 text-sm font-semibold text-slate-400">
                    <span>0%</span>
                    <span>30%</span>
                    <span className="text-rose-400">50%</span>
                    <span className="text-right">100%</span>
                  </div>
                  <div className="mt-5 flex flex-wrap justify-center gap-5 text-xs font-semibold text-slate-500">
                    <span><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" /> Saludable (&lt;30%)</span>
                    <span><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-amber-400" /> Moderado (30%-50%)</span>
                    <span><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-rose-500" /> Alto (&gt;50%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
            <div className="flex items-center justify-between">
              <h2 className="inline-flex items-center gap-2 text-lg font-black text-slate-950">
                <CalendarDays className="h-5 w-5 text-indigo-600" />
                Próximos pagos
              </h2>
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('active');
                  setTypeFilter('all');
                }}
                className="text-sm font-black text-indigo-600"
              >
                Ver todos
              </button>
            </div>
            <div className="mt-5 space-y-4">
              {upcomingPayments.length ? upcomingPayments.map((debt) => {
                const Icon = iconForDebt(debt);
                const days = daysUntil(debt.nextPaymentDate);
                return (
                  <button key={debt.id} type="button" onClick={() => openPayment(debt)} className="flex w-full items-center gap-3 text-left">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-black text-slate-800">{debt.name}</span>
                      <span className="text-xs font-medium text-slate-400">{formatDate(debt.nextPaymentDate)}</span>
                    </span>
                    <span className="text-right">
                      <span className="block text-sm font-black text-indigo-700">{formatMoney(debt.minimumPayment, debt.currency)}</span>
                      {days !== null ? <span className="rounded-lg bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-600">En {days} días</span> : null}
                    </span>
                  </button>
                );
              }) : (
                <p className="rounded-2xl bg-slate-50 px-4 py-5 text-sm font-semibold text-slate-400">No hay próximos pagos configurados.</p>
              )}
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-sm">
              <span className="font-semibold text-slate-400">Total próximos pagos</span>
              <span className="font-black text-indigo-700">{formatMoney(upcomingTotal, currency)}</span>
            </div>
          </aside>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-950/5">
          <div className="border-b border-slate-100 p-5">
            <h2 className="text-lg font-black text-slate-950">Mis deudas</h2>
            <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_210px_120px]">
              <label className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar deuda..."
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-semibold outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                />
              </label>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100">
                <option value="all">Estado: Todas</option>
                <option value="active">Estado: Activas</option>
                <option value="paid">Estado: Pagadas</option>
                <option value="cancelled">Estado: Canceladas</option>
              </select>
              <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as TypeFilter)} className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100">
                <option value="all">Tipo: Todas</option>
                <option value="loan">Préstamos / bancos</option>
                <option value="card">Tarjetas</option>
                <option value="personal">Personas</option>
                <option value="store">Tiendas / financieras</option>
                <option value="other">Otros</option>
              </select>
              <button type="button" onClick={resetFilters} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-black text-slate-600 transition hover:bg-slate-50">
                <Filter className="h-4 w-4" />
                Limpiar
              </button>
            </div>
            <p className="mt-3 text-xs font-semibold text-slate-400">
              Mostrando resultados según búsqueda, estado y tipo seleccionados.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left">
              <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-5 py-4">Deuda</th>
                  <th className="px-4 py-4">Acreedor</th>
                  <th className="px-4 py-4">Saldo pendiente</th>
                  <th className="px-4 py-4">Monto original</th>
                  <th className="px-4 py-4">Pago mínimo</th>
                  <th className="px-4 py-4">Tasa interés</th>
                  <th className="px-4 py-4">Día de pago</th>
                  <th className="px-4 py-4">Progreso</th>
                  <th className="px-5 py-4">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={9} className="px-5 py-10 text-center text-sm font-semibold text-slate-400">Cargando deudas...</td></tr>
                ) : filteredDebts.length ? filteredDebts.map((debt) => {
                  const Icon = iconForDebt(debt);
                  return (
                    <tr key={debt.id} className="text-sm">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                            <Icon className="h-5 w-5" />
                          </span>
                          <div>
                            <p className="font-black text-slate-800">{debt.name}</p>
                            <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-black ${debt.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                              {debt.status === 'active' ? 'Activa' : debt.status === 'paid' ? 'Pagada' : 'Cancelada'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 font-semibold text-slate-500">{debt.creditor || '-'}</td>
                      <td className="px-4 py-4 font-black text-indigo-700">{formatMoney(debt.balance, debt.currency)}</td>
                      <td className="px-4 py-4 font-semibold text-slate-600">{formatMoney(debt.initialAmount, debt.currency)}</td>
                      <td className="px-4 py-4 font-semibold text-slate-600">{formatMoney(debt.minimumPayment, debt.currency)}</td>
                      <td className="px-4 py-4 font-semibold text-slate-600">{debt.interestRatePct}%</td>
                      <td className="px-4 py-4 font-semibold text-slate-600">{debt.dueDay ? `Día ${debt.dueDay}` : '-'}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <span className="w-8 text-xs font-black text-indigo-700">{debt.progress}%</span>
                          <span className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">
                            <span className="block h-full rounded-full bg-indigo-600" style={{ width: `${debt.progress}%` }} />
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-2">
                          <div className="flex gap-2">
                            <button type="button" onClick={() => openEditDebt(debt)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-50">
                              <Pencil className="h-3.5 w-3.5" />
                              Editar
                            </button>
                            <button type="button" onClick={() => void handleDeleteDebt(debt)} className="inline-flex items-center justify-center rounded-lg border border-rose-100 px-3 py-2 text-xs font-black text-rose-600 transition hover:bg-rose-50" aria-label={`Eliminar ${debt.name}`}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <button type="button" onClick={() => openPayment(debt)} disabled={debt.status !== 'active'} className="inline-flex items-center justify-center gap-2 rounded-lg border border-indigo-100 px-3 py-2 text-xs font-black text-indigo-600 transition hover:bg-indigo-50 disabled:opacity-50">
                            <CreditCard className="h-3.5 w-3.5" />
                            Registrar pago
                          </button>
                          <button type="button" onClick={() => void openDetail(debt)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-50">
                            <Eye className="h-3.5 w-3.5" />
                            Ver detalle
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={9} className="px-5 py-10 text-center text-sm font-semibold text-slate-400">No hay deudas para mostrar.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4 text-sm font-semibold text-slate-400">
            <span>Mostrando {filteredDebts.length} de {debts.length} deudas</span>
            <span className="rounded-lg bg-indigo-600 px-3 py-2 text-white">1</span>
          </div>
        </section>
      </div>

      <Modal
        open={debtModalOpen}
        title={editingDebt ? 'Editar deuda' : 'Nueva deuda'}
        description={editingDebt ? 'Actualiza los datos de esta obligación financiera.' : 'Registra préstamos, tarjetas, compras financiadas o compromisos activos.'}
        onClose={() => {
          setDebtModalOpen(false);
          setEditingDebt(null);
        }}
        footer={
          <>
            <button type="button" onClick={() => {
              setDebtModalOpen(false);
              setEditingDebt(null);
            }} disabled={debtSaving} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60">Cancelar</button>
            <button type="button" onClick={() => void handleSaveDebt()} disabled={debtSaving} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white shadow-sm shadow-indigo-600/25 transition hover:bg-indigo-700 disabled:opacity-60">
              {debtSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {editingDebt ? 'Guardar cambios' : 'Guardar deuda'}
            </button>
          </>
        }
      >
        <DebtForm form={debtForm} onChange={setDebtForm} error={actionError} />
      </Modal>

      <Modal
        open={Boolean(paymentDebt)}
        title="Registrar pago"
        description={paymentDebt ? paymentDebt.name : undefined}
        onClose={() => setPaymentDebt(null)}
        footer={
          <>
            <button type="button" onClick={() => setPaymentDebt(null)} disabled={paymentSaving} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60">Cancelar</button>
            <button type="button" onClick={() => void handleRegisterPayment()} disabled={paymentSaving} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white shadow-sm shadow-indigo-600/25 transition hover:bg-indigo-700 disabled:opacity-60">
              {paymentSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              Guardar pago
            </button>
          </>
        }
      >
        <PaymentForm debt={paymentDebt} form={paymentForm} onChange={setPaymentForm} error={actionError} />
      </Modal>

      <Modal open={Boolean(detailDebt)} title="Detalle de deuda" description={detailDebt?.name} onClose={() => setDetailDebt(null)}>
        {detailDebt ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <MiniStat label="Saldo" value={formatMoney(detailDebt.balance, detailDebt.currency)} />
              <MiniStat label="Pagado" value={formatMoney(detailDebt.totalPaid, detailDebt.currency)} />
              <MiniStat label="Progreso" value={`${detailDebt.progress}%`} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-950">Pagos registrados</h3>
              <div className="mt-3 space-y-2">
                {detailLoading ? <p className="text-sm font-semibold text-slate-400">Cargando pagos...</p> : null}
                {!detailLoading && detailPayments.length ? detailPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3">
                    <div>
                      <p className="text-sm font-black text-slate-800">{formatMoney(payment.amount, detailDebt.currency)}</p>
                      <p className="text-xs font-semibold text-slate-400">{formatDate(payment.paymentDate)}{payment.note ? ` · ${payment.note}` : ''}</p>
                    </div>
                  </div>
                )) : null}
                {!detailLoading && !detailPayments.length ? <p className="rounded-2xl bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-400">Todavía no hay pagos registrados.</p> : null}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}

function DebtForm({
  form,
  onChange,
  error,
}: {
  form: { name: string; creditor: string; initialAmount: string; minimumPayment: string; interestRatePct: string; dueDay: string };
  onChange: (form: { name: string; creditor: string; initialAmount: string; minimumPayment: string; interestRatePct: string; dueDay: string }) => void;
  error: string | null;
}) {
  const update = (key: keyof typeof form, value: string) => onChange({ ...form, [key]: value });
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-semibold leading-6 text-indigo-700">
        Puede ser banco, tarjeta, financiera, tienda, persona o cualquier compromiso que tengas pendiente.
      </div>
      <Field label="Nombre" value={form.name} onChange={(value) => update('name', value)} placeholder="Nombre de la deuda" />
      <Field
        label="Acreedor o entidad"
        value={form.creditor}
        onChange={(value) => update('creditor', value)}
        placeholder="Banco, persona, tienda o entidad"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Monto original" type="number" value={form.initialAmount} onChange={(value) => update('initialAmount', value)} placeholder="Monto total de la deuda" />
        <Field label="Pago mínimo" type="number" value={form.minimumPayment} onChange={(value) => update('minimumPayment', value)} placeholder="Pago mínimo mensual" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tasa interés (%)" type="number" value={form.interestRatePct} onChange={(value) => update('interestRatePct', value)} placeholder="Porcentaje anual" />
        <Field label="Día de pago" type="number" value={form.dueDay} onChange={(value) => update('dueDay', value)} placeholder="Día del mes" />
      </div>
      {error ? <p className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p> : null}
    </div>
  );
}

function PaymentForm({
  debt,
  form,
  onChange,
  error,
}: {
  debt: Debt | null;
  form: { amount: string; paymentDate: string; note: string };
  onChange: (form: { amount: string; paymentDate: string; note: string }) => void;
  error: string | null;
}) {
  const update = (key: keyof typeof form, value: string) => onChange({ ...form, [key]: value });
  const amount = Number(form.amount);
  const minimumPayment = Number(debt?.minimumPayment ?? 0);
  const isPartialPayment = Boolean(debt) && Number.isFinite(amount) && amount > 0 && minimumPayment > 0 && amount < minimumPayment;

  return (
    <div className="space-y-4">
      {debt ? (
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-700">
          {debt.name} · saldo {formatMoney(debt.balance, debt.currency)} · mínimo {formatMoney(debt.minimumPayment, debt.currency)}
        </div>
      ) : null}
      <Field label="Monto" type="number" value={form.amount} onChange={(value) => update('amount', value)} placeholder="Monto que vas a pagar" />
      {isPartialPayment && debt ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Este pago es menor al mínimo mensual de {formatMoney(debt.minimumPayment, debt.currency)}. Puedes guardarlo como pago parcial,
            pero podría quedar un monto pendiente para este ciclo.
          </span>
        </div>
      ) : null}
      <Field label="Fecha de pago" type="date" value={form.paymentDate} onChange={(value) => update('paymentDate', value)} />
      <label className="block text-sm font-bold text-slate-950">
        Nota opcional
        <textarea
          value={form.note}
          onChange={(event) => update('note', event.target.value)}
          placeholder="Ej. Pago mensual correspondiente a junio"
          className="mt-2 min-h-[100px] w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
        />
      </label>
      {error ? <p className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p> : null}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block text-sm font-bold text-slate-950">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
      />
    </label>
  );
}
