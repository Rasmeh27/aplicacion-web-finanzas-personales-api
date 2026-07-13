'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, Loader2, Lock, Newspaper, RefreshCw, Search, Sparkles } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { useSubscriptionStore, selectIsPremium } from '@/store/slices/subscription.store';
import { UpgradeModal } from '@/features/subscription/components/UpgradeModal';
import { getNewsErrorMessage, isPremiumRequiredNewsError, newsService } from '../services/news.service';
import type { FinancialNewsItem } from '../types';

const DEFAULT_QUERY = 'finanzas personales OR ahorro OR inversiones';
const DEFAULT_LIMIT = 10;

const formatDate = (value: string | null) => {
  if (!value) return 'Fecha no disponible';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible';

  return new Intl.DateTimeFormat('es-DO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

function NewsLocked() {
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  return (
    <div>
      <PageHeader
        title="Noticias financieras"
        description="Consulta noticias financieras relevantes desde proveedores externos. Disponible para usuarios Premium."
      />

      <section className="mt-8 flex flex-col items-center rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm shadow-slate-950/5">
        <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-50 text-indigo-600">
          <Lock className="h-8 w-8" />
        </span>
        <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-950">
          Noticias es una función Premium
        </h2>
        <p className="mt-2 max-w-lg text-sm leading-6 text-slate-500">
          Accede a noticias financieras, contexto de mercado y temas de ahorro e inversión sin exponer la API key en el navegador.
        </p>

        <button
          type="button"
          onClick={() => setUpgradeOpen(true)}
          className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-indigo-600/25 transition hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-xl"
        >
          <Sparkles className="h-4 w-4" />
          Mejorar a Premium
        </button>
      </section>

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </div>
  );
}

function NewsArticleCard({ article }: { article: FinancialNewsItem }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-950/10">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400">
            <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-indigo-700">{article.source}</span>
            <span>{formatDate(article.publishedAt)}</span>
          </div>
          <h2 className="mt-3 text-xl font-black leading-tight text-slate-950">
            {article.title}
          </h2>
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-500">
            {article.summary || 'Esta noticia no incluye resumen disponible desde el proveedor.'}
          </p>
        </div>

        <a
          href={article.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
        >
          Leer
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </article>
  );
}

export function NewsView() {
  const subscription = useSubscriptionStore((state) => state.subscription);
  const subscriptionLoading = useSubscriptionStore((state) => state.loading);
  const refreshSubscription = useSubscriptionStore((state) => state.refresh);
  const isPremium = useSubscriptionStore(selectIsPremium);

  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [submittedQuery, setSubmittedQuery] = useState(DEFAULT_QUERY);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [items, setItems] = useState<FinancialNewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void refreshSubscription({ force: true });
  }, [refreshSubscription]);

  const loadNews = useCallback(async () => {
    if (!isPremium) return;

    setLoading(true);
    setError(null);

    try {
      const news = await newsService.search({
        q: submittedQuery.trim() || DEFAULT_QUERY,
        limit,
      });
      setItems(news);
    } catch (loadError) {
      if (isPremiumRequiredNewsError(loadError)) {
        void refreshSubscription({ force: true });
      }
      setError(getNewsErrorMessage(loadError));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [isPremium, limit, refreshSubscription, submittedQuery]);

  useEffect(() => {
    void loadNews();
  }, [loadNews]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmittedQuery(query);
  };

  const resultLabel = useMemo(() => {
    if (loading) return 'Buscando noticias...';
    if (items.length === 1) return '1 noticia encontrada';
    return `${items.length} noticias encontradas`;
  }, [items.length, loading]);

  if (subscriptionLoading && !subscription) {
    return (
      <div className="space-y-6">
        <div className="h-32 animate-pulse rounded-3xl border border-slate-200 bg-white" />
        <div className="h-72 animate-pulse rounded-3xl border border-slate-200 bg-white" />
      </div>
    );
  }

  if (!isPremium) {
    return <NewsLocked />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            Noticias financieras
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
              <Sparkles className="h-3 w-3" />
              Plan Premium
            </span>
          </span>
        }
        description="Explora titulares financieros recientes desde el backend. La API key nunca se expone al navegador."
        action={
          <button
            type="button"
            onClick={() => void loadNews()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        }
      />

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
        <form onSubmit={submitSearch} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_150px_auto]">
          <label className="relative block">
            <span className="sr-only">Buscar noticias</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ej. finanzas personales, ahorro, inversión, inflación..."
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50"
            />
          </label>

          <label className="block">
            <span className="sr-only">Cantidad</span>
            <select
              value={limit}
              onChange={(event) => setLimit(Number(event.target.value))}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50"
            >
              <option value={5}>5 noticias</option>
              <option value={10}>10 noticias</option>
              <option value={15}>15 noticias</option>
              <option value={20}>20 noticias</option>
            </select>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 text-sm font-black text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Buscar
          </button>
        </form>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
          <p className="font-bold text-slate-600">{resultLabel}</p>
          <p className="text-slate-400">Consulta actual: {submittedQuery || DEFAULT_QUERY}</p>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      ) : null}

      {loading && items.length === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
          Cargando noticias financieras...
        </div>
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <section className="grid place-items-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <Newspaper className="h-12 w-12 text-slate-300" />
          <h2 className="mt-4 text-xl font-black text-slate-950">No encontramos noticias</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
            Intenta una búsqueda más general, por ejemplo “finanzas personales” o “mercado financiero”.
          </p>
        </section>
      ) : (
        <section className="grid gap-4">
          {items.map((article) => (
            <NewsArticleCard key={`${article.url}-${article.publishedAt ?? ''}`} article={article} />
          ))}
        </section>
      )}
    </div>
  );
}
