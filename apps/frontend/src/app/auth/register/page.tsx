'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { AxiosError } from 'axios';
import { Apple, Mail, UserRound } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { AuthShell } from '@/components/auth/AuthShell';
import { AuthTextInput } from '@/components/auth/AuthTextInput';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { SocialAuthButton } from '@/components/auth/SocialAuthButton';
import { registerSchema, type RegisterFormValues } from '@/features/auth/schemas/auth.schema';
import { authService } from '@/features/auth/services/auth.service';
import { useAuthStore } from '@/store/slices/auth.store';

function GoogleIcon() {
  return <span className="text-xl font-black text-blue-600">G</span>;
}

type ApiErrorResponse = {
  message?: string | string[];
};

const getErrorMessage = (message: ApiErrorResponse['message']) => {
  if (Array.isArray(message)) {
    return message.join(' ');
  }

  return message;
};

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setServerError(null);
    setSuccessMessage(null);

    try {
      const response = await authService.register({
        email: values.email,
        password: values.password,
        fullName: values.fullName,
      });

      if (response.status === 'email_confirmation_required') {
        clearAuth();
        setSuccessMessage(response.message);
        return;
      }

      setAuth(response.user, response.accessToken, response.refreshToken);
      router.push('/onboarding/financial-profile');
    } catch (error) {
      if (error instanceof AxiosError) {
        const data = error.response?.data as ApiErrorResponse | undefined;
        const message = getErrorMessage(data?.message);

        if (error.response?.status === 409) {
          setServerError('Este correo ya esta registrado. Intenta iniciar sesion.');
          return;
        }

        if (error.response?.status === 429) {
          setServerError(message ?? 'Demasiados intentos de registro. Espera unos minutos antes de volver a intentarlo.');
          return;
        }

        if (error.response?.status === 400 && message) {
          setServerError(message);
          return;
        }
      }

      setServerError('No se pudo crear la cuenta. Revisa los datos e intenta nuevamente.');
    }
  };

  return (
    <AuthShell
      helperText="Already have an account?"
      helperHref="/auth/login"
      helperAction="Login"
      marketingTitle="Build better money habits from day one"
      marketingVariant="register"
    >
      <div className="mx-auto mt-12 w-full max-w-2xl lg:mt-16">
        <div>
          <h1 className="text-5xl font-black tracking-tight text-slate-950 sm:text-6xl">Create Account</h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-500">
            Start your financial journey with SmartWallet and organize your money with confidence.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row">
          <SocialAuthButton icon={<GoogleIcon />}>Sign up with Google</SocialAuthButton>
          <SocialAuthButton icon={<Apple className="h-5 w-5 text-black" />}>Sign up with Apple</SocialAuthButton>
        </div>

        <div className="my-7 flex items-center gap-5 text-sm font-medium text-slate-500">
          <span className="h-px flex-1 bg-slate-200" />
          or
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <div className="grid gap-5 sm:grid-cols-2">
            <AuthTextInput
              id="fullName"
              label="Full Name"
              type="text"
              autoComplete="name"
              placeholder="Enter your full name"
              icon={<UserRound className="h-5 w-5" />}
              error={errors.fullName?.message}
              {...register('fullName')}
            />

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
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <PasswordInput
              id="password"
              label="Password"
              autoComplete="new-password"
              placeholder="Enter your password"
              error={errors.password?.message}
              {...register('password')}
            />

            <PasswordInput
              id="confirmPassword"
              label="Confirm Password"
              autoComplete="new-password"
              placeholder="Confirm your password"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-start gap-3 text-sm font-medium text-slate-600">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                {...register('acceptTerms')}
              />
              <span>
                I agree to the{' '}
                <Link href="/terms" className="font-bold text-blue-600 hover:text-blue-700">
                  Terms
                </Link>{' '}
                &{' '}
                <Link href="/privacy" className="font-bold text-blue-600 hover:text-blue-700">
                  Privacy Policy
                </Link>
              </span>
            </label>
            {errors.acceptTerms?.message ? (
              <p className="text-sm font-medium text-rose-600">{errors.acceptTerms.message}</p>
            ) : null}
          </div>

          {serverError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {serverError}
            </div>
          ) : null}

          {successMessage ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              {successMessage}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="h-[60px] w-full rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 text-base font-bold text-white shadow-xl shadow-blue-600/25 transition hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-blue-600/30 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
          >
            {isSubmitting ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
      </div>
    </AuthShell>
  );
}
