# Assistant module

Chat con el asistente de IA + **persistencia de sesiones y mensajes** por
usuario. El frontend habla solo con este backend; el backend habla con el
`ai-service` (FastAPI) vía `X-Internal-API-Key`.

```
Frontend ──> Backend (NestJS)
                 ├─ guarda el mensaje del usuario
                 ├─ llama al ai-service
                 ├─ guarda la respuesta del asistente
                 └─ devuelve la respuesta (limpia)
             Backend ──> AI Service (FastAPI)
```

## Tablas nuevas

Creadas por la migración
[`202607060001_assistant_sessions_messages.sql`](../../database/migrations/202607060001_assistant_sessions_messages.sql)
(SQL idempotente, mismo patrón que el resto del proyecto: FK a `public.profiles`,
RLS por `auth.uid() = user_id`).

### `assistant_sessions`
| Columna            | Tipo          | Notas                                  |
| ------------------ | ------------- | -------------------------------------- |
| `id`               | uuid PK       | `gen_random_uuid()`                    |
| `user_id`          | uuid          | FK → `profiles(id)` on delete cascade  |
| `title`            | text null     | Título (autogenerado del 1er mensaje)  |
| `plan_at_creation` | varchar(20)   | `basic` \| `premium`                   |
| `status`           | varchar(20)   | `active` \| `archived`                 |
| `created_at`       | timestamptz   |                                        |
| `updated_at`       | timestamptz   | Se refresca en cada turno de chat      |

### `assistant_messages`
| Columna      | Tipo         | Notas                                        |
| ------------ | ------------ | -------------------------------------------- |
| `id`         | uuid PK      | `gen_random_uuid()`                          |
| `session_id` | uuid         | FK → `assistant_sessions(id)` on delete cascade |
| `user_id`    | uuid         | FK → `profiles(id)`; denormalizado para aislar |
| `role`       | varchar(20)  | `user` \| `assistant` \| `system`            |
| `content`    | text         |                                              |
| `request_id` | text null    | Trazabilidad del turno                       |
| `provider`   | text null    | p.ej. `mock`                                 |
| `model`      | text null    | p.ej. `mock-llm`                             |
| `metadata`   | jsonb null   | Solo metadata saneada (ver abajo)            |
| `created_at` | timestamptz  |                                              |

Relación: `AssistantSession` 1—N `AssistantMessage`.

## Endpoints (todos bajo `JwtAuthGuard`, prefijo `/api/v1`)

| Método   | Ruta                                        | Descripción                                   |
| -------- | ------------------------------------------- | --------------------------------------------- |
| `POST`   | `/assistant/chat`                           | Enviar mensaje; crea/reutiliza sesión         |
| `GET`    | `/assistant/sessions`                       | Sesiones activas del usuario (updated_at DESC)|
| `GET`    | `/assistant/sessions/:sessionId/messages`   | Mensajes de una sesión propia                 |
| `PATCH`  | `/assistant/sessions/:sessionId`            | Renombrar (`{ title }`)                       |
| `DELETE` | `/assistant/sessions/:sessionId`            | Archivar (soft delete por `status`)           |

El frontend solo puede enviar `{ message, session_id? }`. Cualquier otro campo
(`user_id`, `plan`, `allowed_scopes`, …) es rechazado con `400` por el
`ValidationPipe` global (whitelist + forbidNonWhitelisted). El `user_id` proviene
**siempre** del JWT.

## Flujo de `POST /assistant/chat`

1. `user_id` desde el JWT; `plan` vía `UserPlanService.resolveUserPlan(userId)`
   (ver [Resolución del plan](#resolución-del-plan)).
2. Si viene `session_id`: se busca por `{ id, user_id }`. Si no existe **o es de
   otro usuario → `404`** (no `403`, para no filtrar existencia).
3. Si no viene `session_id`: se crea una sesión con `plan_at_creation` = plan
   resuelto (título = primeros 60 caracteres del mensaje, o "Nueva conversación").
4. Se **guarda el mensaje del usuario** (`role = user`).
5. Se llama al `ai-service` con el `plan` **actual** y sus `allowed_scopes`.
6. **Si responde OK**: se guarda la respuesta (`role = assistant`) con
   `request_id`/`provider`/`model`/`metadata` saneada, y se refresca
   `updated_at` de la sesión.
7. **Si el `ai-service` falla**: el mensaje del usuario queda guardado, **no** se
   guarda respuesta del asistente y se relanza el error de gateway ya saneado.

> Sesiones existentes conservan su `plan_at_creation`, pero cada mensaje usa el
> plan **actual** del usuario. Así, si un usuario pasa de basic a premium, sus
> sesiones antiguas siguen funcionando y el nuevo plan aplica de inmediato.

## Resolución del plan

**Fuente de verdad:** la tabla `user_subscriptions` (módulo
[`subscriptions`](../subscriptions/), servicio `UserPlanService`). **El plan
nunca viene del frontend** — se resuelve solo desde datos confiables del backend.

Reglas (`resolveUserPlan`):
- Solo cuentan las suscripciones en estado `active` o `trialing` **y vigentes**
  (`current_period_end` nulo o en el futuro).
- Si alguna válida es `premium` → **premium**.
- Si no hay premium válida pero sí una `basic` válida → **basic** (`source: subscription`).
- Si no hay ninguna válida (o el usuario no tiene suscripción) → **basic**
  (`source: default`). Fallback seguro: nunca lanza; ante error de DB también
  devuelve basic.

Scopes enviados al `ai-service` por plan:

| Plan      | `allowed_scopes`                                                |
| --------- | -------------------------------------------------------------- |
| `basic`   | `app_usage`, `finance_basic`                                   |
| `premium` | `app_usage`, `finance_basic`, `finance_premium`, `user_private` |

**Qué falta para pagos reales:** esta fase NO implementa billing. Las
suscripciones se crean/actualizan fuera de banda (migración/seed del catálogo, o
inserción directa por backend/admin). No hay endpoints para que el usuario cambie
su plan (evita auto-upgrades). Integrar un proveedor de pagos (p. ej. Stripe) y
poblar/actualizar `user_subscriptions` desde sus webhooks es el siguiente paso.

## Endpoint interno: financial-context (servicio-a-servicio)

El **ai-service** (no el frontend) pide a este backend un **resumen financiero
agregado** del usuario para enriquecer las respuestas del asistente. El backend
es la **fuente de verdad** financiera; el ai-service nunca toca Postgres.

```
POST /api/v1/internal/assistant/financial-context
Header:  X-Internal-API-Key: <BACKEND_INTERNAL_API_KEY>   (NO JWT de usuario)
```

- Protegido por [`InternalApiKeyGuard`](financial-context/guards/internal-api-key.guard.ts)
  (comparación en tiempo constante). Key vacía o `change-me` → **500**; header
  ausente/incorrecto → **401**. La key **nunca** se loguea.
- Excluido de Swagger (`@ApiExcludeController`); no es una API de usuario.
- `read-only`: no muta nada.

**Request** (lo construye el ai-service a partir del chat autenticado):

| Campo            | Tipo                        | Notas                                    |
| ---------------- | --------------------------- | ---------------------------------------- |
| `request_id`     | string                      | Trazabilidad                             |
| `user_id`        | uuid                        | Nació en el backend autenticado; se re-valida que exista |
| `plan`           | `basic` \| `premium`        | Se re-valida coherencia con `allowed_scopes` |
| `allowed_scopes` | string[]                    | Scopes permitidos del plan               |
| `locale`         | `es` \| `en` (opcional)     |                                          |
| `period`         | `{ from, to }` (opcional)   | `YYYY-MM-DD`; default = mes actual       |
| `question`       | string (opcional)           | Mensaje del usuario (solo contexto)      |

Validaciones: `from <= to`, rango máximo **12 meses**, fechas válidas
(`2026-02-30` → 400), `user_id` inexistente → **404**, scopes fuera del plan →
**400**. El `ValidationPipe` global rechaza cualquier campo extra con 400.

**Response**: resumen agregado — ver
[`dto/financial-context-response.dto.ts`](financial-context/dto/financial-context-response.dto.ts):
`summary` (income/expense/fixed/variable/net_cashflow/savings_rate/transactions_count),
`top_categories`, `budgets`, `goals`, `has_sufficient_data`, `warnings`,
`currency`, `period`, `metadata.raw_transactions_included: false`.

**Cómo se calcula** ([`financial-context.service.ts`](financial-context/financial-context.service.ts)):
lee las entidades reales del propio usuario (`movements`, `budgets`,
`financial_goals`, `categories`, `profiles`), filtrando **siempre** por
`user_id` y por el periodo. `income/expense` por `type`; `fixed/variable` por
`classification`; `savings_rate = (income - expense)/income` (null sin ingresos);
`top_categories` = gasto agregado por categoría (nombres solo del propio
usuario); `budgets.spent` = gasto del mes del presupuesto en su categoría;
`goals` = metas activas. `has_sufficient_data=false` con < 3 movimientos
(devuelve ceros/nulls + `warnings`, nunca 500).

**Nunca devuelve** (privacidad): lista de transacciones, merchant/comercio,
cuentas bancarias, tarjetas, emails, prompts, JWT, API keys ni `allowed_scopes`.
El único identificador es `user_id` (el caller ya lo conoce).

**Seguridad de configuración:** `BACKEND_INTERNAL_API_KEY` (backend) **debe
coincidir** con `BACKEND_INTERNAL_API_KEY` (ai-service). Placeholder en
`.env.example`; nunca se commitea el valor real.

## Privacidad — qué se guarda y qué no

`sanitizeAiMetadata` filtra la metadata del ai-service. **Se persiste** solo:
`request_id`, `rag_enabled`, `financial_context_enabled`, `llm_provider`,
`llm_model`. **Al frontend** se expone un subconjunto aún menor: `request_id`,
`rag_enabled`, `financial_context_enabled`.

**Nunca** se guardan ni se exponen: `allowed_scopes`, `user`, `email`, prompts
internos, errores crudos del proveedor ni API keys. Los logs incluyen solo
`request_id`, `session_id`, `user_id`, duración y estado — nunca el contenido del
mensaje ni de la respuesta.

## Aislamiento por usuario

Toda consulta filtra por el `user_id` autenticado (`WHERE user_id = …`). La RLS
de ambas tablas (`auth.uid() = user_id`) es defensa en profundidad. Un usuario
nunca puede leer ni modificar sesiones/mensajes de otro (respuesta `404`).

## Legacy assistant tables

**Qué pasó.** La DB de desarrollo contenía tablas de un **diseño anterior** del
asistente, sin ninguna entidad TypeORM ni código actual que las use (verificado
con búsqueda en backend y frontend):

- `assistant_messages` (legacy) — esquema viejo: `conversation_id`,
  `context_snapshot`, `model_name`, `prompt_version`, `role` (enum);
  FK → `assistant_conversations`. **Colisionaba por nombre** con la tabla nueva
  del módulo: como `202607060001` usa `create table if not exists`, la legacy no
  se reemplazaba, los `INSERT` del backend fallarían por columnas inexistentes y
  los índices de la migración fallarían al referenciar `session_id`. Además su
  PK `assistant_messages_pkey` ocupaba el namespace de relaciones (los índices
  que respaldan PK/UNIQUE comparten namespace con las tablas) e impedía el PK
  estándar de la tabla nueva.
- `assistant_conversations`, `assistant_audit_events`,
  `assistant_recommendations`, `assistant_recommendation_feedback` — huérfanas;
  **no colisionan** con el módulo nuevo y se dejan tal cual.

**Solución formalizada.** La migración idempotente
[`202607080001_assistant_legacy_tables_safety_rename.sql`](../../database/migrations/202607080001_assistant_legacy_tables_safety_rename.sql):

1. Detecta la legacy **por estructura, no por nombre**: existe
   `public.assistant_messages` **y** tiene `conversation_id` **y** NO tiene
   `session_id`.
2. La renombra a `assistant_messages_legacy_20260707` (si el nombre está
   ocupado, prueba sufijos `_1`.. `_20`; si ninguno está libre aborta con un
   error claro en vez de dejar la colisión silenciosa).
3. Renombra constraints (PK/UNIQUE/FK/CHECK) e índices que aún tengan el
   prefijo `assistant_messages_` en las tablas archivadas, para liberar el
   namespace (renombrar un PK renombra también su índice de respaldo).
4. Si `assistant_messages` existe pero no coincide con ningún esquema conocido:
   `WARNING` y no toca nada (revisión manual).
5. Deja `NOTICE`s con el estado de las demás tablas legacy (con conteo de
   filas), **sin tocarlas**. El enum legacy de `role` tampoco se toca (namespace
   de tipos, la tabla nueva usa `varchar`).

**Orden de aplicación en una DB legacy:** primero `202607080001` y después
(re)aplicar `202607060001` (esta última falla sobre el esquema legacy). Ambas
son idempotentes; en DBs nuevas o ya corregidas `202607080001` es un no-op.

**Por qué rename y no delete.** El rename es no destructivo y reversible, no
pierde datos aunque algún ambiente tuviera filas, y deja evidencia auditable.
La **eliminación definitiva** de las tablas legacy (`assistant_messages_legacy_*`
y las cuatro huérfanas) requiere **decisión explícita + backup previo**, tras
confirmar de nuevo que nada las usa. No la hace ninguna migración.

**Cómo verificar el esquema.** `npm run schema:check` (script
[`scripts/check-assistant-schema.js`](../../../scripts/check-assistant-schema.js))
valida tablas y columnas requeridas, falla si `assistant_messages` sigue siendo
legacy, y reporta las tablas archivadas/huérfanas. No imprime secretos.

> El nuevo `AssistantModule` **no debe usar nunca** las tablas legacy; cualquier
> feature futura que las necesite debe migrar su contenido al esquema nuevo, no
> resucitarlas.

## Tests

- [`assistant.service.spec.ts`](assistant.service.spec.ts) — flujo de
  persistencia, aislamiento (404 en sesión ajena), no-guardado en fallo del
  ai-service, saneo de metadata, list/messages/patch/delete.
- [`dto/assistant-chat-request.dto.spec.ts`](dto/assistant-chat-request.dto.spec.ts)
  — el frontend no puede enviar `user_id`/`plan`/`allowed_scopes`, y `session_id`
  debe ser UUID.

## Validación E2E local (cliente → backend → ai-service → RAG real → DB)

Flujo verificado de punta a punta: **cliente autenticado (JWT de Supabase) →
backend NestJS → ai-service (FastAPI) → RAG real sobre Chroma Cloud → respuesta →
persistencia en `assistant_sessions` / `assistant_messages`**. LLM en `mock`
(determinista, sin coste); RAG con embeddings reales de Hugging Face.

### 1. Variables requeridas (no imprimir secretos)

`ai-service/.env` — debe quedar así:

| Variable                      | Valor esperado                    |
| ----------------------------- | --------------------------------- |
| `AI_SERVICE_INTERNAL_API_KEY` | ≠ `change-me` (idéntica al backend) |
| `ENABLE_RAG`                  | `true`                            |
| `LLM_PROVIDER`                | `mock`                            |
| `EMBEDDING_PROVIDER`          | `huggingface`                     |
| `HUGGINGFACE_API_TOKEN`       | presente                          |
| `EMBEDDING_MODEL`             | `intfloat/multilingual-e5-large`  |
| `EMBEDDING_DIMENSIONS`        | `1024`                            |
| `CHROMA_API_KEY/TENANT/DATABASE` | presentes                      |
| `APP_ENV`                     | `development`                     |

`apps/backend/.env`:

| Variable                      | Valor esperado                    |
| ----------------------------- | --------------------------------- |
| `AI_SERVICE_BASE_URL`         | `http://localhost:8001`           |
| `AI_SERVICE_INTERNAL_API_KEY` | **idéntica** a la del ai-service  |
| `DATABASE_URL` / `DATABASE_SSL` | presente / `true`               |
| `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` | presentes           |
| `API_PORT`                    | `3001`                            |

**Flags que definen el modo (y qué debe estar en true/false):**

- `rag_permitted` = `ENABLE_RAG=true` **AND** (embeddings reales **OR** `app_env`
  ∈ {development, test}). Con la config de arriba → **true**.
- `rag_mode` = **`real`** (porque `EMBEDDING_PROVIDER=huggingface`, no `mock`).
- `rag_enabled` = **true** **solo cuando** el retrieval devolvió contexto y este
  se inyectó al prompt (no es solo el flag).
- `financial_context_enabled` = **dinámico**: `true` solo cuando el ai-service
  inyectó el resumen financiero agregado del usuario (requiere
  `ENABLE_FINANCIAL_CONTEXT=true` en el ai-service, scope financiero y pregunta
  financiera). Ver [LLM real + contexto financiero](#8-llm-real-hugging-face).

### 2. Arrancar los servicios

```bash
# ai-service (desde ai-service/, usa su .venv)
uvicorn app.main:app --host 0.0.0.0 --port 8001
curl -s http://localhost:8001/health          # -> {"ok":true,...} 200

# backend (desde la raíz del repo)
npm --prefix apps/backend run dev              # escucha en API_PORT (3001)
```

### 3. Migraciones (idempotentes; no borran datos)

Tablas necesarias: `assistant_sessions`, `assistant_messages`,
`subscription_plans`, `user_subscriptions`. Aplicar si faltan
[`202607060001_*.sql`](../../database/migrations/202607060001_assistant_sessions_messages.sql)
y [`202607060002_*.sql`](../../database/migrations/202607060002_subscription_plans_user_subscriptions.sql)
(en Supabase SQL editor o con cualquier cliente Postgres usando `DATABASE_URL`).

> ⚠️ **Colisión de nombre con esquema legacy.** Algunas bases ya tienen una tabla
> `assistant_messages` de un diseño anterior (ver
> [Legacy assistant tables](#legacy-assistant-tables)). En ese caso aplica primero
> [`202607080001_assistant_legacy_tables_safety_rename.sql`](../../database/migrations/202607080001_assistant_legacy_tables_safety_rename.sql)
> (idempotente; solo renombra, no borra nada) y después (re)aplica
> `202607060001_*.sql`. Verifica el resultado con `npm run schema:check`.

### 4. JWT real

Registro/login por el flujo normal (`POST /api/v1/auth/register` y `/login`,
Supabase). Si el proyecto exige confirmación de email, confirma el usuario de
prueba (en dev, marcando `auth.users.email_confirmed_at`) y luego haz `login`
para recibir `accessToken`. **Nunca imprimas el JWT completo**; guárdalo en una
variable/archivo y úsalo en el header.

### 5. Probar el chat y validar que **RAG real llegó al backend**

```bash
JWT=$(cat jwt.txt)   # token en archivo, no impreso
curl -s -X POST http://localhost:3001/api/v1/assistant/chat \
  -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  --data-binary '{ "message": "¿Cómo registro un gasto?" }'
```

Respuesta esperada: `201`, `ok=true`, `session_id` UUID, y
`metadata = { request_id, rag_enabled: true, financial_context_enabled: false }`.

- **`metadata.rag_enabled: true` en la respuesta del backend ⇒ el ai-service
  recuperó e inyectó contexto de Chroma real.** El backend **no** expone
  `rag_mode`/`rag_results_count`/`rag_collections_used` (se filtran).
- Para ver el detalle interno (`rag_mode: "real"`, `rag_results_count > 0`),
  llama al ai-service **directo** con `X-Internal-API-Key` (payload interno con
  `user`/`plan`/`allowed_scopes`); útil para depurar, nunca desde el frontend.

### 6. Revisar sesiones y mensajes persistidos

```bash
curl -s -H "Authorization: Bearer $JWT" http://localhost:3001/api/v1/assistant/sessions
curl -s -H "Authorization: Bearer $JWT" http://localhost:3001/api/v1/assistant/sessions/<sessionId>/messages
```

Debe verse la sesión del usuario y, por turno, un mensaje `role=user` y uno
`role=assistant`. Reenviar con el mismo `session_id` **reutiliza** la sesión
(añade 2 mensajes más) y mantiene el aislamiento por `user_id`.

### 7. Metadata: expuesta al frontend vs. guardada en DB

| Campo                        | En DB (`assistant_messages.metadata`) | Al frontend |
| ---------------------------- | :-----------------------------------: | :---------: |
| `request_id`                 | ✅                                    | ✅          |
| `rag_enabled`                | ✅                                    | ✅          |
| `financial_context_enabled`  | ✅                                    | ✅          |
| `llm_provider` / `llm_model` | ✅ (también en columnas `provider`/`model`) | ❌     |
| `allowed_scopes`, `user`, `email`, prompts, chunks crudos, API keys | ❌ | ❌ |

### 8. LLM real (Hugging Face)

El asistente puede responder con un LLM real de **Hugging Face Inference
Providers** (config en el **ai-service**, no en el backend):

```dotenv
# ai-service/.env
LLM_PROVIDER=huggingface
LLM_MODEL=deepseek-ai/DeepSeek-R1-0528:fastest
HUGGINGFACE_API_TOKEN=<secret>      # mismo token que embeddings
ENABLE_RAG=true
ENABLE_FINANCIAL_CONTEXT=true
```

Antes de probar E2E: `python scripts/llm_preflight.py` (en el ai-service) debe
dar `ok=true`. Para volver a offline: `LLM_PROVIDER=mock`.

> ⏱️ **Timeout:** DeepSeek-R1 razona y puede tardar 30–40 s. El backend
> `AI_SERVICE_TIMEOUT_MS` **debe ser mayor** que el `LLM_TIMEOUT_MS` del
> ai-service (se subió a `60000`); si no, el backend aborta con `503` antes de
> que el ai-service termine.

Prueba (usuario con transacciones del mes):

```bash
JWT=$(cat jwt.txt)
for Q in "¿Cómo registro un gasto?" "¿Cómo van mis gastos este mes?" \
         "¿Qué puedo hacer para ahorrar más este mes?" "¿Qué acción debo comprar esta semana?"; do
  curl -s -X POST http://localhost:3001/api/v1/assistant/chat \
    -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
    --data-binary "{\"message\": \"$Q\"}"
done
```

**Qué metadata esperar** (igual que antes; solo cambia el contenido del mensaje):
`201`, `metadata = { request_id, rag_enabled, financial_context_enabled }`. En DB
el mensaje `assistant` guarda además `llm_provider=huggingface` y
`llm_model=deepseek-ai/DeepSeek-R1-0528`.

**Qué validar manualmente** (respuesta ya NO es placeholder):
- Usa las cifras reales del resumen (ingresos/gastos/cashflow) en preguntas
  financieras y **no inventa** montos ni transacciones.
- Dice claramente cuando no hay datos suficientes.
- En plan básico **no** recomienda acciones/ETFs/cripto ni promete rendimientos
  (la pregunta de "qué acción comprar" debe ser rechazada educadamente).
- No filtra `<think>`, prompts internos, chunks, ids ni secretos.

El generador de reportes `scripts/evaluate_assistant_quality.py` (ai-service)
automatiza estas 12 preguntas y deja un Markdown en `reports/` para revisión.

### Pendientes (fuera del alcance de esta fase)

- **`finance_premium`** (ingest + retrieval en `finance_premium_investing_knowledge`).
- **`user_private`** (contexto privado por usuario, aislado).
- Memoria conversacional entre sesiones; ingest de PDF.
