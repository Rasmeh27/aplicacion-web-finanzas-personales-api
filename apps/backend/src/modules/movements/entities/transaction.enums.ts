/**
 * Enums de movimientos. Archivo "hoja" (sin imports) para que tanto la entidad
 * Transaction como Category puedan reutilizarlos sin ciclos de importación.
 */

export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
}

/**
 * Clasificación de finanzas personales. Es la fuente de verdad funcional:
 * - regular_income / extra_income  -> type income
 * - fixed_expense / variable_expense -> type expense
 * No se incluye ninguna categoría de inversión en este alcance.
 */
export enum TransactionClassification {
  REGULAR_INCOME = 'regular_income',
  EXTRA_INCOME = 'extra_income',
  FIXED_EXPENSE = 'fixed_expense',
  VARIABLE_EXPENSE = 'variable_expense',
}

/** Mapeo determinístico clasificación -> tipo (income/expense). */
export const CLASSIFICATION_TO_TYPE: Record<TransactionClassification, TransactionType> = {
  [TransactionClassification.REGULAR_INCOME]: TransactionType.INCOME,
  [TransactionClassification.EXTRA_INCOME]: TransactionType.INCOME,
  [TransactionClassification.FIXED_EXPENSE]: TransactionType.EXPENSE,
  [TransactionClassification.VARIABLE_EXPENSE]: TransactionType.EXPENSE,
};
