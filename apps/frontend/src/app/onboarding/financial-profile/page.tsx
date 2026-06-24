'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { AxiosError } from 'axios';
import {
  ArrowRight,
  BadgeDollarSign,
  Loader2,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import {
  useFieldArray,
  useForm,
  type FieldErrors,
  type UseFormRegister,
} from 'react-hook-form';
import { MoniLogo } from '@/components/auth/MoniLogo';
import {
  FINANCIAL_ITEM_FREQUENCIES,
  FREQUENCY_LABELS,
  financialOnboardingSchema,
  toMonthlyAmount,
  type FinancialItemFormValues,
  type FinancialItemFrequencyValue,
  type FinancialOnboardingFormValues,
} from '@/features/financial-profile/schemas/financial-profile.schema';
import {
  financialProfileService,
  type CompleteFinancialOnboardingPayload,
  type FinancialItemPayload,
} from '@/features/financial-profile/services/financial-profile.service';
import { useAuthStore } from '@/store/slices/auth.store';

const currencyOptions = [
  { value: 'DOP', label: 'DOP - Peso dominicano' },
  { value: 'USD', label: 'USD - Dólar estadounidense' },
  { value: 'EUR', label: 'EUR - Euro' },
] as const;

const INCOME_PLACEHOLDERS = ['Salario', 'Freelance', 'Renta', 'Inversiones'];
const FIXED_EXPENSE_PLACEHOLDERS = ['Renta', 'Telefono', 'Gimnasio', 'Suscripciones', 'Transporte fijo'];
const VARIABLE_EXPENSE_PLACEHOLDERS = [
  'Supermercado',
  'Restaurantes',
  'Transporte',
  'Entretenimiento',
  'Compras personales',
];

type ArrayName = 'incomeSources' | 'fixedExpenses' | 'variableExpenses';

const createEmptyItem = (): FinancialItemFormValues =>
  ({
    name: '',
    amount: undefined,
    frequency: 'monthly',
    categoryName: '',
    notes: '',
  }) as unknown as FinancialItemFormValues;

const getStoredToken = (key: 'accessToken' | 'refreshToken') => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(key);
};

const sumMonthly = (items?: Array<{ amount?: unknown; frequency?: unknown }>): number =>
  (items ?? []).reduce((acc, item) => {
    const amount = Number(item?.amount);
    const frequency = (item?.frequency as FinancialItemFrequencyValue) ?? 'monthly';
    return acc + toMonthlyAmount(Number.isFinite(amount) ? amount : 0, frequency);
  }, 0);

const toItemPayload = (item: FinancialItemFormValues): FinancialItemPayload => ({
  name: item.name.trim(),
  amount: Number(item.amount),
  frequency: item.frequency,
  ...(item.categoryName ? { categoryName: item.categoryName } : {}),
  ...(item.notes ? { notes: item.notes } : {}),
});

type ItemFieldListProps = {
  arrayName: ArrayName;
  fields: { id: string }[];
  register: UseFormRegister<FinancialOnboardingFormValues>;
  errors: FieldErrors<FinancialOnboardingFormValues>;
  onAdd: () => void;
  onRemove: (index: number) => void;
  addLabel: string;
  namePlaceholders: string[];
  emptyHint?: string;
  minRows?: number;
};

function ItemFieldList({
  arrayName,
  fields,
  register,
  errors,
  onAdd,
  onRemove,
  addLabel,
  namePlaceholders,
  emptyHint,
  minRows = 0,
}: ItemFieldListProps) {
  const arrayErrors = errors[arrayName] as
    | (FieldErrors<FinancialItemFormValues>[] & { message?: string; root?: { message?: string } })
    | undefined;
  const arrayMessage = arrayErrors?.message ?? arrayErrors?.root?.message;

  return (
    <div className="space-y-3">
      {fields.length === 0 && emptyHint ? (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-500">
          {emptyHint}
        </p>
      ) : null}

      {fields.map((field, index) => {
        const itemErrors = (arrayErrors as Array<FieldErrors<FinancialItemFormValues>> | undefined)?.[index];
        const canRemove = fields.length > minRows;

        return (
          <div
            key={field.id}
            className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 shadow-sm"
          >
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_130px_150px_auto] sm:items-start">
              <div>
                <input
                  type="text"
                  placeholder={namePlaceholders[index % namePlaceholders.length] ?? 'Nombre'}
                  className="h-12 w-full rounded-xl border border-slate-200/90 bg-white px-3 text-sm font-medium text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  {...register(`${arrayName}.${index}.name` as const)}
                />
                {itemErrors?.name?.message ? (
                  <p className="mt-1 text-xs font-medium text-rose-600">{itemErrors.name.message}</p>
                ) : null}
              </div>

              <div>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="h-12 w-full rounded-xl border border-slate-200/90 bg-white px-3 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  {...register(`${arrayName}.${index}.amount` as const)}
                />
                {itemErrors?.amount?.message ? (
                  <p className="mt-1 text-xs font-medium text-rose-600">{itemErrors.amount.message}</p>
                ) : null}
              </div>

              <div>
                <select
                  className="h-12 w-full rounded-xl border border-slate-200/90 bg-white px-3 text-sm font-medium text-slate-950 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  {...register(`${arrayName}.${index}.frequency` as const)}
                >
                  {FINANCIAL_ITEM_FREQUENCIES.map((frequency) => (
                    <option key={frequency} value={frequency}>
                      {FREQUENCY_LABELS[frequency]}
                    </option>
                  ))}
                </select>
                {itemErrors?.frequency?.message ? (
                  <p className="mt-1 text-xs font-medium text-rose-600">{itemErrors.frequency.message}</p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => onRemove(index)}
                disabled={!canRemove}
                aria-label="Eliminar"
                className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 transition hover:border-rose-200 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:text-slate-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}

      {arrayMessage ? <p className="text-sm font-medium text-rose-600">{arrayMessage}</p> : null}

      <button
        type="button"
        onClick={onAdd}
        className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
      >
        <Plus className="h-4 w-4" />
        {addLabel}
      </button>
    </div>
  );
}

function SectionCard({
  step,
  title,
  description,
  children,
}: {
  step: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-white/80 bg-white p-6 shadow-xl shadow-slate-950/5 sm:p-8">
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-black text-white">
          {step}
        </span>
        <div>
          <h2 className="text-lg font-black tracking-tight text-slate-950">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default function FinancialProfileOnboardingPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const setAuth = useAuthStore((state) => state.setAuth);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);

  const initialCurrency = useMemo(() => {
    const currency = user?.primaryCurrency;
    return currency === 'USD' || currency === 'EUR' ? currency : 'DOP';
  }, [user?.primaryCurrency]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FinancialOnboardingFormValues>({
    resolver: zodResolver(financialOnboardingSchema),
    defaultValues: {
      primaryCurrency: initialCurrency,
      incomeSources: [
        { name: 'Salario', amount: undefined, frequency: 'monthly', categoryName: '', notes: '' },
      ],
      fixedExpenses: [],
      variableExpenses: [],
      monthlySavingTargetPct: undefined,
      monthlySavingTargetAmount: undefined,
    } as unknown as FinancialOnboardingFormValues,
  });

  const incomes = useFieldArray({ control, name: 'incomeSources' });
  const fixed = useFieldArray({ control, name: 'fixedExpenses' });
  const variable = useFieldArray({ control, name: 'variableExpenses' });

  useEffect(() => {
    const token = accessToken ?? getStoredToken('accessToken');

    if (!token) {
      router.replace('/auth/login');
      return;
    }

    setIsCheckingAuth(false);
  }, [accessToken, router]);

  const watched = watch();
  const currencyCode = watched.primaryCurrency ?? initialCurrency;

  const monthlyIncome = sumMonthly(watched.incomeSources);
  const monthlyFixed = sumMonthly(watched.fixedExpenses);
  const monthlyVariable = sumMonthly(watched.variableExpenses);
  const monthlyTotalExpense = monthlyFixed + monthlyVariable;
  const monthlyBalance = monthlyIncome - monthlyTotalExpense;

  const savingTarget = useMemo(() => {
    const amount = watched.monthlySavingTargetAmount;
    const pct = watched.monthlySavingTargetPct;
    const hasAmount = amount !== undefined && String(amount) !== '' && Number.isFinite(Number(amount));
    const hasPct = pct !== undefined && String(pct) !== '' && Number.isFinite(Number(pct));

    if (hasAmount) return Number(amount);
    if (hasPct) return (monthlyIncome * Number(pct)) / 100;
    return null;
  }, [watched.monthlySavingTargetAmount, watched.monthlySavingTargetPct, monthlyIncome]);

  const formatMoney = useMemo(() => {
    const formatter = new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 2,
    });
    return (value: number) => formatter.format(Number.isFinite(value) ? value : 0);
  }, [currencyCode]);

  const onSubmit = async (values: FinancialOnboardingFormValues) => {
    setServerError(null);

    const token = accessToken ?? getStoredToken('accessToken');
    if (!token) {
      router.replace('/auth/login');
      return;
    }

    const payload: CompleteFinancialOnboardingPayload = {
      primaryCurrency: values.primaryCurrency,
      incomeSources: values.incomeSources.map(toItemPayload),
      fixedExpenses: values.fixedExpenses.map(toItemPayload),
      variableExpenses: values.variableExpenses.map(toItemPayload),
      monthlySavingTargetPct: values.monthlySavingTargetPct,
      monthlySavingTargetAmount: values.monthlySavingTargetAmount,
    };

    try {
      const response = await financialProfileService.completeOnboarding(payload);

      if (user) {
        setAuth(
          {
            ...user,
            primaryCurrency: response.profile.primaryCurrency ?? values.primaryCurrency,
            monthlyIncomeEstimate: response.summary.monthlyIncomeEstimate,
            monthlySavingTargetPct:
              response.summary.monthlySavingTargetPct ?? user.monthlySavingTargetPct,
            monthlySavingTargetAmount: response.summary.monthlySavingTargetAmount,
            monthlyFixedExpenseEstimate: response.summary.monthlyFixedExpenseEstimate,
            monthlyVariableExpenseEstimate: response.summary.monthlyVariableExpenseEstimate,
            onboardingCompletedAt: response.profile.onboardingCompletedAt ?? new Date().toISOString(),
            onboardingVersion: response.profile.onboardingVersion ?? 1,
          },
          token,
          refreshToken ?? getStoredToken('refreshToken'),
        );
      }

      router.replace('/dashboard');
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 401) {
        setServerError('Tu sesión expiró. Inicia sesion nuevamente para continuar.');
        return;
      }

      setServerError('No se pudo guardar tu perfil financiero. Revisa los datos e intenta nuevamente.');
    }
  };

  if (isCheckingAuth) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5f7fb] px-4 text-slate-950">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-600 shadow-xl shadow-slate-950/5">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          Preparando tu perfil
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f5f7fb] px-4 py-8 text-slate-950 sm:px-6 lg:p-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.12),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(79,70,229,0.13),transparent_30%)]" />

      <div className="relative mx-auto w-full max-w-6xl">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <MoniLogo />
          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">
            Configuración de MONI
          </div>
        </header>

        <div className="mt-10 max-w-2xl">
          <h1 className="text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
            Configura tu perfil financiero
          </h1>
          <p className="mt-4 text-lg leading-8 text-slate-500">
            Captura tus ingresos y gastos estimados para que MONI personalice tu experiencia. Estos
            son montos planificados, no transacciones reales.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start" noValidate>
          <div className="space-y-6">
            <SectionCard step="A" title="Configuración general" description="Define la moneda principal de tu cuenta.">
              <div className="max-w-sm space-y-2">
                <label htmlFor="primaryCurrency" className="block text-sm font-semibold text-slate-950">
                  Moneda principal
                </label>
                <select
                  id="primaryCurrency"
                  className="h-12 w-full rounded-xl border border-slate-200/90 bg-white px-3 text-sm font-semibold text-slate-950 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  {...register('primaryCurrency')}
                >
                  {currencyOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.primaryCurrency?.message ? (
                  <p className="text-sm font-medium text-rose-600">{errors.primaryCurrency.message}</p>
                ) : null}
              </div>
            </SectionCard>

            <SectionCard
              step="B"
              title="Ingresos"
              description="Agrega tus fuentes de ingreso y la frecuencia con la que las recibes."
            >
              <ItemFieldList
                arrayName="incomeSources"
                fields={incomes.fields}
                register={register}
                errors={errors}
                onAdd={() => incomes.append(createEmptyItem())}
                onRemove={(index) => incomes.remove(index)}
                addLabel="Agregar ingreso"
                namePlaceholders={INCOME_PLACEHOLDERS}
                minRows={1}
              />
            </SectionCard>

            <SectionCard
              step="C"
              title="Gastos fijos"
              description="Gastos recurrentes que pagas cada periodo (renta, servicios, suscripciones)."
            >
              <ItemFieldList
                arrayName="fixedExpenses"
                fields={fixed.fields}
                register={register}
                errors={errors}
                onAdd={() => fixed.append(createEmptyItem())}
                onRemove={(index) => fixed.remove(index)}
                addLabel="Agregar gasto fijo"
                namePlaceholders={FIXED_EXPENSE_PLACEHOLDERS}
                emptyHint="Aún no has agregado gastos fijos. Son opcionales, pero ayudan a estimar tu balance."
              />
            </SectionCard>

            <SectionCard
              step="D"
              title="Gastos variables"
              description="Gastos que cambian mes a mes (supermercado, transporte, entretenimiento)."
            >
              <ItemFieldList
                arrayName="variableExpenses"
                fields={variable.fields}
                register={register}
                errors={errors}
                onAdd={() => variable.append(createEmptyItem())}
                onRemove={(index) => variable.remove(index)}
                addLabel="Agregar gasto variable"
                namePlaceholders={VARIABLE_EXPENSE_PLACEHOLDERS}
                emptyHint="Aún no has agregado gastos variables. Son opcionales y puedes ajustarlos luego."
              />
            </SectionCard>

            <SectionCard step="E" title="Ahorro" description="Define tu meta de ahorro mensual por porcentaje o por monto.">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="monthlySavingTargetPct" className="block text-sm font-semibold text-slate-950">
                    Meta de ahorro mensual (%)
                  </label>
                  <input
                    id="monthlySavingTargetPct"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder="20"
                    className="h-12 w-full rounded-xl border border-slate-200/90 bg-white px-3 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    {...register('monthlySavingTargetPct')}
                  />
                  {errors.monthlySavingTargetPct?.message ? (
                    <p className="text-sm font-medium text-rose-600">{errors.monthlySavingTargetPct.message}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label htmlFor="monthlySavingTargetAmount" className="block text-sm font-semibold text-slate-950">
                    Meta de ahorro mensual (monto, opcional)
                  </label>
                  <input
                    id="monthlySavingTargetAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="h-12 w-full rounded-xl border border-slate-200/90 bg-white px-3 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    {...register('monthlySavingTargetAmount')}
                  />
                  {errors.monthlySavingTargetAmount?.message ? (
                    <p className="text-sm font-medium text-rose-600">
                      {errors.monthlySavingTargetAmount.message}
                    </p>
                  ) : null}
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Si defines un monto, se usará ese valor. Si solo defines un porcentaje, se calculará sobre tus
                ingresos mensuales estimados.
              </p>
            </SectionCard>
          </div>

          <aside className="lg:sticky lg:top-10">
            <div className="rounded-[2rem] border border-white/80 bg-white p-6 shadow-2xl shadow-slate-950/10 sm:p-7">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-blue-600" />
                <h2 className="text-base font-black tracking-tight text-slate-950">Resumen mensual estimado</h2>
              </div>

              <dl className="mt-6 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="flex items-center gap-2 text-slate-500">
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                    Ingresos mensuales
                  </dt>
                  <dd className="font-bold text-slate-950">{formatMoney(monthlyIncome)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-slate-500">Gastos fijos</dt>
                  <dd className="font-semibold text-slate-700">{formatMoney(monthlyFixed)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-slate-500">Gastos variables</dt>
                  <dd className="font-semibold text-slate-700">{formatMoney(monthlyVariable)}</dd>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <dt className="flex items-center gap-2 text-slate-500">
                    <TrendingDown className="h-4 w-4 text-rose-500" />
                    Gastos totales
                  </dt>
                  <dd className="font-bold text-slate-950">{formatMoney(monthlyTotalExpense)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-slate-500">Balance mensual</dt>
                  <dd className={`font-black ${monthlyBalance < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {formatMoney(monthlyBalance)}
                  </dd>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-blue-50 px-4 py-3">
                  <dt className="flex items-center gap-2 font-semibold text-blue-700">
                    <BadgeDollarSign className="h-4 w-4" />
                    Meta de ahorro
                  </dt>
                  <dd className="font-black text-blue-700">
                    {savingTarget === null ? '-' : formatMoney(savingTarget)}
                  </dd>
                </div>
              </dl>

              {serverError ? (
                <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                  {serverError}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-6 flex h-[56px] w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 text-base font-bold text-white shadow-xl shadow-blue-600/25 transition hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-blue-600/30 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    Finalizar y continuar
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </div>
          </aside>
        </form>
      </div>
    </main>
  );
}


