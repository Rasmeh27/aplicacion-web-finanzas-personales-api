'use client';

import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { AxiosError } from 'axios';
import { ArrowLeft, Mail } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { AuthShell } from '@/components/auth/AuthShell';
import { AuthTextInput } from '@/components/auth/AuthTextInput';
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from '@/features/auth/schemas/auth.schema';
import { authService } from '@/features/auth/services/auth.service';

export default function ForgotPasswordPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async ({ email }: ForgotPasswordFormValues) => {
    setServerError(null);
    try {
      await authService.forgotPassword(email);
      setEmailSent(true);
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 429) {
        setServerError('Demasiados intentos. Espera unos minutos antes de intentarlo otra vez.');
        return;
      }
      setServerError('No pudimos procesar la solicitud. Intenta nuevamente.');
    }
  };

  return (
    <AuthShell
      helperText="¿Recordaste tu contraseña?"
      helperHref="/auth/login"
      helperAction="Entrar"
      marketingTitle="Recupera el acceso y vuelve a tomar el control"
    >
      <div className="mx-auto mt-12 w-full max-w-2xl lg:mt-20">
        <Link href="/auth/login" className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700">
          <ArrowLeft className="h-4 w-4" /> Volver al inicio de sesión
        </Link>
        <h1 className="mt-8 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">Recuperar contraseña</h1>
        <p className="mt-4 max-w-xl text-lg leading-8 text-slate-500">
          Ingresa el correo de tu cuenta y te enviaremos un enlace para crear una contraseña nueva.
        </p>

        {emailSent ? (
          <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-800">
            <p className="font-bold">Revisa tu correo</p>
            <p className="mt-1 text-sm leading-6">Si existe una cuenta asociada, recibirás un enlace de recuperación.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5" noValidate>
            <AuthTextInput
              id="email"
              label="Correo"
              type="email"
              autoComplete="email"
              placeholder="Ingresa tu correo"
              icon={<Mail className="h-5 w-5" />}
              error={errors.email?.message}
              {...register('email')}
            />
            {serverError ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{serverError}</div> : null}
            <button type="submit" disabled={isSubmitting} className="h-[60px] w-full rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 font-bold text-white shadow-xl shadow-blue-600/25 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70">
              {isSubmitting ? 'Enviando enlace...' : 'Enviar enlace de recuperación'}
            </button>
          </form>
        )}
      </div>
    </AuthShell>
  );
}
