'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  CreditCard,
  Loader2,
  Lock,
  LogOut,
  Mail,
  Save,
  Shield,
  Trash2,
  User,
  type LucideIcon,
} from 'lucide-react';
import { authService } from '@/features/auth/services/auth.service';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { Modal } from '@/shared/components/Modal';
import { cn } from '@/shared/utils/cn';
import { useAuthStore } from '@/store/slices/auth.store';
import type { AuthUser } from '@/types/auth';
import { profileService, type UserProfileResponse } from '../services/profile.service';

type CurrencyCode = 'DOP' | 'USD' | 'EUR';

type NotificationSettings = {
  emailNotifications: boolean;
  weeklySummary: boolean;
  budgetAlerts: boolean;
  twoFactor: boolean;
};

const CURRENCY_LABELS: Record<CurrencyCode, string> = {
  DOP: 'RD$ - Peso dominicano',
  USD: 'US$ - Dólar estadounidense',
  EUR: 'EUR - Euro',
};

const DEFAULT_SETTINGS: NotificationSettings = {
  emailNotifications: true,
  weeklySummary: true,
  budgetAlerts: false,
  twoFactor: false,
};

const SETTINGS_KEY = 'moni-profile-settings';

const safeCurrency = (value?: string | null): CurrencyCode => {
  if (value === 'USD' || value === 'EUR') return value;
  return 'DOP';
};

const initialsFromName = (name?: string | null, email?: string | null): string => {
  const source = name?.trim() || email?.split('@')[0] || 'Usuario';
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const normalizeProfile = (current: AuthUser, profile: UserProfileResponse): AuthUser => ({
  ...current,
  ...profile,
  email: profile.email ?? current.email,
  fullName: profile.fullName ?? current.fullName,
  primaryCurrency: profile.primaryCurrency ?? current.primaryCurrency,
  monthlyIncomeEstimate: Number(profile.monthlyIncomeEstimate ?? current.monthlyIncomeEstimate ?? 0),
  monthlySavingTargetPct: Number(profile.monthlySavingTargetPct ?? current.monthlySavingTargetPct ?? 0),
  monthlySavingTargetAmount:
    profile.monthlySavingTargetAmount === undefined
      ? current.monthlySavingTargetAmount
      : profile.monthlySavingTargetAmount === null
        ? null
        : Number(profile.monthlySavingTargetAmount),
  monthlyFixedExpenseEstimate: Number(
    profile.monthlyFixedExpenseEstimate ?? current.monthlyFixedExpenseEstimate ?? 0,
  ),
  monthlyVariableExpenseEstimate: Number(
    profile.monthlyVariableExpenseEstimate ?? current.monthlyVariableExpenseEstimate ?? 0,
  ),
  onboardingCompletedAt: profile.onboardingCompletedAt ?? current.onboardingCompletedAt,
  onboardingVersion: Number(profile.onboardingVersion ?? current.onboardingVersion ?? 1),
});

const getStoredSettings = (): NotificationSettings => {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;

  try {
    const stored = window.localStorage.getItem(SETTINGS_KEY);
    if (!stored) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(stored) as Partial<NotificationSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

function InfoRow({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="border-t border-slate-100 px-5 py-4 sm:px-6">
      <dt className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</dt>
      <dd className={cn('mt-1 text-base font-semibold text-slate-950', muted && 'italic text-slate-400')}>
        {value}
      </dd>
    </div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  action,
  children,
}: {
  icon: LucideIcon;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-950/5">
      <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-slate-800" />
          <h2 className="text-lg font-black tracking-tight text-slate-950">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Toggle({ checked, disabled = false, onChange }: { checked: boolean; disabled?: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={cn(
        'relative h-8 w-14 rounded-full transition focus:outline-none focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60',
        checked ? 'bg-indigo-600' : 'bg-slate-200',
      )}
    >
      <span
        className={cn(
          'absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition',
          checked ? 'left-7' : 'left-1',
        )}
      />
    </button>
  );
}

function PreferenceRow({
  icon: Icon,
  iconClassName,
  title,
  description,
  checked,
  disabled,
  onToggle,
}: {
  icon: LucideIcon;
  iconClassName: string;
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center gap-4 border-t border-slate-100 px-5 py-4 sm:px-6">
      <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl', iconClassName)}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-base font-bold text-slate-950">{title}</p>
        <p className="mt-0.5 text-sm text-slate-400">{description}</p>
      </div>
      <Toggle checked={checked} disabled={disabled} onChange={onToggle} />
    </div>
  );
}

function ActionRow({
  icon: Icon,
  iconClassName,
  title,
  description,
  actionLabel,
  actionClassName,
  onClick,
}: {
  icon: LucideIcon;
  iconClassName: string;
  title: string;
  description: string;
  actionLabel: string;
  actionClassName: string;
  onClick: () => void;
}) {
  return (
    <div className="flex items-center gap-4 border-t border-slate-100 px-5 py-4 sm:px-6">
      <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl', iconClassName)}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-base font-bold text-slate-950">{title}</p>
        <p className="mt-0.5 text-sm text-slate-400">{description}</p>
      </div>
      <button
        type="button"
        onClick={onClick}
        className={cn('text-sm font-black transition hover:opacity-75', actionClassName)}
      >
        {actionLabel}
      </button>
    </div>
  );
}

export function ProfileView() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const setAuth = useAuthStore((state) => state.setAuth);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const syncedUserIdRef = useRef<string | null>(null);

  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [currency, setCurrency] = useState<CurrencyCode>(safeCurrency(user?.primaryCurrency));
  const [fullNameDraft, setFullNameDraft] = useState(user?.fullName?.trim() ?? '');
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [soonMessage, setSoonMessage] = useState<string | null>(null);

  const displayName = user?.fullName?.trim() || 'Usuario MONI';
  const displayEmail = user?.email ?? 'correo no disponible';
  const initials = useMemo(() => initialsFromName(user?.fullName, user?.email), [user?.fullName, user?.email]);
  const selectedCurrency = safeCurrency(user?.primaryCurrency);

  useEffect(() => {
    setSettings(getStoredSettings());
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }
  }, [settings]);

  useEffect(() => {
    setCurrency(selectedCurrency);
  }, [selectedCurrency]);

  useEffect(() => {
    setFullNameDraft(user?.fullName?.trim() ?? '');
  }, [user?.fullName]);

  useEffect(() => {
    if (!user || !accessToken) return;
    if (syncedUserIdRef.current === user.id) return;

    syncedUserIdRef.current = user.id;
    setLoadingProfile(true);
    profileService
      .getMe()
      .then((profile) => {
        if (profile) {
          setAuth(normalizeProfile(user, profile), accessToken, refreshToken);
        }
      })
      .catch(() => {
        setMessage('No se pudo sincronizar el perfil. Se muestran los datos guardados en la sesión.');
      })
      .finally(() => setLoadingProfile(false));
  }, [accessToken, refreshToken, setAuth, syncedUserIdRef, user]);

  const updateSetting = (key: keyof NotificationSettings) => {
    setSettings((current) => ({ ...current, [key]: !current[key] }));
  };

  const openEditProfile = () => {
    setFullNameDraft(user?.fullName?.trim() ?? '');
    setCurrency(selectedCurrency);
    setEditOpen(true);
  };

  const handleSavePreferences = async () => {
    if (!user) return;
    const fullName = fullNameDraft.trim();
    if (fullName.length < 2) {
      setMessage('El nombre debe tener al menos 2 caracteres.');
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const updated = await profileService.updatePreferences({ fullName, primaryCurrency: currency });
      setAuth(normalizeProfile(user, updated), accessToken, refreshToken);
      setEditOpen(false);
      setMessage('Perfil actualizado correctamente.');
    } catch {
      setMessage('No se pudo guardar el perfil. Inténtalo nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await authService.logout(refreshToken);
    } catch {
      // El cierre local debe continuar aunque el servidor no responda.
    } finally {
      clearAuth();
      router.replace('/auth/login');
    }
  };

  return (
    <>
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-indigo-600">
            <User className="h-4 w-4" />
            Cuenta personal
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Perfil</h1>
          <p className="mt-1 text-sm text-slate-500">
            Administra tu información personal y las preferencias de tu cuenta.
          </p>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-2xl font-black text-white shadow-lg shadow-indigo-600/20">
                {initials}
                <span className="absolute -bottom-1 rounded-md bg-indigo-700 px-2 py-0.5 text-[10px] font-black text-white">
                  PLUS
                </span>
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight text-slate-950">{displayName}</h2>
                <p className="mt-0.5 text-sm font-medium text-slate-400">{displayEmail}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-400">
                  <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-indigo-700">Cuenta activa</span>
                  <span>Miembro desde 2026</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={openEditProfile}
              className="inline-flex items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 px-5 py-3 text-sm font-black text-indigo-700 transition hover:border-indigo-200 hover:bg-indigo-100"
            >
              Editar perfil
            </button>
          </div>
        </section>

        {message ? (
          <div className="flex items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            {message}
          </div>
        ) : null}

        <SectionCard
          icon={User}
          title="Información personal"
          action={
            <button
              type="button"
              onClick={openEditProfile}
              className="text-sm font-black text-indigo-600 transition hover:text-indigo-700"
            >
              Editar
            </button>
          }
        >
          {loadingProfile ? (
            <div className="flex items-center gap-2 border-t border-slate-100 px-5 py-3 text-sm font-semibold text-slate-400 sm:px-6">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
              Sincronizando perfil...
            </div>
          ) : null}
          <dl>
            <InfoRow label="Nombre completo" value={displayName} />
            <InfoRow label="Correo electrónico" value={displayEmail} />
            <InfoRow label="Teléfono" value="No configurado" muted />
            <InfoRow label="Moneda" value={CURRENCY_LABELS[selectedCurrency]} />
            <InfoRow label="País" value="República Dominicana" />
            <InfoRow label="Zona horaria" value="UTC-4 (AST)" />
          </dl>
        </SectionCard>

        <SectionCard icon={Bell} title="Notificaciones">
          <PreferenceRow
            icon={Mail}
            iconClassName="bg-blue-50 text-blue-600"
            title="Notificaciones por correo"
            description="Alertas de transacciones y metas"
            checked={settings.emailNotifications}
            onToggle={() => updateSetting('emailNotifications')}
          />
          <PreferenceRow
            icon={CreditCard}
            iconClassName="bg-emerald-50 text-emerald-600"
            title="Resumen semanal"
            description="Informe de gastos cada lunes"
            checked={settings.weeklySummary}
            onToggle={() => updateSetting('weeklySummary')}
          />
          <PreferenceRow
            icon={AlertTriangle}
            iconClassName="bg-amber-50 text-amber-500"
            title="Alertas de presupuesto"
            description="Aviso al llegar al 80% del límite"
            checked={settings.budgetAlerts}
            onToggle={() => updateSetting('budgetAlerts')}
          />
        </SectionCard>

        <SectionCard icon={Shield} title="Seguridad">
          <ActionRow
            icon={Lock}
            iconClassName="bg-blue-50 text-blue-600"
            title="Contraseña"
            description="Última actualización no disponible"
            actionLabel="Cambiar"
            actionClassName="text-indigo-600"
            onClick={() => setSoonMessage('El cambio de contraseña estará disponible cuando se conecte el flujo de recuperación.')}
          />
          <PreferenceRow
            icon={Shield}
            iconClassName="bg-emerald-50 text-emerald-600"
            title="Autenticación en dos pasos"
            description="Añade una capa extra de seguridad"
            checked={settings.twoFactor}
            onToggle={() => updateSetting('twoFactor')}
          />
        </SectionCard>

        <SectionCard icon={AlertTriangle} title="Zona de peligro">
          <ActionRow
            icon={LogOut}
            iconClassName="bg-orange-50 text-orange-500"
            title="Cerrar sesión"
            description="Salir de tu cuenta en este dispositivo"
            actionLabel="Salir"
            actionClassName="text-orange-500"
            onClick={() => setLogoutOpen(true)}
          />
          <ActionRow
            icon={Trash2}
            iconClassName="bg-rose-50 text-rose-600"
            title="Eliminar cuenta"
            description="Esta acción es permanente e irreversible"
            actionLabel="Eliminar"
            actionClassName="text-rose-600"
            onClick={() => setDeleteOpen(true)}
          />
        </SectionCard>
      </div>

      <Modal
        open={editOpen}
        title="Editar perfil"
        description="Actualiza tu nombre y la moneda principal de la cuenta."
        onClose={() => setEditOpen(false)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setEditOpen(false)}
              disabled={saving}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleSavePreferences()}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white shadow-sm shadow-indigo-600/25 transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar
            </button>
          </>
        }
      >
        <label htmlFor="profileFullName" className="block text-sm font-bold text-slate-950">
          Nombre completo
        </label>
        <input
          id="profileFullName"
          type="text"
          value={fullNameDraft}
          onChange={(event) => setFullNameDraft(event.target.value)}
          placeholder="Ingresa tu nombre"
          className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
        />

        <label htmlFor="profileCurrency" className="mt-4 block text-sm font-bold text-slate-950">
          Moneda principal
        </label>
        <select
          id="profileCurrency"
          value={currency}
          onChange={(event) => setCurrency(safeCurrency(event.target.value))}
          className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
        >
          {Object.entries(CURRENCY_LABELS).map(([code, label]) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </select>
      </Modal>

      <Modal open={Boolean(soonMessage)} title="Función pendiente" onClose={() => setSoonMessage(null)}>
        <p className="text-sm leading-6 text-slate-600">{soonMessage}</p>
      </Modal>

      <ConfirmDialog
        open={logoutOpen}
        title="Cerrar sesión"
        message="¿Seguro que deseas salir de tu cuenta en este dispositivo?"
        confirmLabel="Salir"
        cancelLabel="Cancelar"
        loading={loggingOut}
        onConfirm={() => void handleLogout()}
        onClose={() => setLogoutOpen(false)}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Eliminar cuenta"
        message="El backend todavía no expone un endpoint para eliminar la cuenta. No se realizará ningún cambio permanente."
        confirmLabel="Entendido"
        cancelLabel="Cancelar"
        onConfirm={() => setDeleteOpen(false)}
        onClose={() => setDeleteOpen(false)}
      />
    </>
  );
}

