/**
 * Validación fail-fast de variables de entorno.
 *
 * Se ejecuta al arrancar (ConfigModule.forRoot({ validate })). Si falta una
 * variable obligatoria para iniciar, el proceso NO arranca y el mensaje nombra
 * la variable, sin imprimir NUNCA su valor.
 *
 * No añade dependencias nuevas: reutiliza el sistema de config existente.
 * La validación condicional de proveedores (market data) ya la hace su módulo
 * durante la inicialización; aquí solo cubrimos lo mínimo para bootear.
 */

/** Variables sin las cuales el backend no puede iniciar. */
const ALWAYS_REQUIRED = [
  'DATABASE_URL',
  'SUPABASE_URL',
  'SUPABASE_PUBLISHABLE_KEY',
] as const;

function isBlank(value: unknown): boolean {
  return value === undefined || value === null || String(value).trim() === '';
}

export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const missing = ALWAYS_REQUIRED.filter((name) => isBlank(config[name]));

  if (missing.length > 0) {
    throw new Error(
      `Faltan variables de entorno obligatorias: ${missing.join(', ')}. ` +
        'Defínelas en el entorno del servicio (Render) o en apps/backend/.env.',
    );
  }

  // En producción MARKET_DATA_PROVIDER debe ser explícito (el módulo de market
  // data lo vuelve a validar, pero fallar aquí da un mensaje más temprano).
  const nodeEnv = String(config.NODE_ENV ?? '').toLowerCase();
  if (nodeEnv === 'production' && isBlank(config.MARKET_DATA_PROVIDER)) {
    throw new Error(
      'MARKET_DATA_PROVIDER debe definirse explícitamente en producción ' +
        "(p. ej. 'alphavantage', 'twelve_data' o 'mock').",
    );
  }

  return config;
}
