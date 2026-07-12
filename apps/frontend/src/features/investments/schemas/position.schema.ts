import { z } from 'zod';
import type { TranslationKey } from '@/shared/i18n/translations';

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

export const INVESTMENT_ASSET_TYPES = ['stock', 'etf'] as const;

const SYMBOL_PATTERN = /^[A-Za-z0-9.-]{1,12}$/;

const todayString = (): string => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate(),
  ).padStart(2, '0')}`;
};

type Translate = (key: TranslationKey) => string;

/**
 * Schema del formulario de posición, con mensajes traducidos. Se construye con
 * `t` para respetar el idioma activo (los mensajes de Zod son estáticos).
 */
export function buildPositionSchema(t: Translate) {
  return z.object({
    symbol: z
      .string({ required_error: t('investments.form.symbolRequired') })
      .trim()
      .regex(SYMBOL_PATTERN, t('investments.form.symbolRequired'))
      .transform((value) => value.toUpperCase()),
    assetType: z.enum(INVESTMENT_ASSET_TYPES, {
      required_error: t('investments.form.assetType'),
      invalid_type_error: t('investments.form.assetType'),
    }),
    quantity: numberFromInput(
      z
        .number({
          required_error: t('investments.form.quantityInvalid'),
          invalid_type_error: t('investments.form.quantityInvalid'),
        })
        .positive(t('investments.form.quantityInvalid'))
        .max(1_000_000_000, t('investments.form.quantityInvalid')),
    ),
    averageCost: numberFromInput(
      z
        .number({
          required_error: t('investments.form.averageCostInvalid'),
          invalid_type_error: t('investments.form.averageCostInvalid'),
        })
        .min(0, t('investments.form.averageCostInvalid'))
        .max(1_000_000_000, t('investments.form.averageCostInvalid')),
    ),
    purchaseDate: emptyToUndefined(
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, t('investments.form.purchaseDateInvalid'))
        .refine((value) => value <= todayString(), t('investments.form.purchaseDateInvalid'))
        .optional(),
    ),
    notes: emptyToUndefined(
      z.string().max(500, t('investments.form.notesTooLong')).optional(),
    ),
  });
}

export type PositionFormValues = z.infer<ReturnType<typeof buildPositionSchema>>;
