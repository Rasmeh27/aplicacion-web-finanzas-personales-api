# Checklist de despliegue — Backend MONI en Render

## Configuración exacta del servicio

```text
Service Name:        moni-api
Root Directory:      (vacío — raíz del repo)
Runtime:             Node 22 (LTS) — vía .nvmrc raíz "22" + engines root/backend "22.x"
                     (NO Node 20: supabase-js aborta sin WebSocket nativo)
Region:              (cercana a Supabase)
Branch:              main
Build Command:       npm ci && npm run build --workspace=@smartwallet/backend
Pre-Deploy Command:  (vacío — migraciones manuales)
Start Command:       node apps/backend/dist/main.js
Health Check Path:   /health/ready
Auto-Deploy:         On
```

## Variables de entorno

Clasificación: **Secret** = valor sensible (marcar como *secret* en Render) ·
**No secret** = valor público/no sensible · **Optional** = no bloquea el arranque ·
**Generated** = no aplica (Render no genera ninguna para este servicio).

| Variable | Obligatoria | Secreta | Servicio | Descripción |
|----------|:-----------:|:-------:|----------|-------------|
| `NODE_ENV` | Sí | No | Runtime | `production` en Render. |
| `PORT` | No¹ | No | Runtime | Lo inyecta Render. **No** la definas manualmente. |
| `API_PORT` | No | No | Runtime | Fallback de puerto solo para local. |
| `FRONTEND_URL` | Sí (prod) | No | CORS | Orígenes permitidos, separados por coma. Sin `*`. |
| `DATABASE_URL` | Sí | **Sí** | Supabase/PG | Cadena de conexión Postgres (incluye contraseña). |
| `DATABASE_SSL` | Sí (prod) | No | Supabase/PG | `true` para TLS hacia Supabase. |
| `SUPABASE_URL` | Sí | No² | Supabase Auth | URL del proyecto Supabase. |
| `SUPABASE_PUBLISHABLE_KEY` | Sí | **Sí** | Supabase Auth | Clave publishable/anon usada por el cliente. |
| `ENABLE_SWAGGER` | No | No | Docs | `false` en prod (default). `true` expone `/api/docs`. |
| `AI_SERVICE_BASE_URL` | Cond.³ | No | AI Service | URL interna del ai-service FastAPI. |
| `AI_SERVICE_INTERNAL_API_KEY` | Cond.³ | **Sí** | AI Service | Key que el backend envía al ai-service (`X-Internal-API-Key`). |
| `AI_SERVICE_TIMEOUT_MS` | No | No | AI Service | Timeout de las llamadas (default 30000/60000). |
| `BACKEND_INTERNAL_API_KEY` | Cond.³ | **Sí** | AI Service | Protege los endpoints internos del backend. |
| `MARKET_DATA_PROVIDER` | Sí (prod) | No | Market data | `alphavantage` \| `twelve_data` \| `mock`. |
| `ALPHA_VANTAGE_API_KEY` | Cond.⁴ | **Sí** | Market data | Key de Alpha Vantage (variable canónica). |
| `MARKET_DATA_API_KEY` | No | **Sí** | Market data | Alias heredado de la anterior. |
| `TWELVE_DATA_API_KEY` | Cond.⁴ | **Sí** | Market data | Key de Twelve Data. |
| `TWELVE_DATA_BASE_URL` | No | No | Market data | Base URL de Twelve Data. |
| `MARKET_DATA_BASE_URL` | No | No | Market data | Override de base URL del proveedor activo. |
| `MARKET_DATA_TIMEOUT_MS` | No | No | Market data | Timeout de proveedor (default 8000). |
| `MARKET_DATA_MAX_CONCURRENCY` | No | No | Market data | Concurrencia máx. de cotizaciones. |
| `MARKET_DATA_QUOTE_CACHE_TTL_MS` | No | No | Market data | TTL caché de quotes. |
| `MARKET_DATA_SEARCH_CACHE_TTL_MS` | No | No | Market data | TTL caché de búsqueda. |
| `MARKET_DATA_HISTORY_CACHE_TTL_MS` | No | No | Market data | TTL caché de histórico. |
| `MARKET_DATA_STALE_MAX_AGE_MS` | No | No | Market data | Edad máx. de valor `stale` servible. |
| `EXCHANGE_RATE_USD_BUY` | No | No | Movimientos | Tasa BCRD compra (default 58.36). |
| `EXCHANGE_RATE_USD_SELL` | No | No | Movimientos | Tasa BCRD venta (default 58.95). |

¹ La inyecta Render automáticamente. · ² Publishable/anon; trátala igual como *secret*
por prudencia. · ³ Requerida para que el **AI Assistant** funcione; si falta, el
assistant responde `503` pero el resto del backend arranca. · ⁴ Requerida solo si
`MARKET_DATA_PROVIDER` selecciona ese proveedor real (fail-fast al arrancar si falta).

**No configurar en Render:** `LOCAL_MOCK_BACKEND`, `REDIS_URL` (solo docker-compose
local) y cualquier `*_local`.

## Antes del primer deploy

- [ ] Variables obligatorias creadas en Render (las *secret* marcadas como tal).
- [ ] `FRONTEND_URL` contiene el/los dominio(s) reales del frontend (Render u otros).
- [ ] Migraciones SQL nuevas aplicadas a Supabase (ver DEPLOYMENT §4).
- [ ] `DATABASE_SSL=true`.
- [ ] `ENABLE_SWAGGER` sin definir o `false`.

## 🔴 Acción de seguridad requerida (rotación de secretos)

Se detectó `apps/backend/.env.backup-ai-key-sync` **versionado en git** con secretos
reales. Ya se **destrackeó** (`git rm --cached`) y se añadió `.env.backup*` a
`.gitignore`. Como estuvieron en el historial, **rota estos secretos**:

- [ ] Contraseña de la base de datos (`DATABASE_URL`) en Supabase.
- [ ] `ALPHA_VANTAGE_API_KEY` (regenerar en Alpha Vantage).
- [ ] Revisar/rotar `SUPABASE_PUBLISHABLE_KEY` si la política lo exige.
- [ ] (Opcional) Purgar el archivo del historial de git (`git filter-repo`) si el
      repositorio es o será público.

## Verificación post-deploy

- [ ] `GET /health/live` → 200
- [ ] `GET /health/ready` → 200 (`database: "up"`)
- [ ] `GET /api/docs` → 404 en producción
- [ ] Origen CORS no permitido → sin cabecera `Access-Control-Allow-Origin`
- [ ] Login/refresh/perfil/transacciones OK desde el frontend real
