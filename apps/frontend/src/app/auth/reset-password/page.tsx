'use client';

import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, CheckCircle2, KeyRound, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { MoniLogo } from '@/components/auth/MoniLogo';
import { PasswordInput } from '@/components/auth/PasswordInput';
import {
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from '@/features/auth/schemas/auth.schema';
import { authService } from '@/features/auth/services/auth.service';

type RecoveryTokens = {
  code?: string;
  tokenHash?: string;
  accessToken: string;
  refreshToken: string;
};

const RECOVERY_TOKENS_STORAGE_KEY = 'moni:password-recovery-tokens';

function readRecoveryTokens(): RecoveryTokens | null {
  if (typeof window === 'undefined') return null;

  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const queryParams = new URLSearchParams(window.location.search);
  const code = queryParams.get('code') ?? hashParams.get('code');
  const tokenHash =
    queryParams.get('token_hash') ??
    queryParams.get('tokenHash') ??
    hashParams.get('token_hash') ??
    hashParams.get('tokenHash');
  const accessToken = hashParams.get('access_token') ?? queryParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token') ?? queryParams.get('refresh_token');

  const tokens = code
    ? { code, accessToken: '', refreshToken: '' }
    : tokenHash
      ? { tokenHash, accessToken: '', refreshToken: '' }
      : accessToken && refreshToken
        ? { accessToken, refreshToken }
        : null;

  if (tokens) {
    window.sessionStorage.setItem(RECOVERY_TOKENS_STORAGE_KEY, JSON.stringify(tokens));
    return tokens;
  }

  const storedTokens = window.sessionStorage.getItem(RECOVERY_TOKENS_STORAGE_KEY);
  if (!storedTokens) return null;

  try {
    return JSON.parse(storedTokens) as RecoveryTokens;
  } catch {
    window.sessionStorage.removeItem(RECOVERY_TOKENS_STORAGE_KEY);
    return null;
  }
}

export default function ResetPasswordPage() {
  const [tokens, setTokens] = useState<RecoveryTokens | null>(null);
  const [tokenChecked, setTokenChecked] = useState(false);
  const [submitState, setSubmitState] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    const recoveryTokens = readRecoveryTokens();
    setTokens(recoveryTokens);
    setTokenChecked(true);

    if (recoveryTokens) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const tokenError = useMemo(
    () => tokenChecked && !tokens,
    [tokenChecked, tokens],
  );

  const onSubmit = async (values: ResetPasswordFormValues) => {
    setSubmitState('idle');
    setErrorMessage(null);

    if (!tokens) {
      setSubmitState('error');
      setErrorMessage('Para actualizar la contraseña debes abrir el enlace de recuperación que llegó a tu correo.');
      return;
    }

    try {
      await authService.resetPassword({
        code: tokens.code,
        tokenHash: tokens.tokenHash,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        password: values.password,
      });
      window.sessionStorage.removeItem(RECOVERY_TOKENS_STORAGE_KEY);
      setSubmitState('success');
    } catch {
      setSubmitState('error');
      setErrorMessage('No pudimos actualizar la contraseña. El enlace puede haber expirado.');
    }
  };

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#f5f7fb] px-4 py-10 text-slate-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(79,70,229,0.12),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(37,99,235,0.13),transparent_30%)]" />

      <section className="relative w-full max-w-lg rounded-[2rem] border border-white/80 bg-white/95 px-6 py-9 shadow-2xl shadow-slate-950/10 backdrop-blur-xl sm:px-10">
        <header className="flex justify-center">
          <MoniLogo />
        </header>

        <div className="mt-8 flex justify-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
            <KeyRound className="h-7 w-7" />
          </div>
        </div>

        <h1 className="mt-6 text-center text-3xl font-black tracking-tight text-slate-950">
          Crear nueva contraseña
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-center text-sm leading-6 text-slate-500">
          Escribe una contraseña segura para terminar el proceso de recuperación.
        </p>

        {tokenError ? (
          <div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm font-semibold text-amber-800">
            <div className="flex gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <p>
                Esta pantalla necesita el enlace de recuperación del correo. Puedes escribir la contraseña,
                pero solo se podrá guardar si abriste ese enlace.
              </p>
            </div>
          </div>
        ) : null}

        {submitState === 'success' ? (
          <div className="mt-7 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm font-semibold text-emerald-700">
            <div className="flex gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              <p>Contraseña actualizada correctamente. Ya puedes iniciar sesión.</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-5" noValidate>
            <PasswordInput
              id="password"
              label="Nueva contraseña"
              error={errors.password?.message}
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              {...register('password')}
            />

            <PasswordInput
              id="confirmPassword"
              label="Confirmar contraseña"
              error={errors.confirmPassword?.message}
              autoComplete="new-password"
              placeholder="Repite la contraseña"
              {...register('confirmPassword')}
            />

            {submitState === 'error' ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
                {errorMessage}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 text-base font-black text-white shadow-xl shadow-indigo-600/25 transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
              Actualizar contraseña
            </button>
          </form>
        )}

        <div className="mt-7 text-center">
          <Link href="/auth/login" className="text-sm font-black text-indigo-600 transition hover:text-indigo-700">
            Volver a iniciar sesión
          </Link>
        </div>
      </section>
    </main>
  );
}
