'use client';

import { Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { forwardRef, useState, type InputHTMLAttributes } from 'react';

type PasswordInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label, error, id, ...props }, ref) => {
    const [isVisible, setIsVisible] = useState(false);

    return (
      <div className="space-y-2">
        <label htmlFor={id} className="block text-sm font-semibold text-slate-950">
          {label}
        </label>
        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            ref={ref}
            id={id}
            type={isVisible ? 'text' : 'password'}
            className="h-14 w-full rounded-2xl border border-slate-200/90 bg-white/80 px-12 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            {...props}
          />
          <button
            type="button"
            aria-label={isVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            onClick={() => setIsVisible((current) => !current)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-950 focus:outline-none"
          >
            {isVisible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
      </div>
    );
  },
);

PasswordInput.displayName = 'PasswordInput';
