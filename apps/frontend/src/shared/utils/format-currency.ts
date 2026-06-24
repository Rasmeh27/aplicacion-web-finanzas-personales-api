/**
 * Format a numeric value as currency.
 * Por defecto usa peso dominicano (DOP) con locale `es-DO`, e.g. `RD$33,650`.
 */
export function formatCurrency(value: number, currency = 'DOP', fractionDigits = 0): string {
  const safeValue = Number.isFinite(value) ? value : 0;

  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(safeValue);
}
