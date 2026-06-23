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

export const goalSchema = z
  .object({
    name: z
      .string({ required_error: 'Ingresa un nombre.' })
      .trim()
      .min(3, 'El nombre debe tener al menos 3 caracteres.')
      .max(120, 'Máximo 120 caracteres.'),
    targetAmount: numberFromInput(
      z
        .number({
          required_error: 'Ingresa un monto objetivo.',
          invalid_type_error: 'Ingresa un monto válido.',
        })
        .positive('El monto objetivo debe ser mayor a 0.'),
    ),
    currentAmount: numberFromInput(
      z
        .number({ invalid_type_error: 'Ingresa un monto válido.' })
        .min(0, 'El monto actual no puede ser negativo.')
        .optional(),
    ),
    currency: z.enum(['DOP', 'USD', 'EUR'], {
      required_error: 'Selecciona una moneda.',
      invalid_type_error: 'Selecciona una moneda.',
    }),
    targetDate: emptyToUndefined(
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (YYYY-MM-DD).').optional(),
    ),
  })
  .refine(
    (data) =>
      data.currentAmount === undefined || data.currentAmount <= data.targetAmount,
    {
      message: 'El monto actual no puede ser mayor que el objetivo.',
      path: ['currentAmount'],
    },
  );

export type GoalFormValues = z.infer<typeof goalSchema>;

export const contributionSchema = z.object({
  amount: numberFromInput(
    z
      .number({
        required_error: 'Ingresa un monto.',
        invalid_type_error: 'Ingresa un monto válido.',
      })
      .positive('El monto debe ser mayor a 0.'),
  ),
  contributionDate: z
    .string({ required_error: 'Selecciona una fecha.' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (YYYY-MM-DD).'),
  note: emptyToUndefined(z.string().max(500, 'Máximo 500 caracteres.').optional()),
});

export type ContributionFormValues = z.infer<typeof contributionSchema>;
