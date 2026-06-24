'use client';

import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { useEffect } from 'react';
import { MoniLogo } from '@/components/auth/MoniLogo';

export default function EmailConfirmedPage() {
  useEffect(() => {
    // Supabase appends auth tokens/params to the redirect URL. We don't use them
    // here (no auto-login), so strip query params and fragments from the address bar.
    window.history.replaceState(null, '', window.location.pathname);
  }, []);

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#f5f7fb] px-4 py-10 text-slate-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.12),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(79,70,229,0.13),transparent_30%)]" />

      <section className="relative w-full max-w-lg rounded-[2.25rem] border border-white/80 bg-white/90 px-6 py-10 text-center shadow-2xl shadow-slate-950/10 backdrop-blur-xl sm:px-12 sm:py-14">
        <header className="flex justify-center">
          <MoniLogo />
        </header>

        <div className="mt-10 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-9 w-9" />
          </div>
        </div>

        <h1 className="mt-8 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Correo confirmado</h1>
        <p className="mx-auto mt-4 max-w-md text-base leading-7 text-slate-500">
          Tu cuenta fue confirmada correctamente. Ahora puedes iniciar sesión para continuar.
        </p>

        <Link
          href="/auth/login"
          className="mt-10 inline-flex h-[60px] w-full items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 text-base font-bold text-white shadow-xl shadow-blue-600/25 transition hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-blue-600/30 focus:outline-none focus:ring-4 focus:ring-blue-100"
        >
          Ir a iniciar sesión
        </Link>
      </section>
    </main>
  );
}


