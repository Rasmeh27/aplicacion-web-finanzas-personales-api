import { z } from 'zod';

const numberFromInput = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? undefined : Number(value)),
    schema,
  );

const emptyToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => (typeof value === 'string' && value.trim() === '' ? undefined : value), schema);

export const FINANCIAL_ITEM_FREQUENCIES = ['weekly', 'biweekly', 'monthly', 'yearly'] as const;
export type FinancialItemFrequencyValue = (typeof FINANCIAL_ITEM_FREQUENCIES)[number];

export const FREQUENCY_LABELS: Record<FinancialItemFrequencyValue, string> = {
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
  yearly: 'Anual',
};

const financialItemSchema = z.object({
  name: z
    .string({ required_error: 'Ingresa un nombre.' })
    .min(1, 'Ingresa un nombre.')
    .max(120, 'Maximo 120 caracteres.'),
  amount: numberFromInput(
    z
      .number({
        required_error: 'Ingresa un monto.',
        invalid_type_error: 'Ingresa un monto valido.',
      })
      .min(0.01, 'El monto debe ser mayor a 0.'),
  ),
  frequency: z.enum(FINANCIAL_ITEM_FREQUENCIES, {
    required_error: 'Selecciona una frecuencia.',
    invalid_type_error: 'Selecciona una frecuencia.',
  }),
  categoryName: emptyToUndefined(z.string().max(120, 'Maximo 120 caracteres.').optional()),
  notes: emptyToUndefined(z.string().max(500, 'Maximo 500 caracteres.').optional()),
});

export const financialOnboardingSchema = z.object({
  primaryCurrency: z.enum(['DOP', 'USD', 'EUR'], {
    required_error: 'Selecciona una moneda principal.',
    invalid_type_error: 'Selecciona una moneda principal.',
  }),
  incomeSources: z
    .array(financialItemSchema)
    .min(1, 'Agrega al menos una fuente de ingreso.'),
  fixedExpenses: z.array(financialItemSchema),
  variableExpenses: z.array(financialItemSchema),
  monthlySavingTargetPct: numberFromInput(
    z
      .number({ invalid_type_error: 'Ingresa una meta de ahorro valida.' })
      .min(0, 'La meta de ahorro debe estar entre 0 y 100.')
      .max(100, 'La meta de ahorro debe estar entre 0 y 100.')
      .optional(),
  ),
  monthlySavingTargetAmount: numberFromInput(
    z
      .number({ invalid_type_error: 'Ingresa un monto de ahorro valido.' })
      .min(0, 'El monto de ahorro no puede ser negativo.')
      .optional(),
  ),
});

export type FinancialOnboardingFormValues = z.infer<typeof financialOnboardingSchema>;
export type FinancialItemFormValues = z.infer<typeof financialItemSchema>;

/** Convert an amount at a given frequency into its monthly equivalent. */
export const toMonthlyAmount = (amount: number, frequency: FinancialItemFrequencyValue): number => {
  if (!Number.isFinite(amount) || amount <= 0) return 0;

  switch (frequency) {
    case 'weekly':
      return (amount * 52) / 12;
    case 'biweekly':
      return (amount * 26) / 12;
    case 'yearly':
      return amount / 12;
    case 'monthly':
    default:
      return amount;
  }
};
