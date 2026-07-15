# Matriz de variables de entorno de MONI en Render

Derivada de búsquedas en `process.env`, `ConfigService`, `BaseSettings`, `.env.example`, Dockerfile y scripts de arranque al 2026-07-14.

Versiones validadas para Render: Node `22.23.1`, Next.js `15.5.20`, React/React DOM `18.3.1`, `eslint-config-next` `15.5.20`. `npm ci`, frontend lint/build/smoke y regresión backend pasan. Estado de base de datos: `DATABASE VERIFICATION PENDING` hasta que Luis confirme las cuatro tablas de migración 14.

Reglas:

- `NEXT_PUBLIC_*` se incrusta en el bundle y es visible para cualquier usuario. Nunca contiene secretos.
- Render proporciona `PORT`; no se define manualmente.
- `NEXT_PUBLIC_API_URL` debe incluir `/api/v1` y requiere rebuild cuando cambia.
- `AI_SERVICE_INTERNAL_API_KEY` debe coincidir entre API e IA para el flujo API → IA.
- `BACKEND_INTERNAL_API_KEY` debe coincidir entre API e IA para el flujo IA → API.
- Esas dos claves protegen direcciones distintas y deben ser valores aleatorios **diferentes entre sí**.
- Los valores entre `<...>` son placeholders, no hostnames ni credenciales reales.

# Variables mínimas para la demo

Estas listas son el subconjunto operativo. La matriz completa inferior conserva los ajustes avanzados.

## moni-ai

- **Requeridas para iniciar:** `APP_ENV=production`; `PORT` es automática de Render. El proceso y `/health` técnicamente arrancan con defaults, pero para aceptar llamadas de demo también debe definirse `AI_SERVICE_INTERNAL_API_KEY` con un valor no-placeholder.
- **Requeridas para RAG:** `ENABLE_RAG=true`, `EMBEDDING_PROVIDER`, `EMBEDDING_MODEL`, `EMBEDDING_DIMENSIONS`, `CHROMA_API_KEY`, `CHROMA_TENANT`, `CHROMA_DATABASE` y la credencial del proveedor de embeddings. Requiere ingest previo compatible.
- **Requeridas para LLM real:** `LLM_PROVIDER`, `LLM_MODEL` y `HUGGINGFACE_API_TOKEN` o `LLM_API_KEY` según proveedor. Para demo offline puede usarse `LLM_PROVIDER=mock`, identificado como simulación.
- **Opcionales:** `ENABLE_RAG=false`, `ENABLE_FINANCIAL_CONTEXT=false`, `LOG_LEVEL`, timeouts, tokens y reintentos. Si se activa contexto financiero pasan a ser requeridas `BACKEND_BASE_URL` y `BACKEND_INTERNAL_API_KEY`.

## moni-api

- **Requeridas para iniciar:** `NODE_VERSION=22.23.1`, `NODE_ENV=production`, `DATABASE_URL`, `DATABASE_SSL=true`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `MARKET_DATA_PROVIDER`; `PORT` es automática.
- **Requeridas para Supabase:** `DATABASE_URL`, `DATABASE_SSL=true`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`; `SUPABASE_SERVICE_ROLE_KEY` solo para operaciones administrativas que realmente se usen.
- **Requeridas para market data:** `MARKET_DATA_PROVIDER` y, si es real, `ALPHA_VANTAGE_API_KEY` o `TWELVE_DATA_API_KEY`. Con `mock` no hay key y la UI debe rotular datos de demostración.
- **Requeridas para IA:** `AI_SERVICE_BASE_URL`, `AI_SERVICE_INTERNAL_API_KEY`; para exponer contexto financiero a IA, también `BACKEND_INTERNAL_API_KEY`.
- **Opcionales:** `ENABLE_SWAGGER=false`, EmailJS, noticias, tasas y ajustes de cache/timeout. `FRONTEND_URL` es necesaria para login desde la web final, aunque el proceso pueda iniciar sin ella.

## moni-web

- **Requeridas durante build:** `NODE_VERSION=22.23.1`, `NODE_ENV=production`, `NEXT_PUBLIC_API_URL=https://<host-api>/api/v1`. Esta URL queda incluida en el bundle y cambiarla exige rebuild.
- **Opcionales:** `NEXT_PUBLIC_PREMIUM_CHECKOUT_URL`. `PORT` es automática en runtime. Ningún secreto puede usar el prefijo `NEXT_PUBLIC_`.

El fail-fast de Next 15.5.20 rechaza un build productivo si `NEXT_PUBLIC_API_URL` falta, apunta a loopback o no termina en `/api/v1`. Configure únicamente el origen real de `moni-api`; no use hosts provisionales.

## Backend: `moni-api`

| Variable | Servicio | Requerida | Secreta | Momento | Origen | Descripción | Ejemplo seguro |
|---|---|---|---|---|---|---|---|
| `NODE_VERSION` | API | Sí | No | Build | Proyecto | Selecciona Node exacto en Render. | `22.23.1` |
| `NODE_ENV` | API | Sí | No | Runtime | Render/proyecto | Debe ser `production`. | `production` |
| `PORT` | API | Sí, automática | No | Runtime | Render | Puerto escuchado en `0.0.0.0`. | proporcionada por Render |
| `DATABASE_URL` | API | Sí | Sí | Runtime | Supabase | Conexión PostgreSQL; contiene password. | `postgresql://<user>:<password>@<host>:5432/postgres` |
| `DATABASE_SSL` | API | Sí en prod | No | Runtime | Supabase | Habilita TLS de TypeORM. | `true` |
| `SUPABASE_URL` | API | Sí | No | Runtime | Supabase | URL del proyecto Auth. | `https://<project>.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | API | Sí | No | Runtime | Supabase | Clave publishable/anon usada por el SDK del backend. | `<supabase-publishable-key>` |
| `SUPABASE_SERVICE_ROLE_KEY` | API | Condicional | Sí | Runtime | Supabase | Generación administrativa de links de recuperación. Nunca frontend. | `<secret>` |
| `FRONTEND_URL` | API | Sí en prod web | No | Runtime | Render web | Allowlist CORS, orígenes separados por coma y sin barra final. | `https://<frontend-host>` |
| `ENABLE_SWAGGER` | API | No | No | Runtime | Proyecto | Apaga docs públicas en producción. | `false` |
| `MARKET_DATA_PROVIDER` | API | Sí en prod | No | Runtime | Producto | `alphavantage`, `twelve_data` o `mock`. | `alphavantage` |
| `ALPHA_VANTAGE_API_KEY` | API | Si provider=alphavantage | Sí | Runtime | Alpha Vantage | Key canónica del proveedor. | `<secret>` |
| `MARKET_DATA_API_KEY` | API | No, alias legado | Sí | Runtime | Alpha Vantage | Alias aceptado; preferir la variable canónica. | `<secret>` |
| `TWELVE_DATA_API_KEY` | API | Si provider=twelve_data | Sí | Runtime | Twelve Data | Key del proveedor alternativo. | `<secret>` |
| `TWELVE_DATA_BASE_URL` | API | No | No | Runtime | Proyecto | Base Twelve Data. | `https://api.twelvedata.com` |
| `MARKET_DATA_BASE_URL` | API | No | No | Runtime | Proveedor | Override del proveedor activo. | `https://<provider-host>` |
| `MARKET_DATA_TIMEOUT_MS` | API | No | No | Runtime | Proyecto | Timeout HTTP. | `8000` |
| `MARKET_DATA_MAX_CONCURRENCY` | API | No | No | Runtime | Proyecto | Cotizaciones concurrentes. | `4` |
| `MARKET_DATA_QUOTE_CACHE_TTL_MS` | API | No | No | Runtime | Proyecto | TTL de quotes. | `60000` |
| `MARKET_DATA_SEARCH_CACHE_TTL_MS` | API | No | No | Runtime | Proyecto | TTL de búsquedas. | `300000` |
| `MARKET_DATA_HISTORY_CACHE_TTL_MS` | API | No | No | Runtime | Proyecto | TTL de históricos. | `900000` |
| `MARKET_DATA_STALE_MAX_AGE_MS` | API | No | No | Runtime | Proyecto | Máxima edad servible como stale. | `86400000` |
| `AI_SERVICE_BASE_URL` | API | Sí para assistant | No | Runtime | Render IA | Origen del servicio IA, sin `/api/v1/chat`. | `https://<ai-host>` |
| `AI_SERVICE_INTERNAL_API_KEY` | API | Sí para assistant | Sí | Runtime | Secret manager | Header backend → IA; mismo valor en IA. | `<secret>` |
| `AI_SERVICE_TIMEOUT_MS` | API | No | No | Runtime | Proyecto | Timeout del gateway; mayor que `LLM_TIMEOUT_MS`. | `60000` |
| `BACKEND_INTERNAL_API_KEY` | API | Sí para contexto | Sí | Runtime | Secret manager | Protege endpoint interno; mismo valor en IA. | `<different-secret>` |
| `EMAIL_PROVIDER` | API | No | No | Runtime | Producto | `emailjs`, `console` local o `disabled`; Supabase puede enviar email. | `disabled` |
| `EMAILJS_SERVICE_ID` | API | Si EmailJS | No | Runtime | EmailJS | Service ID. | `<service-id>` |
| `EMAILJS_TEMPLATE_PASSWORD_RESET_ID` | API | Si reset EmailJS | No | Runtime | EmailJS | Template de recuperación. | `<template-id>` |
| `EMAILJS_TEMPLATE_PREMIUM_ALERT_ID` | API | Si alertas EmailJS | No | Runtime | EmailJS | Template premium. | `<template-id>` |
| `EMAILJS_TEMPLATE_SIGNUP_CONFIRMATION_ID` | API | Si confirmación EmailJS | No | Runtime | EmailJS | Template de registro. | `<template-id>` |
| `EMAILJS_PUBLIC_KEY` | API | Si EmailJS | No | Runtime | EmailJS | Identificador público de EmailJS. | `<public-key>` |
| `EMAILJS_PRIVATE_KEY` | API | Si EmailJS | Sí | Runtime | EmailJS | Credencial privada. | `<secret>` |
| `EMAIL_SUPPORT_ADDRESS` | API | No | No | Runtime | Producto | Reply-to/soporte. | `soporte@example.com` |
| `NEWS_API_KEY` | API | Si noticias reales | Sí | Runtime | News API | Habilita noticias financieras. | `<secret>` |
| `EXCHANGE_RATE_USD_BUY` | API | No | No | Runtime | Producto | Tasa USD→DOP para ingresos. | `58.36` |
| `EXCHANGE_RATE_USD_SELL` | API | No | No | Runtime | Producto | Tasa USD→DOP para gastos. | `58.95` |
| `LOCAL_MOCK_BACKEND` | API | No; prohibida en prod | No | Runtime | Desarrollo | Debe estar ausente/false en Render. | `false` |

`API_PORT` es solo fallback local; no se configura en Render. `LOCAL_MOCK_PLAN` solo afecta el backend mock local.

## Frontend: `moni-web`

| Variable | Servicio | Requerida | Secreta | Momento | Origen | Descripción | Ejemplo seguro |
|---|---|---|---|---|---|---|---|
| `NODE_VERSION` | Web | Sí | No | Build | Proyecto | Selecciona Node exacto. | `22.23.1` |
| `NODE_ENV` | Web | Automática/explicita | No | Build y runtime | Next/Render | Producción. | `production` |
| `PORT` | Web | Sí, automática | No | Runtime | Render | Consumida por `next start`. | proporcionada por Render |
| `NEXT_PUBLIC_API_URL` | Web | Sí | No, pública | Build y runtime | Render API | URL final de API **incluyendo `/api/v1`**. | `https://<api-host>/api/v1` |
| `NEXT_PUBLIC_PREMIUM_CHECKOUT_URL` | Web | No | No, pública | Build y runtime | Proveedor de pagos | Checkout externo; vacío mantiene modal informativo. | `https://<checkout-host>/<path>` |

## IA: `moni-ai`

| Variable | Servicio | Requerida | Secreta | Momento | Origen | Descripción | Ejemplo seguro |
|---|---|---|---|---|---|---|---|
| `PORT` | IA | Sí, automática | No | Runtime | Render | Docker/Uvicorn; fallback local 8001. | proporcionada por Render |
| `APP_NAME` | IA | No | No | Runtime | Proyecto | Nombre en metadata/health. | `Financial AI Service` |
| `APP_ENV` | IA | Sí | No | Runtime | Proyecto | Desactiva CORS de desarrollo. | `production` |
| `APP_HOST` | IA | No en Docker | No | Runtime | Desarrollo | Config declarada; Docker fuerza `0.0.0.0`. | `0.0.0.0` |
| `APP_PORT` | IA | No en Render | No | Runtime | Desarrollo | Usada por helper local; producción usa `PORT`. | `8001` |
| `AI_SERVICE_INTERNAL_API_KEY` | IA | Sí | Sí | Runtime | Secret manager | Valida backend → IA. | `<secret>` |
| `BACKEND_BASE_URL` | IA | Si contexto financiero | No | Runtime | Render API | Origen de backend, sin `/api/v1`. | `https://<api-host>` |
| `BACKEND_INTERNAL_API_KEY` | IA | Si contexto financiero | Sí | Runtime | Secret manager | IA → backend; coincide con API. | `<different-secret>` |
| `LLM_PROVIDER` | IA | Sí | No | Runtime | Producto | `mock`, `huggingface` u `openai-compatible`. | `huggingface` |
| `LLM_BASE_URL` | IA | No | No | Runtime | Proveedor LLM | Override del router/API. | `https://<llm-host>` |
| `LLM_API_KEY` | IA | Si openai-compatible | Sí | Runtime | Proveedor LLM | Credencial del endpoint compatible. | `<secret>` |
| `LLM_MODEL` | IA | Si LLM no mock | No | Runtime | Proveedor LLM | Identificador del modelo. | `<provider>/<model>` |
| `LLM_TEMPERATURE` | IA | No | No | Runtime | Producto | Temperatura. | `0.2` |
| `LLM_MAX_TOKENS` | IA | No | No | Runtime | Producto | Máximo de salida. | `900` |
| `LLM_TIMEOUT_MS` | IA | No | No | Runtime | Producto | Timeout del proveedor. | `45000` |
| `LLM_MAX_RETRIES` | IA | No | No | Runtime | Producto | Reintentos. | `1` |
| `HUGGINGFACE_API_TOKEN` | IA | Si LLM/embedding HF | Sí | Runtime | Hugging Face | Token compartido para esas integraciones. | `<secret>` |
| `EMBEDDING_PROVIDER` | IA | Si RAG | No | Runtime | Producto | `mock`, `huggingface` u `openai-compatible`. | `huggingface` |
| `EMBEDDING_BASE_URL` | IA | No | No | Runtime | Proveedor | Override de embeddings. | `https://<embedding-host>` |
| `EMBEDDING_API_KEY` | IA | Si embedding compatible | Sí | Runtime | Proveedor | Key para proveedor no HF. | `<secret>` |
| `EMBEDDING_MODEL` | IA | Si embedding no mock | No | Runtime | Proveedor | Modelo usado al ingerir y consultar. | `<provider>/<embedding-model>` |
| `EMBEDDING_DIMENSIONS` | IA | Si RAG | No | Runtime | Modelo | Debe coincidir con el vector real. | `1024` |
| `EMBEDDING_TIMEOUT_MS` | IA | No | No | Runtime | Proyecto | Timeout. | `30000` |
| `EMBEDDING_MAX_RETRIES` | IA | No | No | Runtime | Proyecto | Reintentos. | `1` |
| `ALLOW_MIXED_EMBEDDINGS` | IA | No; desaconsejada | No | Runtime | Operación | Guardrail contra mezclar modelos. | `false` |
| `CHROMA_API_KEY` | IA | Si RAG real | Sí | Runtime | Chroma Cloud | Credencial de vector store. | `<secret>` |
| `CHROMA_TENANT` | IA | Si RAG real | No | Runtime | Chroma Cloud | Tenant. | `<tenant>` |
| `CHROMA_DATABASE` | IA | Si RAG real | No | Runtime | Chroma Cloud | Database. | `<database>` |
| `CHROMA_APP_COLLECTION` | IA | Si RAG app | No | Runtime | Producto | Colección de uso de app. | `app_knowledge_global` |
| `CHROMA_FINANCE_BASIC_COLLECTION` | IA | Si RAG basic | No | Runtime | Producto | Colección educación básica. | `finance_basic_knowledge` |
| `CHROMA_FINANCE_PREMIUM_COLLECTION` | IA | Si se habilita | No | Runtime | Producto | Colección premium. | `finance_premium_investing_knowledge` |
| `CHROMA_USER_PRIVATE_COLLECTION` | IA | Si se habilita | No | Runtime | Producto | Colección privada; actualmente no habilitada. | `user_private_context` |
| `ENABLE_RAG` | IA | No | No | Runtime | Producto | Master switch; iniciar `false`. | `false` |
| `RAG_TOP_K` | IA | No | No | Runtime | Producto | Resultados por query. | `5` |
| `RAG_MAX_CONTEXT_CHARS` | IA | No | No | Runtime | Producto | Límite de contexto. | `6000` |
| `RAG_MIN_RESULTS` | IA | No | No | Runtime | Producto | Mínimo para marcar RAG usado. | `1` |
| `RAG_FAIL_CLOSED` | IA | No | No | Runtime | Producto | Error o degradación sin RAG. | `false` |
| `ENABLE_FINANCIAL_CONTEXT` | IA | No | No | Runtime | Producto | Llama al resumen agregado del backend. | `false` |
| `FINANCIAL_CONTEXT_FAIL_CLOSED` | IA | No | No | Runtime | Producto | Política ante fallo backend. | `false` |
| `FINANCIAL_CONTEXT_TIMEOUT_MS` | IA | No | No | Runtime | Producto | Timeout backend interno. | `10000` |
| `FINANCIAL_CONTEXT_MAX_PERIOD_MONTHS` | IA | No | No | Runtime | Producto | Máximo periodo solicitado. | `12` |
| `LOG_LEVEL` | IA | No | No | Runtime | Operación | Nivel de logging. | `INFO` |

No configurar RAG real hasta ingerir con un proveedor de embeddings real y dimensión consistente. El arranque y `/health` no deben tocar Chroma ni Hugging Face.
