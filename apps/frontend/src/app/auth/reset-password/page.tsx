'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { AxiosError } from 'axios';
import { CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { AuthShell } from '@/components/auth/AuthShell';
import { PasswordInput } from '@/components/auth/PasswordInput';
import {
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from '@/features/auth/schemas/auth.schema';
import { authService } from '@/features/auth/services/auth.service';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const [token, setToken] = useState(
    searchParams.get('token') ?? searchParams.get('token_hash') ?? '',
  );
  const [serverError, setServerError] = useState<string | null>(null);
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const recoveryToken = hashParams.get('access_token');
    if (recoveryToken) setToken(recoveryToken);
  }, []);

  const onSubmit = async ({ password }: ResetPasswordFormValues) => {
    setServerError(null);
    if (!token) {
      setServerError('El enlace de recuperación no es válido o está incompleto.');
      return;
    }
    try {
      await authService.resetPassword(token, password);
      setPasswordUpdated(true);
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 400) {
        setServerError('El enlace expiró o ya fue utilizado. Solicita uno nuevo.');
        return;
      }
      setServerError('No pudimos actualizar la contraseña. Intenta nuevamente.');
    }
  };

  return (
    <AuthShell
      helperText="¿Ya puedes entrar?"
      helperHref="/auth/login"
      helperAction="Iniciar sesión"
      marketingTitle="Protege tu cuenta con una contraseña nueva"
    >
      <div className="mx-auto mt-12 w-full max-w-2xl lg:mt-20">
        <h1 className="text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">Crear nueva contraseña</h1>
        <p className="mt-4 max-w-xl text-lg leading-8 text-slate-500">Elige una contraseña segura de al menos 8 caracteres.</p>

        {passwordUpdated ? (
          <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-800">
            <CheckCircle2 className="h-8 w-8" />
            <p className="mt-3 text-lg font-bold">Contraseña actualizada</p>
            <p className="mt-1 text-sm">Ya puedes iniciar sesión con tu nueva contraseña.</p>
            <Link href="/auth/login" className="mt-5 inline-flex font-bold text-blue-600 hover:text-blue-700">Ir a iniciar sesión</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5" noValidate>
            <PasswordInput id="password" label="Nueva contraseña" autoComplete="new-password" placeholder="Ingresa tu nueva contraseña" error={errors.password?.message} {...register('password')} />
            <PasswordInput id="confirmPassword" label="Confirmar contraseña" autoComplete="new-password" placeholder="Confirma tu nueva contraseña" error={errors.confirmPassword?.message} {...register('confirmPassword')} />
            {serverError ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{serverError}</div> : null}
            {!token ? <p className="text-sm font-medium text-slate-500">Solicita un enlace nuevo desde <Link href="/auth/forgot-password" className="font-bold text-blue-600">recuperar contraseña</Link>.</p> : null}
            <button type="submit" disabled={isSubmitting || !token} className="h-[60px] w-full rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 font-bold text-white shadow-xl shadow-blue-600/25 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70">
              {isSubmitting ? 'Actualizando...' : 'Actualizar contraseña'}
            </button>
          </form>
        )}
      </div>
    </AuthShell>
  );
}
