import { z } from 'zod';

const numberFromInput = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? undefined : Number(value)),
    schema,
  );

export const budgetSchema = z.object({
  categoryId: z
    .string({ required_error: 'Selecciona una categoría de gasto.' })
    .uuid('Selecciona una categoría de gasto.'),
  month: numberFromInput(
    z
      .number({ required_error: 'Selecciona un mes.', invalid_type_error: 'Selecciona un mes.' })
      .int()
      .min(1, 'Mes inválido.')
      .max(12, 'Mes inválido.'),
  ),
  year: numberFromInput(
    z
      .number({ required_error: 'Selecciona un año.', invalid_type_error: 'Selecciona un año.' })
      .int()
      .min(2000, 'Año inválido.')
      .max(2100, 'Año inválido.'),
  ),
  amountLimit: numberFromInput(
    z
      .number({
        required_error: 'Ingresa un límite.',
        invalid_type_error: 'Ingresa un límite válido.',
      })
      .positive('El límite debe ser mayor a 0.'),
  ),
  currency: z.enum(['DOP', 'USD', 'EUR'], {
    required_error: 'Selecciona una moneda.',
    invalid_type_error: 'Selecciona una moneda.',
  }),
  alertThresholdPct: numberFromInput(
    z
      .number({
        required_error: 'Ingresa un umbral de alerta.',
        invalid_type_error: 'Ingresa un umbral válido.',
      })
      .int()
      .min(1, 'El umbral debe estar entre 1 y 100.')
      .max(100, 'El umbral debe estar entre 1 y 100.'),
  ),
});

export type BudgetFormValues = z.infer<typeof budgetSchema>;
