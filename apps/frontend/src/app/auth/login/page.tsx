'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { AxiosError } from 'axios';
import { Apple, Mail } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { AuthShell } from '@/components/auth/AuthShell';
import { AuthTextInput } from '@/components/auth/AuthTextInput';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { SocialAuthButton } from '@/components/auth/SocialAuthButton';
import { loginSchema, type LoginFormValues } from '@/features/auth/schemas/auth.schema';
import { authService } from '@/features/auth/services/auth.service';
import { useAuthStore } from '@/store/slices/auth.store';

function GoogleIcon() {
  return <span className="text-xl font-black text-blue-600">G</span>;
}

type ApiErrorResponse = {
  code?: string;
  message?: string | string[];
};

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

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);

    try {
      const response = await authService.login(values);
      setAuth(response.user, response.accessToken, response.refreshToken);

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
          setServerError('Debes confirmar tu correo antes de iniciar sesion.');
          return;
        }

        if (error.response?.status === 401) {
          setServerError('Credenciales invalidas. Revisa tu correo y contrasena.');
          return;
        }
      }

      setServerError('No se pudo iniciar sesion. Intenta nuevamente.');
    }
  };

  return (
    <AuthShell
      helperText="Don't have an account?"
      helperHref="/auth/register"
      helperAction="Sign Up"
      marketingTitle="The smartest way to take control of your finances"
      marketingVariant="login"
    >
      <div className="mx-auto mt-16 w-full max-w-2xl lg:mt-24">
        <div>
          <h1 className="text-5xl font-black tracking-tight text-slate-950 sm:text-6xl">Welcome Back</h1>
          <p className="mt-5 max-w-md text-lg leading-8 text-slate-500">
            Sign in to manage your money, budgets, goals, and expenses.
          </p>
        </div>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <SocialAuthButton icon={<GoogleIcon />}>Log in with Google</SocialAuthButton>
          <SocialAuthButton icon={<Apple className="h-5 w-5 text-black" />}>Log in with Apple</SocialAuthButton>
        </div>

        <div className="my-8 flex items-center gap-5 text-sm font-medium text-slate-500">
          <span className="h-px flex-1 bg-slate-200" />
          or
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <AuthTextInput
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="Enter your email"
            icon={<Mail className="h-5 w-5" />}
            error={errors.email?.message}
            {...register('email')}
          />

          <PasswordInput
            id="password"
            label="Password"
            autoComplete="current-password"
            placeholder="Enter your password"
            error={errors.password?.message}
            {...register('password')}
          />

          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-sm font-bold text-blue-600 transition hover:text-blue-700">
              Forgot password?
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
            {isSubmitting ? 'Signing in...' : 'Login'}
          </button>
        </form>
      </div>
    </AuthShell>
  );
}
