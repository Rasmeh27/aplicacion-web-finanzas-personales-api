/**
 * Formateadores puros del módulo de inversiones (USD). Se mantienen como
 * funciones sin estado para poder probarlas y reutilizarlas en tabla,
 * tarjetas y tooltips de gráficos.
 *
 * Regla de honestidad: null NUNCA se convierte en 0; se muestra placeholder.
 */

const USD_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const QUANTITY_FORMATTER = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 8,
});

export const NOT_AVAILABLE_PLACEHOLDER = '—';

export function formatUsd(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return NOT_AVAILABLE_PLACEHOLDER;
  }
  return USD_FORMATTER.format(value);
}

/** Con signo explícito para ganancias/pérdidas: +$120.00 / -$45.10. */
export function formatSignedUsd(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return NOT_AVAILABLE_PLACEHOLDER;
  }
  const formatted = USD_FORMATTER.format(Math.abs(value));
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
}

/** Porcentaje ya expresado en puntos (10 => "10.00%"). */
export function formatPct(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return NOT_AVAILABLE_PLACEHOLDER;
  }
  return `${value.toFixed(2)}%`;
}

/** Peso expresado como fracción 0..1 (0.5455 => "54.6%"). */
export function formatWeight(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return NOT_AVAILABLE_PLACEHOLDER;
  }
  return `${(value * 100).toFixed(1)}%`;
}

export function formatQuantity(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return NOT_AVAILABLE_PLACEHOLDER;
  }
  return QUANTITY_FORMATTER.format(value);
}

/** Hora local corta para "actualizado a las…". */
export function formatTime(iso: string | null | undefined, locale: string): string {
  if (!iso) return NOT_AVAILABLE_PLACEHOLDER;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return NOT_AVAILABLE_PLACEHOLDER;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function formatDate(isoDate: string | null | undefined, locale: string): string {
  if (!isoDate) return NOT_AVAILABLE_PLACEHOLDER;
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return NOT_AVAILABLE_PLACEHOLDER;
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
}

/** Tono de color estándar para valores de ganancia/pérdida. */
export function gainLossTone(value: number | null | undefined): 'positive' | 'negative' | 'neutral' {
  if (value === null || value === undefined || !Number.isFinite(value) || value === 0) {
    return 'neutral';
  }
  return value > 0 ? 'positive' : 'negative';
}
