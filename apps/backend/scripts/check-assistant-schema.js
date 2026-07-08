#!/usr/bin/env node
/*
 * check-assistant-schema.js — diagnóstico del esquema del módulo assistant.
 *
 * Verifica que la DB tenga el esquema que el AssistantModule espera:
 *   - assistant_sessions / assistant_messages / subscription_plans /
 *     user_subscriptions existen.
 *   - assistant_messages tiene session_id, user_id, role, content, request_id,
 *     provider, model, metadata, created_at (esquema NUEVO).
 *   - Si assistant_messages sigue siendo la LEGACY (conversation_id sin
 *     session_id) -> FAIL con instrucción de aplicar
 *     202607080001_assistant_legacy_tables_safety_rename.sql y re-aplicar
 *     202607060001_assistant_sessions_messages.sql.
 *   - Reporta assistant_messages_legacy_* como "legacy archived" (informativo)
 *     y la presencia de las otras tablas legacy huérfanas.
 *
 * Uso:   npm run schema:check   (desde apps/backend)
 * Lee DATABASE_URL / DATABASE_SSL de apps/backend/.env.
 * NUNCA imprime secretos (ni la connection string, ni credenciales).
 * Exit code: 0 = esquema correcto, 1 = hay problemas.
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const REQUIRED_TABLES = [
  'assistant_sessions',
  'assistant_messages',
  'subscription_plans',
  'user_subscriptions',
];

const REQUIRED_MESSAGE_COLUMNS = [
  'id',
  'session_id',
  'user_id',
  'role',
  'content',
  'request_id',
  'provider',
  'model',
  'metadata',
  'created_at',
];

const ORPHAN_LEGACY_TABLES = [
  'assistant_conversations',
  'assistant_audit_events',
  'assistant_recommendations',
  'assistant_recommendation_feedback',
];

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
    )
      v = v.slice(1, -1);
    env[m[1]] = v;
  }
  return env;
}

async function main() {
  const envPath = path.resolve(__dirname, '..', '.env');
  const env = loadEnv(envPath);
  let failures = 0;
  const pass = (m) => console.log('PASS  ' + m);
  const fail = (m) => {
    failures++;
    console.log('FAIL  ' + m);
  };
  const info = (m) => console.log('INFO  ' + m);

  if (!env.DATABASE_URL) {
    fail('DATABASE_URL no está definida en apps/backend/.env');
    process.exit(1);
  }
  info(`ssl: ${env.DATABASE_SSL === 'true'}`);

  const client = new Client({
    connectionString: env.DATABASE_URL,
    ssl: env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });
  await client.connect();
  info('conexión a la DB: ok');

  try {
    // 1. Tablas requeridas.
    for (const t of REQUIRED_TABLES) {
      const r = await client.query('SELECT to_regclass($1) AS reg', ['public.' + t]);
      if (r.rows[0].reg) pass(`tabla public.${t} existe`);
      else fail(`tabla public.${t} NO existe`);
    }

    // 2. Columnas del esquema nuevo de assistant_messages.
    const cols = await client.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'assistant_messages'`,
    );
    const have = new Set(cols.rows.map((r) => r.column_name));
    for (const c of REQUIRED_MESSAGE_COLUMNS) {
      if (have.has(c)) pass(`assistant_messages.${c} presente`);
      else fail(`assistant_messages.${c} FALTA`);
    }
    if (have.has('conversation_id') && !have.has('session_id')) {
      fail(
        'assistant_messages sigue siendo la tabla LEGACY (conversation_id sin session_id). ' +
          'Aplicar 202607080001_assistant_legacy_tables_safety_rename.sql y re-aplicar ' +
          '202607060001_assistant_sessions_messages.sql.',
      );
    }

    // 3. Catálogo de planes (informativo).
    try {
      const p = await client.query(
        'SELECT code FROM public.subscription_plans ORDER BY code',
      );
      info(`subscription_plans codes: ${p.rows.map((x) => x.code).join(',') || '(vacío)'}`);
    } catch (_) {
      /* la tabla puede faltar; ya reportado arriba */
    }

    // 4. Tablas legacy archivadas (informativo, estado esperado).
    const archived = await client.query(
      `SELECT tablename FROM pg_tables
       WHERE schemaname = 'public' AND tablename LIKE 'assistant\\_messages\\_legacy\\_%'
       ORDER BY tablename`,
    );
    if (archived.rowCount === 0) {
      info('sin tablas assistant_messages_legacy_* (DB sin historia legacy)');
    }
    for (const row of archived.rows) {
      const n = await client.query(`SELECT count(*)::int AS n FROM public."${row.tablename}"`);
      info(
        `legacy archived: public.${row.tablename} (filas: ${n.rows[0].n}) — OK, ` +
          'no la usa el AssistantModule; no borrar sin decisión explícita + backup',
      );
    }

    // 5. Otras tablas legacy huérfanas (informativo).
    for (const t of ORPHAN_LEGACY_TABLES) {
      const r = await client.query('SELECT to_regclass($1) AS reg', ['public.' + t]);
      if (r.rows[0].reg) {
        const n = await client.query(`SELECT count(*)::int AS n FROM public."${t}"`);
        info(`tabla legacy huérfana presente: public.${t} (filas: ${n.rows[0].n})`);
      }
    }
  } finally {
    await client.end();
  }

  console.log(
    failures === 0
      ? '\nRESULT: OK — esquema del módulo assistant correcto'
      : `\nRESULT: FAIL — ${failures} problema(s) de esquema`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  // Nunca imprimir la connection string; el message de pg no la incluye.
  console.error('ERROR:', e.message);
  process.exit(1);
});
