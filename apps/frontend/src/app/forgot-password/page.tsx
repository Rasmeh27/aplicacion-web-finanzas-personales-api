'use client';

import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, ArrowLeft, CheckCircle2, Mail } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { MoniLogo } from '@/components/auth/MoniLogo';
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from '@/features/auth/schemas/auth.schema';
import { authService } from '@/features/auth/services/auth.service';

const recoverySteps = [
  'Ingresa tu correo registrado',
  'Revisa tu correo y haz clic en el enlace',
  'Crea tu nueva contraseña',
];

export default function ForgotPasswordPage() {
  const [submitState, setSubmitState] = useState<'idle' | 'success' | 'error'>('idle');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    setSubmitState('idle');

    try {
      await authService.forgotPassword(values.email);
      setSubmitState('success');
    } catch {
      setSubmitState('error');
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f5f7fb] px-4 py-6 text-slate-950 sm:px-6 lg:grid lg:place-items-center lg:p-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.12),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(79,70,229,0.13),transparent_30%)]" />
      <section className="forgot-password-card relative mx-auto grid w-full max-w-[1440px] gap-6 rounded-[2.75rem] border border-white/80 bg-white/80 p-4 shadow-2xl shadow-slate-950/10 backdrop-blur-xl lg:grid-cols-[minmax(0,1fr)_560px] lg:p-6">
        <div className="flex flex-col rounded-[2.25rem] bg-white px-5 py-8 sm:px-10 lg:px-16 lg:py-12">
          <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <MoniLogo />
            <p className="text-sm font-semibold text-slate-400 sm:text-base">
              ¿Ya tienes cuenta?{' '}
              <Link href="/auth/login" className="font-black text-indigo-500 transition hover:text-indigo-600">
                Entrar
              </Link>
            </p>
          </header>

          <div className="mx-auto mt-12 flex w-full max-w-2xl flex-1 flex-col justify-center lg:mt-16">
            <h1 className="text-5xl font-black leading-[1.05] tracking-tight text-slate-950 sm:text-6xl">
              Recuperar contraseña
            </h1>
            <p className="mt-4 max-w-xl text-lg font-medium leading-8 text-slate-500">
              Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña de forma segura.
            </p>

            <div className="mt-6 grid grid-cols-3 gap-3 text-sm font-bold text-slate-400">
              {recoverySteps.map((step, index) => {
                const isActive = index === 0;

                return (
                  <div key={step} className="flex items-center gap-3">
                    <span
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-base ${
                        isActive ? 'bg-[#665CF6] text-white shadow-lg shadow-indigo-500/25' : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span className={isActive ? 'text-indigo-500' : 'text-slate-400'}>
                      {step === 'Crea tu nueva contraseña' ? 'Nueva clave' : step.replace('Ingresa tu correo registrado', 'Correo').replace('Revisa tu correo y haz clic en el enlace', 'Verificar')}
                    </span>
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5" noValidate>
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-semibold text-slate-950">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="Ingresa tu correo"
                    className="h-14 w-full rounded-2xl border border-slate-200/90 bg-white/80 pl-12 pr-4 text-sm font-semibold text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    {...register('email')}
                  />
                </div>
                {errors.email?.message ? (
                  <p className="text-sm font-bold text-rose-600">{errors.email.message}</p>
                ) : null}
              </div>

              <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-4 text-indigo-600">
                <div className="flex gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  <p className="text-sm font-semibold leading-6">
                    Recibirás un enlace de recuperación en tu correo. Revisa también tu carpeta de spam.
                  </p>
                </div>
              </div>

              {submitState === 'success' ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5" />
                    Enlace enviado. Revisa tu correo para continuar.
                  </div>
                </div>
              ) : null}

              {submitState === 'error' ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-bold text-rose-700">
                  No pudimos enviar el enlace ahora mismo. Intenta nuevamente.
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="h-[60px] w-full rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 text-base font-bold text-white shadow-xl shadow-blue-600/25 transition hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-blue-600/30 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
              >
                {isSubmitting ? 'Enviando enlace...' : 'Enviar enlace de recuperación'}
              </button>
            </form>
          </div>

          <Link
            href="/auth/login"
            className="mt-10 inline-flex items-center gap-2 text-sm font-bold text-slate-400 transition hover:text-blue-600"
          >
            <ArrowLeft className="h-5 w-5" />
            Volver al inicio de sesión
          </Link>
        </div>

        <aside className="forgot-password-panel relative min-h-[760px] overflow-hidden rounded-[2.25rem] bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-700 p-10 text-white shadow-2xl shadow-indigo-700/25">
          <div className="absolute -right-16 top-0 h-[430px] w-[430px] rounded-full bg-white/10" />
          <div className="absolute -bottom-28 -left-8 h-[430px] w-[430px] rounded-full bg-white/10" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_16%,rgba(255,255,255,0.16),transparent_31%),radial-gradient(circle_at_27%_100%,rgba(255,255,255,0.13),transparent_32%)]" />

          <div className="relative z-10 mx-auto max-w-sm pt-10 text-center">
            <h2 className="text-4xl font-bold leading-tight tracking-tight">
              Recupera el acceso a tu cuenta
            </h2>
            <p className="mt-6 text-lg font-medium leading-8 text-white/80">
              Solo tarda unos segundos. Te guiamos paso a paso para restablecer tu contraseña de forma segura.
            </p>
            <div className="mt-8 flex justify-center gap-2">
              <span className="h-2.5 w-8 rounded-full bg-white" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/35" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/35" />
            </div>
          </div>

          <div className="relative z-10 mt-auto w-full translate-x-6 rounded-[2rem] border border-white/30 bg-white/95 p-8 text-slate-950 shadow-2xl shadow-indigo-950/30 backdrop-blur-xl">
            <MoniLogo />
            <div className="mt-8 space-y-0">
              {recoverySteps.map((step, index) => {
                const isActive = index === 0;
                const isLast = index === recoverySteps.length - 1;

                return (
                  <div key={step}>
                    <div className="flex items-center gap-5 py-4">
                      <span
                        className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-base font-black ${
                          isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25' : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {index + 1}
                      </span>
                      <span className={`text-lg font-bold leading-tight ${isActive ? 'text-indigo-600' : 'text-slate-600'}`}>
                        {step}
                      </span>
                    </div>
                    {!isLast ? <div className="ml-[4.25rem] h-px bg-slate-200" /> : null}
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
