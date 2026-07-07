'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { AxiosError } from 'axios';
import { Mail } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { AuthShell } from '@/components/auth/AuthShell';
import { AuthTextInput } from '@/components/auth/AuthTextInput';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { loginSchema, type LoginFormValues } from '@/features/auth/schemas/auth.schema';
import { authService } from '@/features/auth/services/auth.service';
import { useAuthStore } from '@/store/slices/auth.store';

type ApiErrorResponse = {
  code?: string;
  message?: string | string[];
};

const REMEMBERED_EMAIL_KEY = 'moni-remembered-email';

const getErrorMessage = (message: ApiErrorResponse['message']) => {
  if (Array.isArray(message)) {
    return message.join(' ');
  }

  return message ?? '';
};

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [serverError, setServerError] = useState<string | null>(null);
  const [rememberUser, setRememberUser] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    const rememberedEmail = window.localStorage.getItem(REMEMBERED_EMAIL_KEY);
    if (!rememberedEmail) return;

    setValue('email', rememberedEmail, { shouldDirty: false });
    setRememberUser(true);
  }, [setValue]);

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);

    try {
      const response = await authService.login(values);
      setAuth(response.user, response.accessToken, response.refreshToken);
      if (rememberUser) {
        window.localStorage.setItem(REMEMBERED_EMAIL_KEY, values.email);
      } else {
        window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }

      if (!response.user.onboardingCompletedAt) {
        router.replace('/onboarding/financial-profile');
        return;
      }

      router.replace('/dashboard');
    } catch (error) {
      if (error instanceof AxiosError) {
        const data = error.response?.data as ApiErrorResponse | undefined;
        const message = getErrorMessage(data?.message);

        if (
          error.response?.status === 403 &&
          (data?.code === 'email_not_confirmed' || /confirm/i.test(message))
        ) {
          setServerError('Debes confirmar tu correo antes de iniciar sesión.');
          return;
        }

        if (error.response?.status === 401) {
          setServerError('Credenciales inválidas. Revisa tu correo y contraseña.');
          return;
        }
      }

      setServerError('No se pudo iniciar sesión. Intenta nuevamente.');
    }
  };

  return (
    <AuthShell
      helperText="¿No tienes cuenta?"
      helperHref="/auth/register"
      helperAction="Crear cuenta"
      marketingTitle="Control claro para tus decisiones financieras"
      marketingVariant="login"
    >
      <div className="mx-auto mt-12 w-full max-w-2xl lg:mt-16">
        <div>
          <h1 className="text-5xl font-black tracking-tight text-slate-950 sm:text-6xl">Bienvenido</h1>
          <p className="mt-4 max-w-xl text-lg leading-8 text-slate-500">
            Entra a tu panel para controlar tu dinero con más claridad:
            presupuestos, metas, gastos y movimientos en un solo lugar.
          </p>
          <div className="mt-5 grid gap-3 text-sm font-bold text-slate-600 sm:grid-cols-3">
            <span className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-blue-700">
              Panel financiero
            </span>
            <span className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-indigo-700">
              Metas y ahorro
            </span>
            <span className="rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3 text-violet-700">
              Gastos claros
            </span>
          </div>
        </div>

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

          <PasswordInput
            id="password"
            label="Contraseña"
            autoComplete="current-password"
            placeholder="Ingresa tu contraseña"
            error={errors.password?.message}
            {...register('password')}
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-600">
              <input
                type="checkbox"
                checked={rememberUser}
                onChange={(event) => setRememberUser(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Recordar usuario
            </label>
            <Link href="/forgot-password" className="text-sm font-bold text-blue-600 transition hover:text-blue-700">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          {serverError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {serverError}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="h-[60px] w-full rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 text-base font-bold text-white shadow-xl shadow-blue-600/25 transition hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-blue-600/30 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
          >
            {isSubmitting ? 'Iniciando sesión...' : 'Entrar'}
          </button>
        </form>
      </div>
    </AuthShell>
  );
}
