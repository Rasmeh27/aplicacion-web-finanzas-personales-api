# Despliegue del backend MONI en Render

Guía para desplegar el backend (`apps/backend`, workspace `@smartwallet/backend`)
en Render de forma segura y reproducible.

> **Stack real:** NestJS 10 · TypeORM 0.3 (`synchronize: false`) · Supabase
> (PostgreSQL + Auth) · monorepo npm workspaces + Turbo.
> **No usa Prisma.** Las migraciones son archivos SQL versionados que se aplican
> manualmente a Supabase (ver sección *Migraciones*).

---

## 1. Datos del servicio en Render

Crea un **Web Service** apuntando a este repositorio con estos valores exactos:

```text
Service Name:        moni-api
Root Directory:      (vacío — la raíz del repositorio)
Runtime:             Node
Region:              (la más cercana a los usuarios / al proyecto Supabase)
Branch:              main
Build Command:       npm ci && npm run build --workspace=@smartwallet/backend
Pre-Deploy Command:  (vacío — las migraciones se aplican manualmente, ver §4)
Start Command:       node apps/backend/dist/main.js
Health Check Path:   /health/ready
Auto-Deploy:         On (o Off si prefieres deploys manuales)
```

Notas:

- **Root Directory vacío (raíz):** es un monorepo con npm workspaces; el
  `package-lock.json` está en la raíz, así que `npm ci` debe ejecutarse allí.
  El flag `--workspace=@smartwallet/backend` compila solo el backend.
- **Versión de Node: 22 (LTS) — obligatoria.** El repo fija Node 22 vía `.nvmrc`
  (raíz) `22`, `engines.node = "22.x"` en el `package.json` **raíz** y en
  `apps/backend/package.json`. **No usar Node 20:** `@supabase/supabase-js` 2.106
  aborta el arranque en Node 20 con `Node.js 20 detected without native WebSocket
  support` (el cliente inicializa un `RealtimeClient` que exige `WebSocket` nativo,
  disponible solo en Node 21+). Node 22 lo trae de serie y es el runtime soportado.
- **Detección de versión en Render (Root Directory vacío):** con el root en la raíz,
  Render lee el **`.nvmrc` de la raíz** y/o `engines.node` del **`package.json` raíz**
  — no del `package.json` del workspace. Por eso la versión se declara en la raíz
  además del backend. Alternativa equivalente: definir la variable `NODE_VERSION=22`
  en el entorno del servicio.
- **Binario real compilado:** `apps/backend/dist/main.js` (verificado con el build;
  el proyecto NO usa la ruta anidada `dist/apps/backend/main.js`).
- El backend escucha en `0.0.0.0` y usa `process.env.PORT` (lo inyecta Render);
  `API_PORT` solo es fallback local.

---

## 2. Prefijo de API y versionado

- Prefijo global: `api` + versionado por URI con versión por defecto `1`.
- Los endpoints de negocio quedan bajo **`/api/v1/...`** (contrato usado por el
  frontend; no se modifica).
- Los **health checks se excluyen del prefijo y del versionado** a propósito, por
  lo que quedan en `/health/live` y `/health/ready` (limpios, sin `/api/v1`).

---

## 3. Health checks

| Endpoint         | Comprueba                                   | Códigos          |
|------------------|---------------------------------------------|------------------|
| `/health/live`   | Proceso vivo. No toca BD ni servicios ext.  | 200              |
| `/health/ready`  | Conectividad real con Postgres (`SELECT 1`).| 200 / 503        |

Configura **Health Check Path = `/health/ready`** en Render. `ready` devuelve
`503` si la base de datos no responde y `200` cuando está disponible. Ninguno de
los dos consulta AI Service, Alpha Vantage ni otros proveedores externos.

---

## 4. Migraciones (Supabase)

El proyecto **no tiene runner automatizado** de migraciones: son archivos SQL en
`apps/backend/src/database/migrations/*.sql`, incrementales, aplicados manualmente
contra Supabase. El esquema base vive en Supabase; el repositorio solo versiona los
incrementos.

**Por eso el Pre-Deploy Command queda vacío.** Antes de promover un cambio que
incluya nuevas migraciones:

1. Revisa los `.sql` nuevos en `apps/backend/src/database/migrations/`.
2. Aplícalos manualmente a la base de Supabase (en orden por prefijo de fecha),
   usando el flujo habitual del equipo (cliente `pg` con la `DATABASE_URL`, o el
   SQL editor de Supabase). El backend conecta con un rol que evita RLS.
3. Verifica que la app siga arrancando (`/health/ready` = 200) tras aplicarlas.

`TypeOrmModule` está configurado con `synchronize: false`, de modo que el arranque
**nunca** altera el esquema automáticamente.

> Los scripts `migration:run` / `migration:generate` del `package.json` son del CLI
> de TypeORM y **no** operan sobre estos `.sql` (no hay datasource declarado). No los
> uses como estrategia de despliegue.

### Estado del esquema (verificado el 2026-07-13)

Verificado contra Supabase con `npm run schema:check` + introspección read-only:

- **16/16 tablas** de entidades presentes (`profiles`, `movements`, `categories`,
  `budgets`, `debts`, `debt_payments`, `financial_goals`, `goal_contributions`,
  `planned_financial_items`, `investment_positions`, `investment_portfolios`,
  `investment_portfolio_snapshots`, `subscription_plans`, `user_subscriptions`,
  `assistant_sessions`, `assistant_messages`).
- `movements`: 16/16 columnas esperadas presentes (incluye `amount_base`,
  `base_currency`, `exchange_rate`, `original_amount`, `original_currency`).
- **Sin drift** entre entidades y base de datos.
- **Última migración aplicada:** `202607120002_movements_normalize_base_amount.sql`
  (sus columnas ya existen en la BD). La BD está al día con todas las migraciones
  del repo.

**Conclusión:** el **primer despliegue puede hacerse con `Pre-Deploy Command` vacío**
sin riesgo — el esquema ya está aplicado y `synchronize:false` no lo altera.

### Deuda técnica: trazabilidad de migraciones

**No existe una tabla de control** (`schema_migrations` o similar) ni auto-registro
en los `.sql`, por lo que **no hay forma automática y fiable de saber qué migraciones
se aplicaron**. Hoy se verifica por introspección (presencia de tablas/columnas), que
es lo que hace `schema:check`. Mitigante: las migraciones usan `add column if not
exists` / `alter table if exists` (**idempotentes**), así que reaplicarlas es seguro.

Propuesta (a evaluar, **no implementada en esta fase**): añadir una tabla
`schema_migrations(filename text primary key, applied_at timestamptz default now())`
y un pequeño runner idempotente que aplique en orden solo los `.sql` no registrados.
Permitiría un `Pre-Deploy Command` automatizado en el futuro.

---

## 5. Variables de entorno

Créalas en **Render → Environment**. Ver la tabla completa (obligatoria/secreta) en
[`RENDER_BACKEND_CHECKLIST.md`](./RENDER_BACKEND_CHECKLIST.md).

Mínimo para arrancar:

- `NODE_ENV=production`
- `DATABASE_URL` (secreta), `DATABASE_SSL=true`
- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`
- `FRONTEND_URL` (orígenes permitidos por CORS, separados por coma)
- `MARKET_DATA_PROVIDER` (+ su API key si es un proveedor real)

No definas `PORT` (lo inyecta Render). No definas `LOCAL_MOCK_BACKEND` (solo local).

---

## 6. Seguridad

- **Secretos solo en Render** (tipo *Secret*), nunca en el repo. `.env`, `.env.*.local`
  y `.env.backup*` están en `.gitignore`.
- CORS restringido por `FRONTEND_URL` (nunca `*` con `credentials: true`).
- Helmet activo; `ValidationPipe` con `whitelist` + `forbidNonWhitelisted` + `transform`.
- Rate limiting global (100/60s) y reforzado en `POST /api/v1/auth/login` (10/60s).
- El **AI Service nunca se expone al frontend**: el backend llama al ai-service
  server-to-server con el header `X-Internal-API-Key`; los endpoints internos del
  backend se protegen con `BACKEND_INTERNAL_API_KEY` (comparación en tiempo constante).
- Swagger desactivado en producción salvo que se ponga `ENABLE_SWAGGER=true`.

---

## 7. Verificación post-deploy

```bash
curl -s https://<tu-servicio>.onrender.com/health/live      # 200 {"status":"ok",...}
curl -s https://<tu-servicio>.onrender.com/health/ready     # 200 {"...,"database":"up"}
curl -s -o /dev/null -w "%{http_code}\n" \
     https://<tu-servicio>.onrender.com/api/docs             # 404 en producción
```

Luego valida un flujo autenticado real desde el frontend (login → refresh →
perfil/transacciones) contra la URL de Render.
