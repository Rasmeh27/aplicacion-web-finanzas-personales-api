import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';

type AuthTextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  icon?: ReactNode;
};

export const AuthTextInput = forwardRef<HTMLInputElement, AuthTextInputProps>(
  ({ label, error, icon, id, className = '', ...props }, ref) => {
    return (
      <div className="space-y-2">
        <label htmlFor={id} className="block text-sm font-semibold text-slate-950">
          {label}
        </label>
        <div className="relative">
          {icon ? <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">{icon}</div> : null}
          <input
            ref={ref}
            id={id}
            className={`h-14 w-full rounded-2xl border border-slate-200/90 bg-white/80 px-4 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 ${icon ? 'pl-12' : ''} ${className}`}
            {...props}
          />
        </div>
        {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
      </div>
    );
  },
);

AuthTextInput.displayName = 'AuthTextInput';
