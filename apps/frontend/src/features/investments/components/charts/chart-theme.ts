/**
 * Tema compartido de los gráficos de inversiones.
 *
 * Paleta categórica validada (banda de luminosidad, piso de croma, separación
 * CVD y contraste >= 3:1 sobre tarjeta blanca). Los tonos se asignan por
 * ORDEN FIJO a las posiciones ordenadas por peso; nunca se generan hues.
 */
export const CATEGORICAL_COLORS = [
  '#4f46e5', // indigo-600
  '#059669', // emerald-600
  '#d97706', // amber-600
  '#0284c7', // sky-600
  '#7c3aed', // violet-600
  '#e11d48', // rose-600
  '#0d9488', // teal-600
] as const;

/** Neutro intencional para la categoría "Otros" (fuera de la serie). */
export const OTHER_COLOR = '#94a3b8'; // slate-400

/** Polaridad ganancia/pérdida (par divergente del sistema). */
export const GAIN_COLOR = '#059669'; // emerald-600
export const LOSS_COLOR = '#e11d48'; // rose-600

/** Serie de referencia (costo) en el gráfico de evolución. */
export const REFERENCE_COLOR = '#64748b'; // slate-500 (con guiones como refuerzo)

export const GRID_COLOR = '#e2e8f0'; // slate-200
export const AXIS_TICK = { fill: '#64748b', fontSize: 11 } as const;

export const TOOLTIP_WRAPPER_CLASS =
  'rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg shadow-slate-950/5';

export function colorForIndex(index: number): string {
  return index < CATEGORICAL_COLORS.length ? CATEGORICAL_COLORS[index] : OTHER_COLOR;
}
