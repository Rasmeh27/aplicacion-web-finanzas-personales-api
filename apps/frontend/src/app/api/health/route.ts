import { NextResponse } from 'next/server';

/**
 * Health check del servicio web (Next.js) para Render.
 *
 * Devuelve 200 de forma estática: NO llama al backend ni a ningún servicio
 * externo, por lo que una caída de la API nunca marca el frontend como
 * "unhealthy" (son servicios Render independientes). Equivale al liveness
 * `/health/live` del backend.
 *
 * Queda fuera del middleware (el matcher excluye `/api`).
 */
export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({ status: 'ok', service: 'moni-web' });
}
