#!/usr/bin/env node
/*
 * set-user-plan.js — script ADMINISTRATIVO DE DESARROLLO para asignar el plan
 * (basic | premium) a un usuario existente. NO es un endpoint HTTP: el plan
 * nunca puede cambiarse desde el cliente.
 *
 * Uso (desde la raíz del monorepo):
 *   npm --prefix apps/backend run subscription:set-plan -- --user-id=<UUID> --plan=premium
 *   npm --prefix apps/backend run subscription:set-plan -- --user-id=<UUID> --plan=basic
 *
 * Opcional: --days=<n> (vigencia de la suscripción premium; default 30).
 *
 * Reglas:
 *   - Solo acepta --plan=basic | premium y un UUID válido.
 *   - Se niega a ejecutarse con NODE_ENV=production (env o .env).
 *   - El usuario debe existir en public.profiles (no crea usuarios).
 *   - Idempotente:
 *       premium -> reutiliza/extiende la suscripción premium activa o crea una
 *                  de prueba con current_period_end = now() + days.
 *       basic   -> cancela (status=canceled, canceled_at=now) toda suscripción
 *                  premium activa/trialing; el fallback del sistema es basic.
 *   - Revertir a Basic = volver a ejecutar con --plan=basic.
 *   - Nunca imprime secretos (ni DATABASE_URL ni credenciales).
 * Lee DATABASE_URL / DATABASE_SSL de apps/backend/.env.
 * Exit code: 0 = ok, 1 = error.
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_PLANS = new Set(['basic', 'premium']);

function loadEnv(file) {
  const env = {};
  if (!fs.existsSync(file)) return env;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let v = m[2];
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    env[m[1]] = v;
  }
  return env;
}

function parseArgs(argv) {
  const args = {};
  for (const raw of argv) {
    const m = raw.match(/^--([a-z-]+)=(.*)$/);
    if (m) args[m[1]] = m[2];
  }
  return args;
}

function fail(message) {
  console.error(`[set-user-plan] ERROR: ${message}`);
  process.exit(1);
}

async function main() {
  const fileEnv = loadEnv(path.join(__dirname, '..', '.env'));
  const env = { ...fileEnv, ...process.env };

  const nodeEnv = (env.NODE_ENV || '').toLowerCase();
  if (nodeEnv === 'production') {
    fail('Rechazado: este script no puede ejecutarse con NODE_ENV=production.');
  }

  const args = parseArgs(process.argv.slice(2));
  const userId = (args['user-id'] || '').trim();
  const plan = (args.plan || '').trim().toLowerCase();
  const days = Number(args.days ?? 30);

  if (!UUID_RE.test(userId)) {
    fail('Falta --user-id=<UUID> válido.');
  }
  if (!VALID_PLANS.has(plan)) {
    fail("Falta --plan=basic | premium (solo esos valores).");
  }
  if (!Number.isInteger(days) || days < 1 || days > 3650) {
    fail('--days debe ser un entero entre 1 y 3650.');
  }
  if (!env.DATABASE_URL) {
    fail('DATABASE_URL no está configurada en apps/backend/.env.');
  }

  const client = new Client({
    connectionString: env.DATABASE_URL,
    ssl: env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });
  await client.connect();

  try {
    const user = await client.query(
      'select id from public.profiles where id = $1',
      [userId],
    );
    if (user.rowCount === 0) {
      fail(`El usuario ${userId} no existe en public.profiles (no se crean usuarios).`);
    }

    // Asegura el catálogo de planes (idempotente, igual que la migración).
    await client.query(
      `insert into public.subscription_plans (code, name, description)
       values ('basic', 'Basic', 'Plan básico gratuito.'),
              ('premium', 'Premium', 'Plan premium con capacidades avanzadas del asistente.')
       on conflict (code) do nothing`,
    );

    if (plan === 'premium') {
      const active = await client.query(
        `select id from public.user_subscriptions
          where user_id = $1
            and plan_code = 'premium'
            and status in ('active', 'trialing')
            and (current_period_end is null or current_period_end > now())
          order by current_period_end desc nulls first
          limit 1`,
        [userId],
      );

      if (active.rowCount > 0) {
        await client.query(
          `update public.user_subscriptions
              set current_period_end = now() + ($2 || ' days')::interval,
                  status = 'active',
                  updated_at = now()
            where id = $1`,
          [active.rows[0].id, String(days)],
        );
        console.log(
          `[set-user-plan] OK: suscripción premium existente extendida ${days} días (id=${active.rows[0].id}).`,
        );
      } else {
        const inserted = await client.query(
          `insert into public.user_subscriptions
             (user_id, plan_code, status, started_at, current_period_start, current_period_end)
           values ($1, 'premium', 'active', now(), now(), now() + ($2 || ' days')::interval)
           returning id`,
          [userId, String(days)],
        );
        console.log(
          `[set-user-plan] OK: suscripción premium de prueba creada (id=${inserted.rows[0].id}, vigencia ${days} días).`,
        );
      }
      console.log('[set-user-plan] Para revertir: vuelve a ejecutar con --plan=basic.');
    } else {
      const result = await client.query(
        `update public.user_subscriptions
            set status = 'canceled', canceled_at = now(), updated_at = now()
          where user_id = $1
            and plan_code = 'premium'
            and status in ('active', 'trialing')`,
        [userId],
      );
      console.log(
        `[set-user-plan] OK: ${result.rowCount} suscripción(es) premium cancelada(s); el plan efectivo vuelve a basic.`,
      );
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  // Nunca imprimir la connection string ni credenciales.
  fail(err.message || String(err));
});
