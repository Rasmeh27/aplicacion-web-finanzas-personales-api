'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  CreditCard,
  FileDown,
  FileSpreadsheet,
  FileText,
  Loader2,
  Lock,
  LogOut,
  Mail,
  Save,
  Shield,
  Trash2,
  Upload,
  User,
  type LucideIcon,
} from 'lucide-react';
import { authService } from '@/features/auth/services/auth.service';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { Modal } from '@/shared/components/Modal';
import { PageHeader } from '@/shared/components/PageHeader';
import { cn } from '@/shared/utils/cn';
import { useAuthStore } from '@/store/slices/auth.store';
import type { AuthUser } from '@/types/auth';
import {
  profileService,
  type AccountExportResponse,
  type UpdateUserPreferencesPayload,
  type UserProfileResponse,
} from '../services/profile.service';
import { privacyService } from '../services/privacy.service';

type CurrencyCode = 'DOP' | 'USD' | 'EUR';

type NotificationSettings = {
  emailNotifications: boolean;
  weeklySummary: boolean;
  budgetAlerts: boolean;
  twoFactor: boolean;
  marketingConsent: boolean;
  dataProcessingConsentAt: string | null;
};

const CURRENCY_LABELS: Record<CurrencyCode, string> = {
  DOP: 'RD$ - Peso dominicano',
  USD: 'US$ - Dólar estadounidense',
  EUR: 'EUR - Euro',
};

const COUNTRY_OPTIONS = [
  { code: 'DO', label: 'República Dominicana' },
  { code: 'US', label: 'Estados Unidos' },
  { code: 'PR', label: 'Puerto Rico' },
  { code: 'MX', label: 'México' },
  { code: 'CO', label: 'Colombia' },
  { code: 'ES', label: 'España' },
] as const;

const PHONE_COUNTRY_OPTIONS = [
  { code: 'DO', dialCode: '+1', label: 'RD +1', placeholder: '809-555-1234', groups: [3, 3, 4] },
  { code: 'US', dialCode: '+1', label: 'US +1', placeholder: '555-123-4567', groups: [3, 3, 4] },
  { code: 'PR', dialCode: '+1', label: 'PR +1', placeholder: '787-555-1234', groups: [3, 3, 4] },
  { code: 'MX', dialCode: '+52', label: 'MX +52', placeholder: '55-1234-5678', groups: [2, 4, 4] },
  { code: 'CO', dialCode: '+57', label: 'CO +57', placeholder: '300-123-4567', groups: [3, 3, 4] },
  { code: 'ES', dialCode: '+34', label: 'ES +34', placeholder: '600-123-456', groups: [3, 3, 3] },
] as const;

const TIMEZONE_OPTIONS = [
  { value: 'America/Santo_Domingo', label: 'America/Santo_Domingo (UTC-4)' },
  { value: 'America/New_York', label: 'America/New_York' },
  { value: 'America/Puerto_Rico', label: 'America/Puerto_Rico' },
  { value: 'America/Mexico_City', label: 'America/Mexico_City' },
  { value: 'America/Bogota', label: 'America/Bogota' },
  { value: 'Europe/Madrid', label: 'Europe/Madrid' },
] as const;

const countryLabel = (code?: string | null): string =>
  COUNTRY_OPTIONS.find((country) => country.code === code)?.label ?? 'No configurado';

const timezoneLabel = (value?: string | null): string =>
  TIMEZONE_OPTIONS.find((timezone) => timezone.value === value)?.label ?? value ?? 'No configurado';

const DEFAULT_SETTINGS: NotificationSettings = {
  emailNotifications: true,
  weeklySummary: true,
  budgetAlerts: false,
  twoFactor: false,
  marketingConsent: false,
  dataProcessingConsentAt: null,
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

const toMoneyInput = (value: number | null | undefined): string => {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) && numeric > 0 ? String(numeric) : '';
};

const parseMoneyInput = (value: string): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : 0;
};

const digitsOnly = (value: string): string => value.replace(/\D/g, '');

const phoneOptionForCountry = (country?: string | null) =>
  PHONE_COUNTRY_OPTIONS.find((option) => option.code === country) ?? PHONE_COUNTRY_OPTIONS[0];

const formatPhoneLocalInput = (value: string, country?: string | null): string => {
  const option = phoneOptionForCountry(country);
  const maxLength = option.groups.reduce((total, group) => total + group, 0);
  const digits = digitsOnly(value).slice(0, maxLength);
  const parts: string[] = [];
  let cursor = 0;

  for (const groupLength of option.groups) {
    const part = digits.slice(cursor, cursor + groupLength);
    if (!part) break;
    parts.push(part);
    cursor += groupLength;
  }

  return parts.join('-');
};

const splitPhoneNumber = (
  value: string | null | undefined,
  country?: string | null,
): { countryCode: string; dialCode: string; localNumber: string } => {
  const fallback = phoneOptionForCountry(country);
  const sanitized = (value ?? '').replace(/[^0-9+\-()\s]/g, '').trim();
  if (!sanitized) return { countryCode: fallback.code, dialCode: fallback.dialCode, localNumber: '' };

  const compact = sanitized.replace(/[\s\-()]/g, '');
  const matchingOptions = PHONE_COUNTRY_OPTIONS.filter((item) => compact.startsWith(item.dialCode));
  const option = matchingOptions.find((item) => item.code === country) ?? matchingOptions[0];
  if (!option) {
    return {
      countryCode: fallback.code,
      dialCode: fallback.dialCode,
      localNumber: formatPhoneLocalInput(sanitized, fallback.code),
    };
  }

  const localNumber = compact.slice(option.dialCode.length).replace(/\D/g, '');
  return { countryCode: option.code, dialCode: option.dialCode, localNumber: formatPhoneLocalInput(localNumber, option.code) };
};

const buildPhoneNumber = (dialCode: string, localNumber: string): string | null => {
  const sanitizedLocal = localNumber.trim();
  if (!sanitizedLocal) return null;
  return `${dialCode} ${sanitizedLocal}`;
};

const formatPhoneForDisplay = (value: string | null | undefined, country?: string | null): string => {
  if (!value?.trim()) return 'No configurado';
  const phoneParts = splitPhoneNumber(value, country);
  return phoneParts.localNumber ? `${phoneParts.dialCode} ${phoneParts.localNumber}` : 'No configurado';
};

const formatMoney = (value: number | null | undefined, currency: string): string =>
  new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));

const downloadBlob = (fileName: string, blob: Blob) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const safeCell = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const csvCell = (value: unknown): string => `"${safeCell(value).replace(/"/g, '""')}"`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const humanizeKey = (value: string): string =>
  value
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatExportDate = (value: string): string =>
  new Intl.DateTimeFormat('es-DO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

const tableLabel = (table: string): string => {
  const labels: Record<string, string> = {
    movements: 'Movimientos',
    categories: 'Categorías',
    budgets: 'Presupuestos',
    financial_goals: 'Metas financieras',
    goal_contributions: 'Aportes a metas',
    debts: 'Deudas',
    debt_payments: 'Pagos de deudas',
    assistant_sessions: 'Sesiones de Wallter',
    assistant_messages: 'Mensajes de Wallter',
    user_subscriptions: 'Suscripción',
    privacy_settings: 'Privacidad',
    privacy_consents: 'Consentimientos',
    audit_logs: 'Auditoría',
    notifications: 'Notificaciones',
  };

  return labels[table] ?? humanizeKey(table);
};

const flattenRecord = (row: unknown): Record<string, string> => {
  if (!isRecord(row)) return { valor: safeCell(row) };

  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key,
      isRecord(value) || Array.isArray(value) ? JSON.stringify(value) : safeCell(value),
    ]),
  );
};

const getTableColumns = (rows: unknown[]): string[] => {
  const columns = new Set<string>();
  rows.forEach((row) => {
    Object.keys(flattenRecord(row)).forEach((key) => columns.add(key));
  });
  return Array.from(columns);
};

const buildCsvExport = (payload: AccountExportResponse): string => {
  const lines = ['seccion,fila,campo,valor'];
  Object.entries(payload.profile ?? {}).forEach(([field, value]) => {
    lines.push(['perfil', '1', field, value].map(csvCell).join(','));
  });

  Object.entries(payload.data ?? {}).forEach(([table, rows]) => {
    rows.forEach((row, index) => {
      Object.entries(flattenRecord(row)).forEach(([field, value]) => {
        lines.push([table, String(index + 1), field, value].map(csvCell).join(','));
      });
    });
  });

  return lines.join('\n');
};

const escapeHtml = (value: unknown): string =>
  safeCell(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const buildExcelHtml = (payload: AccountExportResponse): string => {
  const profileRows = Object.entries(payload.profile ?? {})
    .map(([field, value]) => `<tr><td>${escapeHtml(humanizeKey(field))}</td><td>${escapeHtml(value)}</td></tr>`)
    .join('');
  const tableSections = Object.entries(payload.data ?? {})
    .map(([table, rows]) => {
      const columns = getTableColumns(rows);
      const rowHtml = rows
        .map((row, index) => {
          const flat = flattenRecord(row);
          return `<tr><td>${index + 1}</td>${columns
            .map((column) => `<td>${escapeHtml(flat[column])}</td>`)
            .join('')}</tr>`;
        })
        .join('');
      const headerHtml = `<tr><th>#</th>${columns.map((column) => `<th>${escapeHtml(humanizeKey(column))}</th>`).join('')}</tr>`;
      return `
        <section class="sheet-section">
          <h2>${escapeHtml(tableLabel(table))}</h2>
          <p>${rows.length} registros</p>
          <table>
            <thead>${headerHtml}</thead>
            <tbody>${rowHtml || `<tr><td colspan="${columns.length + 1}">Sin datos</td></tr>`}</tbody>
          </table>
        </section>
      `;
    })
    .join('');

  return `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; color: #0f172a; background: #f8fafc; padding: 24px; }
          .hero { background: #4f46e5; color: white; padding: 24px; border-radius: 18px; margin-bottom: 24px; }
          .hero h1 { margin: 0 0 8px; font-size: 28px; }
          .hero p { margin: 0; color: #e0e7ff; }
          .sheet-section { background: white; border: 1px solid #dbe3ef; border-radius: 14px; padding: 18px; margin-bottom: 22px; }
          h2 { margin: 0 0 4px; font-size: 18px; color: #312e81; }
          p { margin: 0 0 12px; color: #64748b; }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          th { background: #eef2ff; color: #312e81; font-weight: 700; text-align: left; }
          td, th { border: 1px solid #dbe3ef; padding: 8px 10px; vertical-align: top; word-wrap: break-word; font-size: 12px; }
          tr:nth-child(even) td { background: #f8fafc; }
        </style>
      </head>
      <body>
        <div class="hero">
          <h1>Exportación MONI</h1>
          <p>Generado el ${escapeHtml(formatExportDate(payload.exportedAt))}</p>
        </div>
        <section class="sheet-section">
          <h2>Perfil</h2>
          <table><tbody>${profileRows}</tbody></table>
        </section>
        ${tableSections}
      </body>
    </html>`;
};

const buildPdfReport = (payload: AccountExportResponse): Blob => {
  const normalizePdfText = (value: unknown): string =>
    safeCell(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\x20-\x7E]/g, '')
      .replace(/[()\\]/g, '\\$&');
  const text = (value: unknown, x: number, y: number, size = 10, font = 'F1', color = '0 0 0') =>
    `BT /${font} ${size} Tf ${color} rg ${x} ${y} Td (${normalizePdfText(value)}) Tj ET`;
  const rect = (x: number, y: number, width: number, height: number, color: string) =>
    `q ${color} rg ${x} ${y} ${width} ${height} re f Q`;
  const summary = Object.entries(payload.data ?? {}).map(([table, rows]) => ({
    label: tableLabel(table),
    count: rows.length,
  }));
  const totalRecords = summary.reduce((total, item) => total + item.count, 0);
  const topSections = summary.filter((item) => item.count > 0).slice(0, 10);
  const profile = payload.profile ?? {};
  const commands = [
    rect(0, 0, 612, 792, '0.97 0.98 1'),
    rect(0, 690, 612, 102, '0.31 0.27 0.90'),
    text('MONI', 56, 748, 22, 'F2', '1 1 1'),
    text('Exportacion de cuenta', 56, 724, 15, 'F1', '0.88 0.90 1'),
    text(formatExportDate(payload.exportedAt), 386, 748, 10, 'F1', '0.88 0.90 1'),
    rect(56, 604, 500, 54, '1 1 1'),
    text('Usuario', 78, 635, 9, 'F1', '0.39 0.45 0.55'),
    text(profile.fullName ?? 'No configurado', 78, 615, 15, 'F2', '0.02 0.04 0.10'),
    text('Moneda', 368, 635, 9, 'F1', '0.39 0.45 0.55'),
    text(profile.primaryCurrency ?? 'DOP', 368, 615, 15, 'F2', '0.02 0.04 0.10'),
    rect(56, 520, 150, 58, '1 1 1'),
    rect(231, 520, 150, 58, '1 1 1'),
    rect(406, 520, 150, 58, '1 1 1'),
    text('Registros totales', 76, 555, 9, 'F1', '0.39 0.45 0.55'),
    text(totalRecords, 76, 535, 18, 'F2', '0.31 0.27 0.90'),
    text('Secciones', 251, 555, 9, 'F1', '0.39 0.45 0.55'),
    text(summary.length, 251, 535, 18, 'F2', '0.31 0.27 0.90'),
    text('Correo', 426, 555, 9, 'F1', '0.39 0.45 0.55'),
    text(profile.email ?? 'No disponible', 426, 538, 10, 'F2', '0.31 0.27 0.90'),
    text('Resumen por modulo', 56, 480, 16, 'F2', '0.02 0.04 0.10'),
    rect(56, 456, 500, 1, '0.86 0.89 0.94'),
    ...topSections.flatMap((item, index) => {
      const y = 430 - index * 28;
      return [
        text(item.label, 76, y, 11, 'F1', '0.02 0.04 0.10'),
        text(`${item.count} registros`, 436, y, 11, 'F2', '0.31 0.27 0.90'),
        rect(76, y - 10, 460, 0.7, '0.90 0.92 0.96'),
      ];
    }),
  ];
  const content = commands.join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];
  let body = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(body.length);
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    body += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  body += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new Blob([body], { type: 'application/pdf' });
};

const exportFileName = (extension: string): string => {
  const stamp = new Date().toISOString().slice(0, 10);
  return `moni-export-${stamp}.${extension}`;
};

const parseImportedProfile = (text: string, fileName: string): Partial<UpdateUserPreferencesPayload> => {
  if (fileName.toLowerCase().endsWith('.json')) {
    const parsed = JSON.parse(text) as { profile?: Partial<UpdateUserPreferencesPayload> } & Partial<UpdateUserPreferencesPayload>;
    return parsed.profile ?? parsed;
  }

  const values: Record<string, string> = {};
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const [field, ...rest] = line.split(',');
      if (field && rest.length > 0) values[field.trim()] = rest.join(',').replace(/^"|"$/g, '').trim();
    });

  return values;
};

const normalizeProfile = (current: AuthUser, profile: UserProfileResponse): AuthUser => ({
  ...current,
  ...profile,
  email: profile.email ?? current.email,
  fullName: profile.fullName ?? current.fullName,
  primaryCurrency: profile.primaryCurrency ?? current.primaryCurrency,
  country: profile.country === undefined ? current.country : profile.country,
  timezone: profile.timezone === undefined ? current.timezone : profile.timezone,
  phoneNumber: profile.phoneNumber === undefined ? current.phoneNumber : profile.phoneNumber,
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
  disabled = false,
  onClick,
}: {
  icon: LucideIcon;
  iconClassName: string;
  title: string;
  description: string;
  actionLabel: string;
  actionClassName: string;
  disabled?: boolean;
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
        disabled={disabled}
        onClick={onClick}
        className={cn('text-sm font-black transition hover:opacity-75 disabled:cursor-not-allowed disabled:opacity-60', actionClassName)}
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
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [currency, setCurrency] = useState<CurrencyCode>(safeCurrency(user?.primaryCurrency));
  const [fullNameDraft, setFullNameDraft] = useState(user?.fullName?.trim() ?? '');
  const [countryDraft, setCountryDraft] = useState(user?.country ?? 'DO');
  const [timezoneDraft, setTimezoneDraft] = useState(user?.timezone ?? 'America/Santo_Domingo');
  const initialPhoneDraft = splitPhoneNumber(user?.phoneNumber, user?.country);
  const [phoneCountryDraft, setPhoneCountryDraft] = useState(initialPhoneDraft.countryCode);
  const [phoneLocalDraft, setPhoneLocalDraft] = useState(initialPhoneDraft.localNumber);
  const [incomeDraft, setIncomeDraft] = useState(toMoneyInput(user?.monthlyIncomeEstimate));
  const [fixedDraft, setFixedDraft] = useState(toMoneyInput(user?.monthlyFixedExpenseEstimate));
  const [variableDraft, setVariableDraft] = useState(toMoneyInput(user?.monthlyVariableExpenseEstimate));
  const [savingAmountDraft, setSavingAmountDraft] = useState(toMoneyInput(user?.monthlySavingTargetAmount));
  const [savingPctDraft, setSavingPctDraft] = useState(toMoneyInput(user?.monthlySavingTargetPct));
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [passwordResetOpen, setPasswordResetOpen] = useState(false);
  const [sendingPasswordReset, setSendingPasswordReset] = useState(false);
  const [passwordResetSent, setPasswordResetSent] = useState(false);
  const [passwordResetError, setPasswordResetError] = useState<string | null>(null);
  const [exportingFormat, setExportingFormat] = useState<'json' | 'csv' | 'xls' | 'pdf' | null>(null);
  const [importingProfile, setImportingProfile] = useState(false);

  const displayName = user?.fullName?.trim() || 'Usuario MONI';
  const displayEmail = user?.email ?? 'correo no disponible';
  const initials = useMemo(() => initialsFromName(user?.fullName, user?.email), [user?.fullName, user?.email]);
  const selectedCurrency = safeCurrency(user?.primaryCurrency);
  const selectedPhoneOption = phoneOptionForCountry(phoneCountryDraft);

  useEffect(() => {
    setSettings(getStoredSettings());
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }
  }, [settings]);

  useEffect(() => {
    if (!accessToken) return;

    privacyService
      .getSettings()
      .then((remoteSettings) => setSettings({ ...DEFAULT_SETTINGS, ...remoteSettings }))
      .catch(() => {
        setMessage('No se pudieron sincronizar las preferencias de privacidad. Se usarán los datos locales.');
      });
  }, [accessToken]);

  useEffect(() => {
    setCurrency(selectedCurrency);
  }, [selectedCurrency]);

  useEffect(() => {
    const phoneParts = splitPhoneNumber(user?.phoneNumber, user?.country);
    setFullNameDraft(user?.fullName?.trim() ?? '');
    setCountryDraft(user?.country ?? 'DO');
    setTimezoneDraft(user?.timezone ?? 'America/Santo_Domingo');
    setPhoneCountryDraft(phoneParts.countryCode);
    setPhoneLocalDraft(phoneParts.localNumber);
  }, [user?.country, user?.fullName, user?.phoneNumber, user?.timezone]);

  useEffect(() => {
    setIncomeDraft(toMoneyInput(user?.monthlyIncomeEstimate));
    setFixedDraft(toMoneyInput(user?.monthlyFixedExpenseEstimate));
    setVariableDraft(toMoneyInput(user?.monthlyVariableExpenseEstimate));
    setSavingAmountDraft(toMoneyInput(user?.monthlySavingTargetAmount));
    setSavingPctDraft(toMoneyInput(user?.monthlySavingTargetPct));
  }, [
    user?.monthlyFixedExpenseEstimate,
    user?.monthlyIncomeEstimate,
    user?.monthlySavingTargetAmount,
    user?.monthlySavingTargetPct,
    user?.monthlyVariableExpenseEstimate,
  ]);

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

  const updateSetting = async (key: keyof Pick<NotificationSettings, 'emailNotifications' | 'weeklySummary' | 'budgetAlerts' | 'twoFactor' | 'marketingConsent'>) => {
    const nextValue = !settings[key];
    setSettings((current) => ({ ...current, [key]: nextValue }));

    try {
      const remoteSettings = await privacyService.updateSettings({ [key]: nextValue });
      setSettings({ ...DEFAULT_SETTINGS, ...remoteSettings });
    } catch {
      setMessage('No se pudo guardar la preferencia en el servidor. El cambio queda temporal en este navegador.');
    }
  };

  const openEditProfile = () => {
    const phoneParts = splitPhoneNumber(user?.phoneNumber, user?.country);
    setFullNameDraft(user?.fullName?.trim() ?? '');
    setCurrency(selectedCurrency);
    setCountryDraft(user?.country ?? 'DO');
    setTimezoneDraft(user?.timezone ?? 'America/Santo_Domingo');
    setPhoneCountryDraft(phoneParts.countryCode);
    setPhoneLocalDraft(phoneParts.localNumber);
    setIncomeDraft(toMoneyInput(user?.monthlyIncomeEstimate));
    setFixedDraft(toMoneyInput(user?.monthlyFixedExpenseEstimate));
    setVariableDraft(toMoneyInput(user?.monthlyVariableExpenseEstimate));
    setSavingAmountDraft(toMoneyInput(user?.monthlySavingTargetAmount));
    setSavingPctDraft(toMoneyInput(user?.monthlySavingTargetPct));
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
      const savingPct = parseMoneyInput(savingPctDraft);
      if (savingPct > 100) {
        setMessage('La meta de ahorro en porcentaje no puede ser mayor a 100%.');
        return;
      }

      const updated = await profileService.updatePreferences({
        fullName,
        primaryCurrency: currency,
        country: countryDraft,
        timezone: timezoneDraft,
        phoneNumber: buildPhoneNumber(selectedPhoneOption.dialCode, phoneLocalDraft),
        monthlyIncomeEstimate: parseMoneyInput(incomeDraft),
        monthlyFixedExpenseEstimate: parseMoneyInput(fixedDraft),
        monthlyVariableExpenseEstimate: parseMoneyInput(variableDraft),
        monthlySavingTargetAmount: parseMoneyInput(savingAmountDraft),
        monthlySavingTargetPct: savingPct,
      });
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
      await authService.logout(accessToken, refreshToken);
    } catch {
      // El cierre local debe continuar aunque el servidor no responda.
    } finally {
      clearAuth();
      router.replace('/auth/login');
    }
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    setMessage(null);

    try {
      await profileService.deleteMe();
      clearAuth();
      router.replace('/auth/login');
    } catch {
      setMessage('No se pudo eliminar la cuenta. Inténtalo nuevamente.');
      setDeleteOpen(false);
    } finally {
      setDeletingAccount(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email || sendingPasswordReset) return;

    setSendingPasswordReset(true);
    setPasswordResetError(null);
    setPasswordResetSent(false);
    setMessage(null);

    try {
      await authService.forgotPassword(user.email);
      setPasswordResetSent(true);
      setMessage(`Te enviamos un enlace para cambiar la contraseña a ${user.email}.`);
    } catch {
      setPasswordResetError('No se pudo enviar el enlace de cambio de contraseña. Inténtalo nuevamente.');
    } finally {
      setSendingPasswordReset(false);
    }
  };

  const handleExport = async (format: 'json' | 'csv' | 'xls' | 'pdf') => {
    setExportingFormat(format);
    setMessage(null);

    try {
      const payload = await profileService.exportAccountData();

      if (format === 'json') {
        downloadBlob(
          exportFileName('json'),
          new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' }),
        );
      }

      if (format === 'csv') {
        downloadBlob(exportFileName('csv'), new Blob([buildCsvExport(payload)], { type: 'text/csv;charset=utf-8' }));
      }

      if (format === 'xls') {
        downloadBlob(
          exportFileName('xls'),
          new Blob([buildExcelHtml(payload)], { type: 'application/vnd.ms-excel;charset=utf-8' }),
        );
      }

      if (format === 'pdf') {
        downloadBlob(exportFileName('pdf'), buildPdfReport(payload));
      }

      setMessage('Exportación generada correctamente.');
    } catch {
      setMessage('No se pudo generar la exportación. Inténtalo nuevamente.');
    } finally {
      setExportingFormat(null);
    }
  };

  const handleImportFile = async (file: File | null) => {
    if (!file || !user) return;

    setImportingProfile(true);
    setMessage(null);

    try {
      const imported = parseImportedProfile(await file.text(), file.name);
      const updated = await profileService.updatePreferences({
        fullName: typeof imported.fullName === 'string' ? imported.fullName : user.fullName ?? undefined,
        primaryCurrency: safeCurrency(imported.primaryCurrency ?? user.primaryCurrency),
        country: typeof imported.country === 'string' ? imported.country : user.country ?? undefined,
        timezone: typeof imported.timezone === 'string' ? imported.timezone : user.timezone ?? undefined,
        phoneNumber: typeof imported.phoneNumber === 'string' ? imported.phoneNumber : user.phoneNumber ?? undefined,
        monthlyIncomeEstimate: Number(imported.monthlyIncomeEstimate ?? user.monthlyIncomeEstimate ?? 0),
        monthlyFixedExpenseEstimate: Number(imported.monthlyFixedExpenseEstimate ?? user.monthlyFixedExpenseEstimate ?? 0),
        monthlyVariableExpenseEstimate: Number(imported.monthlyVariableExpenseEstimate ?? user.monthlyVariableExpenseEstimate ?? 0),
        monthlySavingTargetAmount: Number(imported.monthlySavingTargetAmount ?? user.monthlySavingTargetAmount ?? 0),
        monthlySavingTargetPct: Number(imported.monthlySavingTargetPct ?? user.monthlySavingTargetPct ?? 0),
      });
      setAuth(normalizeProfile(user, updated), accessToken, refreshToken);
      setMessage('Perfil importado correctamente.');
    } catch {
      setMessage('No se pudo importar el archivo. Usa un JSON exportado por MONI o un CSV de campo,valor.');
    } finally {
      setImportingProfile(false);
      if (importInputRef.current) importInputRef.current.value = '';
    }
  };

  const handleRecordDataConsent = async () => {
    setMessage(null);

    try {
      await privacyService.recordConsent('data_processing', true);
      const remoteSettings = await privacyService.getSettings();
      setSettings({ ...DEFAULT_SETTINGS, ...remoteSettings });
      setMessage('Consentimiento de tratamiento de datos registrado.');
    } catch {
      setMessage('No se pudo registrar el consentimiento. Inténtalo nuevamente.');
    }
  };

  return (
    <>
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader
          title="Perfil"
          description="Administra tu información personal y las preferencias de tu cuenta."
        />

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
            <InfoRow
              label="Teléfono"
              value={formatPhoneForDisplay(user?.phoneNumber, user?.country)}
              muted={!user?.phoneNumber}
            />
            <InfoRow label="Moneda" value={CURRENCY_LABELS[selectedCurrency]} />
            <InfoRow label="Ingreso mensual estimado" value={formatMoney(user?.monthlyIncomeEstimate, selectedCurrency)} />
            <InfoRow label="Gastos fijos estimados" value={formatMoney(user?.monthlyFixedExpenseEstimate, selectedCurrency)} />
            <InfoRow label="Gastos variables estimados" value={formatMoney(user?.monthlyVariableExpenseEstimate, selectedCurrency)} />
            <InfoRow label="Meta de ahorro" value={`${formatMoney(user?.monthlySavingTargetAmount, selectedCurrency)} · ${Number(user?.monthlySavingTargetPct ?? 0)}%`} />
            <InfoRow label="País" value={countryLabel(user?.country)} muted={!user?.country} />
            <InfoRow label="Zona horaria" value={timezoneLabel(user?.timezone)} muted={!user?.timezone} />
          </dl>
        </SectionCard>

        <SectionCard icon={Bell} title="Notificaciones">
          <PreferenceRow
            icon={Mail}
            iconClassName="bg-blue-50 text-blue-600"
            title="Notificaciones por correo"
            description="Alertas de transacciones y metas"
            checked={settings.emailNotifications}
            onToggle={() => void updateSetting('emailNotifications')}
          />
          <PreferenceRow
            icon={CreditCard}
            iconClassName="bg-emerald-50 text-emerald-600"
            title="Resumen semanal"
            description="Informe de gastos cada lunes"
            checked={settings.weeklySummary}
            onToggle={() => void updateSetting('weeklySummary')}
          />
          <PreferenceRow
            icon={AlertTriangle}
            iconClassName="bg-amber-50 text-amber-500"
            title="Alertas de presupuesto"
            description="Aviso al llegar al 80% del límite"
            checked={settings.budgetAlerts}
            onToggle={() => void updateSetting('budgetAlerts')}
          />
        </SectionCard>

        <SectionCard icon={Shield} title="Seguridad">
          <ActionRow
            icon={Lock}
            iconClassName="bg-blue-50 text-blue-600"
            title="Contraseña"
            description="Última actualización no disponible"
            actionLabel={sendingPasswordReset ? 'Enviando...' : 'Cambiar'}
            actionClassName="text-indigo-600"
            disabled={sendingPasswordReset}
            onClick={() => {
              setPasswordResetSent(false);
              setPasswordResetError(null);
              setPasswordResetOpen(true);
            }}
          />
          <PreferenceRow
            icon={Shield}
            iconClassName="bg-emerald-50 text-emerald-600"
            title="Autenticación en dos pasos"
            description="Añade una capa extra de seguridad"
            checked={settings.twoFactor}
            onToggle={() => void updateSetting('twoFactor')}
          />
        </SectionCard>

        <SectionCard icon={FileDown} title="Datos y privacidad">
          <div className="border-t border-slate-100 px-5 py-4 sm:px-6">
            <p className="text-sm leading-6 text-slate-500">
              Exporta una copia de tu perfil y datos financieros. También puedes importar una configuración básica de perfil desde JSON o CSV.
            </p>
            <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-black text-slate-950">Consentimiento de datos</p>
                  <p className="mt-1 text-xs font-semibold text-slate-400">
                    {settings.dataProcessingConsentAt
                      ? `Registrado el ${new Date(settings.dataProcessingConsentAt).toLocaleDateString('es-DO')}`
                      : 'Pendiente de registro formal'}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={Boolean(settings.dataProcessingConsentAt)}
                  onClick={() => void handleRecordDataConsent()}
                  className="inline-flex min-h-10 items-center justify-center rounded-xl border border-indigo-100 bg-white px-4 text-xs font-black text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {settings.dataProcessingConsentAt ? 'Registrado' : 'Registrar'}
                </button>
              </div>
            </div>
            <PreferenceRow
              icon={Mail}
              iconClassName="bg-indigo-50 text-indigo-600"
              title="Comunicaciones comerciales"
              description="Permite recibir novedades de MONI"
              checked={settings.marketingConsent}
              onToggle={() => void updateSetting('marketingConsent')}
            />
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {[
                { format: 'json' as const, label: 'Exportar JSON', icon: FileText },
                { format: 'csv' as const, label: 'Exportar CSV', icon: FileSpreadsheet },
                { format: 'xls' as const, label: 'Exportar Excel', icon: FileSpreadsheet },
                { format: 'pdf' as const, label: 'Exportar PDF', icon: FileDown },
              ].map(({ format, label, icon: Icon }) => (
                <button
                  key={format}
                  type="button"
                  disabled={exportingFormat !== null || importingProfile}
                  onClick={() => void handleExport(format)}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {exportingFormat === format ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
                  {label}
                </button>
              ))}
            </div>
            <input
              ref={importInputRef}
              type="file"
              accept=".json,.csv,.txt"
              className="hidden"
              onChange={(event) => void handleImportFile(event.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              disabled={exportingFormat !== null || importingProfile}
              onClick={() => importInputRef.current?.click()}
              className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-black text-white shadow-sm shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {importingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Importar perfil
            </button>
          </div>
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
        description="Corrige tus datos personales y financieros si te equivocaste al configurar la aplicación."
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
        <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
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

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="profileCountry" className="block text-sm font-bold text-slate-950">
              País
            </label>
            <select
              id="profileCountry"
              value={countryDraft}
              onChange={(event) => setCountryDraft(event.target.value)}
              className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            >
              {COUNTRY_OPTIONS.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="profileTimezone" className="block text-sm font-bold text-slate-950">
              Zona horaria
            </label>
            <select
              id="profileTimezone"
              value={timezoneDraft}
              onChange={(event) => setTimezoneDraft(event.target.value)}
              className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            >
              {TIMEZONE_OPTIONS.map((timezone) => (
                <option key={timezone.value} value={timezone.value}>
                  {timezone.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label htmlFor="profilePhone" className="block text-sm font-bold text-slate-950">
          Número de teléfono
        </label>
        <div className="mt-2 grid grid-cols-[minmax(7.5rem,9rem)_1fr] gap-2">
          <select
            aria-label="Código telefónico"
            value={phoneCountryDraft}
            onChange={(event) => {
              const nextCountry = event.target.value;
              setPhoneCountryDraft(nextCountry);
              setPhoneLocalDraft((current) => formatPhoneLocalInput(current, nextCountry));
            }}
            className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          >
            {PHONE_COUNTRY_OPTIONS.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>
          <input
            id="profilePhone"
            type="tel"
            inputMode="numeric"
            pattern="[0-9\-]*"
            value={phoneLocalDraft}
            onChange={(event) => setPhoneLocalDraft(formatPhoneLocalInput(event.target.value, phoneCountryDraft))}
            placeholder={selectedPhoneOption.placeholder}
            className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="profileIncome" className="block text-sm font-bold text-slate-950">
              Ingreso mensual estimado
            </label>
            <input
              id="profileIncome"
              type="number"
              min="0"
              step="0.01"
              value={incomeDraft}
              onChange={(event) => setIncomeDraft(event.target.value)}
              placeholder="0.00"
              className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            />
          </div>
          <div>
            <label htmlFor="profileSavingPct" className="block text-sm font-bold text-slate-950">
              Ahorro meta (%)
            </label>
            <input
              id="profileSavingPct"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={savingPctDraft}
              onChange={(event) => setSavingPctDraft(event.target.value)}
              placeholder="0"
              className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            />
          </div>
          <div>
            <label htmlFor="profileFixed" className="block text-sm font-bold text-slate-950">
              Gastos fijos mensuales
            </label>
            <input
              id="profileFixed"
              type="number"
              min="0"
              step="0.01"
              value={fixedDraft}
              onChange={(event) => setFixedDraft(event.target.value)}
              placeholder="0.00"
              className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            />
          </div>
          <div>
            <label htmlFor="profileVariable" className="block text-sm font-bold text-slate-950">
              Gastos variables mensuales
            </label>
            <input
              id="profileVariable"
              type="number"
              min="0"
              step="0.01"
              value={variableDraft}
              onChange={(event) => setVariableDraft(event.target.value)}
              placeholder="0.00"
              className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            />
          </div>
        </div>

        <label htmlFor="profileSavingAmount" className="block text-sm font-bold text-slate-950">
          Ahorro meta mensual
        </label>
        <input
          id="profileSavingAmount"
          type="number"
          min="0"
          step="0.01"
          value={savingAmountDraft}
          onChange={(event) => setSavingAmountDraft(event.target.value)}
          placeholder="0.00"
          className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
        />
        </div>
      </Modal>

      <Modal
        open={passwordResetOpen}
        title="Cambiar contraseña"
        description="Te enviaremos un enlace seguro al correo de tu cuenta."
        onClose={() => {
          if (sendingPasswordReset) return;
          setPasswordResetOpen(false);
        }}
        footer={
          <>
            <button
              type="button"
              onClick={() => setPasswordResetOpen(false)}
              disabled={sendingPasswordReset}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={() => void handlePasswordReset()}
              disabled={sendingPasswordReset || passwordResetSent}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white shadow-sm shadow-indigo-600/25 transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {sendingPasswordReset ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              {passwordResetSent ? 'Enlace enviado' : 'Enviar enlace'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Correo de recuperación</p>
            <p className="mt-1 text-sm font-bold text-slate-950">{displayEmail}</p>
          </div>

          {passwordResetSent ? (
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              Revisa tu correo y sigue el enlace para crear una nueva contraseña.
            </div>
          ) : (
            <p className="text-sm leading-6 text-slate-500">
              Al continuar, MONI enviará un enlace de recuperación. Por seguridad, el cambio se completa desde tu correo.
            </p>
          )}

          {passwordResetError ? (
            <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {passwordResetError}
            </div>
          ) : null}
        </div>
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
        message="Se eliminarán tu perfil y los datos financieros guardados en MONI. Esta acción no se puede deshacer."
        confirmLabel="Eliminar cuenta"
        cancelLabel="Cancelar"
        loading={deletingAccount}
        onConfirm={() => void handleDeleteAccount()}
        onClose={() => setDeleteOpen(false)}
      />
    </>
  );
}
