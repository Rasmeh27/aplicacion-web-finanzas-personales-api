/**
 * Format a numeric value as currency.
 * Defaults to Dominican peso (DOP) with the `es-DO` locale, e.g. `RD$33,650.00`.
 */
export function formatCurrency(value: number, currency = 'DOP'): string {
  const safeValue = Number.isFinite(value) ? value : 0;

  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeValue);
}
