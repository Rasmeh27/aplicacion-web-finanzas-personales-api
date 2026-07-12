# Plan Premium — Inversiones US Stock Market + Wallter Premium

Implementación de la primera versión productiva del Plan Premium de MONI:
portafolio de acciones/ETF de EE. UU., analítica con gráficos, gating Premium
end-to-end y contexto de portafolio para Wallter.

## 1. Alcance

- Resolución y exposición segura del plan (`GET /subscriptions/me`, `/plans`).
- `PremiumPlanGuard` reutilizable (403 `premium_required` para Basic).
- Módulo de inversiones completo: portafolio default idempotente, CRUD de
  posiciones, summary, allocation, performance por snapshots reales y proxy de
  mercado (search/quote/history).
- Integración de datos de mercado desacoplada: provider `mock` determinista y
  provider real **Alpha Vantage** (API oficial), con cache TTL, dedupe,
  timeouts y manejo de 429.
- Snapshots diarios idempotentes del portafolio.
- Frontend: `/investments` (resumen, 4 gráficos Recharts, tabla, modal
  RHF+Zod), sidebar con candado Premium, sección "Plan y facturación" en
  Configuración, `UpgradeModal` reutilizable, i18n ES/EN completa.
- Wallter: sección `investments` en el contexto financiero interno (solo
  premium + scopes), prompt premium ampliado, metadata
  `investment_context_enabled`, acciones rápidas premium en el chat.
- Script administrativo `subscription:set-plan` para probar Premium en dev.

**Fuera de alcance (documentado):** billing real/checkout, conversión USD→DOP,
snapshot automático por scheduler (queda preparado), noticias
(`news-provider` sigue vacío).

## 2. Arquitectura

```
Frontend (Next.js)
  └─ /investments, /settings, Sidebar, Wallter drawer
     └─ apiClient (Axios compartido, JWT)  ──►  Backend NestJS /api/v1
          ├─ SubscriptionsModule
          │    ├─ UserPlanService  (ÚNICA fuente de verdad basic|premium)
          │    ├─ SubscriptionsController (/subscriptions/me, /plans)
          │    └─ PremiumPlanGuard (403 premium_required)
          ├─ UsStockMarketInvestmentModule (JwtAuthGuard + PremiumPlanGuard)
          │    ├─ InvestmentPortfolioService / PositionsService / AnalyticsService
          │    ├─ domain/portfolio-math.ts (cálculos puros)
          │    └─ InvestmentContextService (agregado para Wallter)
          ├─ integrations/market-data
          │    ├─ MarketDataService (cache TTL + dedupe + stale fallback)
          │    ├─ MockMarketDataProvider (determinista, sin red)
          │    └─ AlphaVantageMarketDataProvider (API oficial)
          └─ AssistantModule
               └─ FinancialContextService (+ sección investments premium)
                    ▲ POST /internal/assistant/financial-context (X-Internal-API-Key)
AI Service (FastAPI)
  └─ /api/v1/chat → FinanceContextService → BackendProvider → (endpoint interno)
     └─ financial_context_builder renderiza la sección de portafolio
```

Flujo de una pregunta premium de inversiones:

1. Frontend → `POST /api/v1/assistant/chat` (solo `message`, `session_id`).
2. Backend resuelve plan real (`UserPlanService`) → scopes → AI Service.
3. AI Service pide el resumen a `POST /api/v1/internal/assistant/financial-context`.
4. El backend re-resuelve el plan y, solo si es premium + scopes
   `finance_premium` y `user_private` + la pregunta lo amerita, agrega
   `investments` (agregado, máx. 8 posiciones).
5. El AI Service inyecta el bloque como system message con reglas educativas y
   devuelve `metadata.investment_context_enabled`; el backend la sanitiza y el
   frontend recibe solo flags seguros.

## 3. Modelo de datos

Migración: `apps/backend/src/database/migrations/202607110004_investments_premium.sql`
(idempotente y no destructiva; aplicada y re-aplicada sin errores).

### `investment_portfolios`
`id` PK, `user_id` FK→`profiles(id)` ON DELETE CASCADE, `name`,
`base_currency` (default USD), `is_default`, timestamps, `deleted_at`.
Único parcial: **un** portafolio default activo por usuario
(`uq_investment_portfolios_user_default`). Índices por `user_id`.

### `investment_positions`
`id` PK, `user_id` FK, `portfolio_id` FK, `symbol`, `display_name`,
`asset_type` CHECK (`stock|etf`), `quantity numeric(20,8)` CHECK `> 0`,
`average_cost numeric(18,6)` CHECK `>= 0`, `currency` (USD), `purchase_date`,
`notes`, timestamps, `deleted_at`. CHECK de símbolo `^[A-Z0-9.\-]{1,12}$`.
Único parcial anti-duplicados: `(portfolio_id, symbol) WHERE deleted_at IS NULL`.

### `investment_portfolio_snapshots`
`id` PK, `user_id` FK, `portfolio_id` FK, `snapshot_date`,
`cost_basis numeric(18,2)`, `market_value` NULL, `unrealized_gain_loss` NULL,
`currency`, `market_data_status` CHECK (`fresh|partial|stale|unavailable`),
`created_at`. Único: `(portfolio_id, snapshot_date)`.

### RLS (defensa en profundidad)
- `investment_portfolios` y `investment_positions`: SELECT/INSERT/UPDATE/DELETE
  solo con `auth.uid() = user_id`.
- `investment_portfolio_snapshots`: solo SELECT del dueño (los snapshots los
  escribe el backend).
El backend opera con rol privilegiado (bypassa RLS), igual que el resto del
sistema.

## 4. Endpoints

Todos bajo `/api/v1`, con `JwtAuthGuard`; los de inversiones agregan
`PremiumPlanGuard`. Documentados en Swagger (`/api/docs`).

| Método | Ruta | Plan | Propósito |
|---|---|---|---|
| GET | `/subscriptions/me` | cualquiera | Plan actual + features (`investments`, `portfolioAnalytics`, `premiumAssistant`) |
| GET | `/subscriptions/plans` | cualquiera | Catálogo activo con capacidades |
| GET | `/investments/portfolio` | premium | Get-or-create idempotente del portafolio default |
| GET | `/investments/positions` | premium | Posiciones enriquecidas (precio, valor, G/P, peso, estado) |
| POST | `/investments/positions` | premium | Alta manual (`{symbol, assetType, quantity, averageCost, purchaseDate?, notes?}`) |
| PATCH | `/investments/positions/:id` | premium | Actualiza posición propia (símbolo no editable) |
| DELETE | `/investments/positions/:id` | premium | Soft delete (404 si ajena) |
| GET | `/investments/summary` | premium | Totales + concentración + `marketDataStatus` + snapshot del día |
| GET | `/investments/allocation` | premium | Distribución por símbolo y por tipo |
| GET | `/investments/performance?range=1M\|3M\|6M\|1Y\|ALL` | premium | Snapshots reales + `insufficientData` |
| GET | `/investments/symbols/search?query=` | premium | Búsqueda de símbolos |
| GET | `/investments/symbols/:symbol/quote` | premium | Cotización actual |
| GET | `/investments/symbols/:symbol/history?range=1M\|3M\|6M\|1Y` | premium | Histórico de cierres |
| POST | `/internal/assistant/financial-context` | interno | Resumen financiero + sección `investments` premium (X-Internal-API-Key) |

Códigos de error controlados: `premium_required` (403),
`position_not_found`/`portfolio_not_found` (404), `duplicate_position` (409),
`invalid_market_symbol`/`invalid_purchase_date` (400),
`market_data_rate_limited` (429), `market_data_unavailable` (503).
`insufficient_performance_data` no es un error: `/performance` responde 200 con
`insufficientData: true`.

## 5. Variables de entorno

Backend (`apps/backend/.env.example`, también en el `.env.example` raíz):

```env
MARKET_DATA_PROVIDER=alphavantage    # alphavantage | twelve_data | mock
ALPHA_VANTAGE_API_KEY=               # variable CANÓNICA del provider alphavantage
MARKET_DATA_API_KEY=                 # alias heredado (usa ALPHA_VANTAGE_API_KEY)
TWELVE_DATA_API_KEY=                 # solo si MARKET_DATA_PROVIDER=twelve_data
MARKET_DATA_BASE_URL=                # override opcional del base URL del provider
MARKET_DATA_TIMEOUT_MS=8000
MARKET_DATA_MAX_CONCURRENCY=4
MARKET_DATA_QUOTE_CACHE_TTL_MS=60000
MARKET_DATA_SEARCH_CACHE_TTL_MS=300000
MARKET_DATA_HISTORY_CACHE_TTL_MS=900000
MARKET_DATA_STALE_MAX_AGE_MS=86400000
```

Frontend (`apps/frontend/.env.local.example`):

```env
NEXT_PUBLIC_PREMIUM_CHECKOUT_URL=    # vacío => modal "checkout no habilitado"
```

## 6. Acceso Premium y seguridad

- `UserPlanService` sigue siendo la única fuente de verdad; el frontend solo
  consulta `/subscriptions/me` y **nunca** envía `plan`, `userId`, scopes ni
  `isPremium` (el `ValidationPipe` global con whitelist rechaza extras).
- `PremiumPlanGuard` corre detrás de `JwtAuthGuard`, re-resuelve el plan por
  request y responde `{statusCode: 403, code: 'premium_required', ...}`.
  Suscripción vencida/cancelada ⇒ basic ⇒ 403.
- Aislamiento estricto: todas las queries de inversiones filtran por
  `user_id`; posición/portafolio ajenos ⇒ 404 sin filtrar existencia.
- El estado premium del frontend es solo visual: modificarlo no concede
  acceso (la API es la barrera).
- API keys del proveedor: solo backend, nunca en logs ni respuestas.
- Símbolos validados/normalizados (`^[A-Z0-9.-]{1,12}$`) antes de tocar al
  proveedor; queries de búsqueda saneadas; sin URLs construidas con entrada
  cruda.
- Decimales: cálculos en `portfolio-math.ts` con redondeo consistente
  (2 decimales moneda, 4 pesos); columnas `numeric` con escala explícita.
- Logs sin contenido privado: nunca notas, mensajes ni posiciones completas.

## 7. Integración de mercado, cache y resiliencia

Detalle completo en [`integrations/market-data/README.md`](../apps/backend/src/integrations/market-data/README.md).

- Interfaz `MarketDataProvider` (`searchSymbols`, `getQuote`,
  `getHistoricalPrices`, `getMarketStatus?`) en `integrations/market-data`.
- `twelve_data` (**proveedor real recomendado**): API oficial Twelve Data
  (`/quote`, `/symbol_search`, `/time_series` interval `1day`). Contrato
  normalizado (`MarketQuote`): valida strings numéricos, rechaza `NaN`/`<=0`,
  conserva el timestamp real del proveedor y expone `marketStatus`/`isDelayed`.
- `alphavantage`: API oficial alternativa (GLOBAL_QUOTE, SYMBOL_SEARCH,
  TIME_SERIES_DAILY).
- `mock`: catálogo determinista (hash símbolo + día). Sin red; usado por todos
  los tests. Cada respuesta lleva `isMock: true`.
- **Selección explícita, sin fallback silencioso**: un proveedor real sin API
  key hace **fallar el arranque** con mensaje claro (nunca degrada a mock); en
  producción, `MARKET_DATA_PROVIDER` sin definir también es error. Esta era la
  causa raíz del bug de precios (`alphavantage` sin key caía a mock: AMZN≈185.46,
  NVDA≈133.72 con hora actual).
- `MarketDataService` (facade): cache TTL (quotes 60 s, search 5 min, history
  15 min), **dedupe** de solicitudes simultáneas, **límite de concurrencia**
  (`MARKET_DATA_MAX_CONCURRENCY`, default 4) y fallback `stale` (≤ 24 h). Timeout
  explícito, 1 retry solo red/5xx, 429 ⇒ `market_data_rate_limited`.
- Un fallo del proveedor **en runtime NO cae a mock**: las posiciones y costos
  siguen visibles, los valores de mercado van `null`, `marketDataStatus` refleja
  `unavailable|partial|stale` y `marketData.failedSymbols` lista los símbolos sin
  cotización. El CRUD no se bloquea (alta con warning `market_validation_skipped`).
- Metadata por respuesta: bloque `marketData { provider, status, isMock, asOf,
  marketStatus, failedSymbols }`. El frontend muestra "Datos de demostración"
  **solo** si `isMock === true`, y "mercado cerrado / último precio disponible"
  cuando `marketStatus === 'closed'`.

## 8. Snapshots

- Al consultar `/investments/summary` con posiciones, se registra el snapshot
  del día de forma **idempotente** (unique `portfolio_id+snapshot_date`).
- Reglas de honestidad: con datos `fresh` se guardan/actualizan valores
  completos; con `partial/stale/unavailable` solo se crea el registro del día
  con `market_value` NULL (etiquetado) y **nunca** se degrada un snapshot
  `fresh` existente. Un fallo del snapshot no corrompe la respuesta (se
  loggea y continúa).
- `/investments/performance` devuelve solo snapshots reales; con < 2 puntos
  responde `insufficientData: true` y el frontend indica desde cuándo existe
  historial. No se fabrica curva retrospectiva.
- Automatización futura: `InvestmentAnalyticsService.upsertDailySnapshot` está
  listo para un `@Cron` de `@nestjs/schedule` (iterar solo portafolios con
  posiciones, en lotes, respetando el rate limit). Ver README del módulo.

## 9. Integración con Wallter

**Conectado y probado (backend + ai-service):**

- `FinancialContextService` agrega la sección `investments`
  (agregado, máx. 8 posiciones) solo si: request premium con scopes
  `finance_premium`+`user_private`, plan REAL premium re-resuelto con
  `UserPlanService` y pregunta relacionada a inversiones (o sin pregunta).
  Basic **nunca** la recibe (probado, incluso con request manipulado).
- AI Service: `InvestmentContext` (Pydantic, camelCase con alias,
  `extra="ignore"`), renderizado en el system message con reglas educativas
  (separar datos/cálculos/interpretación/riesgos/escenarios; desempeño pasado
  no garantiza resultados futuros; sin órdenes de compra/venta), estado del
  dato señalado (desactualizado/parcial/no disponible), y prompt premium
  ampliado con capacidades y límites.
- Metadata: `investment_context_enabled` en la respuesta del AI Service; el
  backend la persiste y expone (sanitizada) al frontend.
- Heurística de keywords del ai-service ampliada con términos de inversión
  (antes "Analiza mi portafolio" ni siquiera disparaba el contexto).
- Acciones rápidas premium en el drawer de Wallter; Basic ve una invitación a
  mejorar el plan (nunca se auto-envían prompts premium).

**No conectado (limitación):** RAG premium (`finance_premium` sigue
deshabilitado en retrieval del ai-service; no hay knowledge/finance_premium) —
igual que antes de este trabajo, sin regresiones.

## 10. Cómo ejecutar migraciones

No hay `psql` en el entorno; la migración es SQL plano idempotente:

1. Con un cliente SQL (Supabase SQL editor, DBeaver, etc.): ejecutar el
   contenido de `apps/backend/src/database/migrations/202607110004_investments_premium.sql`.
2. O con Node (como se aplicó aquí): script corto con `pg.Client` que lea
   `DATABASE_URL`/`DATABASE_SSL` de `apps/backend/.env` y ejecute el archivo.
   Es seguro re-ejecutarla (create table/index IF NOT EXISTS, constraints con
   guards, drop policy if exists antes de cada policy).

Verificación: `npm --prefix apps/backend run schema:check` sigue OK (no valida
estas tablas, valida el esquema del assistant).

## 11. Probar Basic y Premium en desarrollo

```bash
# Convertir un usuario de desarrollo a Premium (30 días por defecto)
npm --prefix apps/backend run subscription:set-plan -- --user-id=<UUID> --plan=premium
# Extender/idempotente: re-ejecutar el mismo comando
# Revertir a Basic (cancela las suscripciones premium activas)
npm --prefix apps/backend run subscription:set-plan -- --user-id=<UUID> --plan=basic
```

El script: valida UUID y plan, exige usuario existente en `profiles`, rechaza
`NODE_ENV=production`, no imprime secretos y es idempotente. No existe ningún
endpoint HTTP que cambie el plan.

Flujo manual: iniciar sesión → por defecto Basic (sidebar muestra candado
PREMIUM en Inversiones; `/investments` muestra la pantalla bloqueada; la API
responde 403 `premium_required`) → ejecutar el script con el UUID del usuario →
refrescar la app → acceso completo a Inversiones y sugerencias premium de
Wallter.

Modo mock local (`LOCAL_MOCK_BACKEND=true`): `LOCAL_MOCK_PLAN=basic|premium`
simula ambos planes con datos demo etiquetados (`marketDataSource: 'mock'`).

## 12. Configurar un proveedor real (Alpha Vantage)

1. Crear una API key gratuita en <https://www.alphavantage.co>.
2. En `apps/backend/.env`:
   ```env
   MARKET_DATA_PROVIDER=alphavantage
   ALPHA_VANTAGE_API_KEY=<tu-key>
   ```
   `ALPHA_VANTAGE_API_KEY` es la variable **canónica**; `MARKET_DATA_API_KEY` se
   sigue aceptando como alias heredado.
3. Reiniciar el backend. **Sin la key, el backend falla en el arranque** (nunca
   cae a mock); el error nombra `ALPHA_VANTAGE_API_KEY`.
4. Plan gratuito de Alpha Vantage: ~25 requests/día; el cache (60 s quotes) +
   límite de concurrencia + manejo de 429 lo respetan, y con rate limit se sirve
   `stale` cuando existe. Valida el licenciamiento antes de un uso comercial.

Alternativa Twelve Data: `MARKET_DATA_PROVIDER=twelve_data` + `TWELVE_DATA_API_KEY`.

## 13. Pendiente para billing real

- Integrar un proveedor de pagos (Stripe/PayPal) con webhook server-side que
  cree/actualice `user_subscriptions` (el modelo de datos ya lo soporta:
  status, period start/end, canceled_at).
- Configurar `NEXT_PUBLIC_PREMIUM_CHECKOUT_URL` hacia el checkout; el botón
  "Mejorar a Premium" ya redirige si existe y hoy NO simula pagos ni
  auto-asigna plan.
- Portal de gestión (cancelar/reactivar) y correos de ciclo de vida.

## 14. Evidencia de pruebas (2026-07-12)

| Comando | Resultado |
|---|---|
| `npm run lint` (raíz, turbo) | 3/3 OK (backend eslint + frontend next lint) |
| `npm run test` (raíz, turbo) | 2/2 OK — backend Jest: **24 suites, 266 tests pass** |
| `npm run build` (raíz, turbo) | 3/3 OK (nest build + next build; `/investments` generado) |
| `npm --prefix apps/backend run schema:check` | RESULT: OK |
| ai-service `pytest` | **217 passed** (incluye 13 nuevos de investment context) |
| ai-service `ruff` + `mypy` | All checks passed / no issues in 53 files |
| Migración aplicada 2 veces (pg) | Tablas creadas, RLS=true, sin errores (idempotente) |
| Backend real levantado | Swagger con 11 endpoints nuevos; 401 sin token en `/subscriptions/me` y `/investments/*` |
| Script set-plan | UUID/plan/usuario inválidos rechazados; premium→extender→basic→basic idempotente OK |

Pruebas unitarias nuevas del backend: guard premium (permite/bloquea/vencida/
sin suscripción/401), subscriptions service (features y no-exposición de
historial), portfolio-math (cost basis, market value, G/P, %, pesos,
concentración, estados), portfolio idempotente + carrera, CRUD de posiciones
(normalización, duplicado 409, proveedor caído con warning, aislamiento 404),
analytics (summary fresh/partial/unavailable, snapshot idempotente sin
degradar, performance insuficiente, allocation), market-data (cache TTL,
dedupe, stale fallback, verifySymbol), mock provider (determinismo, rangos,
símbolo inválido), DTO (cantidades inválidas, campos extra prohibidos) y
financial-context (premium recibe investments; basic NUNCA, ni con request
manipulado; sin filtración de notas/PII en la sección).

## 15. Limitaciones y deuda técnica

- No hay pruebas E2E con JWT real automatizadas (requieren un usuario Supabase
  logueado); el gating se cubre con unit tests + verificación 401 en vivo.
- El cache de mercado es in-memory por instancia (sin Redis): con múltiples
  réplicas cada una mantiene su cache (aceptable en esta fase).
- El snapshot diario depende de que algún cliente consulte `/summary` ese día;
  el cron queda documentado pero no activado.
- `integrations/news-provider` y `integrations/ai-provider` siguen vacíos (no
  eran parte de este alcance).
- Alpha Vantage free tier (25 req/día) limita la frescura con portafolios
  grandes; mitigado por cache + stale + estados honestos.
