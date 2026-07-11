import { z } from 'zod';

const numberFromInput = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? undefined : Number(value)),
    schema,
  );

const emptyToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    schema,
  );

export const TRANSACTION_CLASSIFICATIONS = [
  'regular_income',
  'extra_income',
  'fixed_expense',
  'variable_expense',
] as const;

export const TRANSACTION_RECURRENCE_FREQUENCIES = [
  'weekly',
  'biweekly',
  'monthly',
  'yearly',
] as const;

export const transactionSchema = z.object({
  classification: z.enum(TRANSACTION_CLASSIFICATIONS, {
    required_error: 'Selecciona una clasificación.',
    invalid_type_error: 'Selecciona una clasificación.',
  }),
  amount: numberFromInput(
    z
      .number({
        required_error: 'Ingresa un monto.',
        invalid_type_error: 'Ingresa un monto válido.',
      })
      .min(0.01, 'El monto debe ser mayor a 0.'),
  ),
  currency: z.enum(['DOP', 'USD', 'EUR'], {
    required_error: 'Selecciona una moneda.',
    invalid_type_error: 'Selecciona una moneda.',
  }),
  date: z
    .string({ required_error: 'Selecciona una fecha.' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (YYYY-MM-DD).'),
  categoryId: emptyToUndefined(z.string().uuid('Categoría inválida.').optional()),
  description: z
    .string({
      required_error: 'La descripción es obligatoria.',
      invalid_type_error: 'La descripción es obligatoria.',
    })
    .trim()
    .min(1, 'La descripción es obligatoria.')
    .max(240, 'Máximo 240 caracteres.'),
  notes: emptyToUndefined(z.string().max(500, 'Máximo 500 caracteres.').optional()),
  isRecurring: z.boolean().default(false),
  recurrenceFrequency: emptyToUndefined(z.enum(TRANSACTION_RECURRENCE_FREQUENCIES).optional()),
}).superRefine((value, ctx) => {
  if (value.isRecurring && !value.recurrenceFrequency) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['recurrenceFrequency'],
      message: 'Selecciona la frecuencia de recurrencia.',
    });
  }
});

export type TransactionFormValues = z.infer<typeof transactionSchema>;
