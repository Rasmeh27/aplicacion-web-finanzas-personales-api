# SmartWallet

Plataforma web de finanzas personales con AI Assistant.

## Stack

| Capa | Tecnologia |
|------|------------|
| Frontend | Next.js 14, React, Tailwind CSS |
| Backend | NestJS, TypeORM, Passport JWT |
| Base de datos | PostgreSQL 16 / Supabase |
| Cache | Redis 7 |
| Monorepo | Turborepo |

## Estructura

```txt
smartwallet/
|-- apps/
|   |-- backend/      # Backend - NestJS REST API
|   `-- frontend/     # Frontend - Next.js App Router
|-- packages/
|   `-- shared/       # Types, constants, validations compartidas
|-- infrastructure/
|   |-- docker/       # Dockerfiles
|   |-- nginx/        # Reverse proxy config
|   `-- scripts/      # Setup, deploy, migrations
`-- docs/
    |-- api/          # OpenAPI spec
    |-- architecture/ # HLD y diagramas
    `-- decisions/    # ADRs
```

## Modulos

| Modulo | Nombre |
|--------|--------|
| 1 | Cuenta y perfil |
| 2 | Movimientos |
| 3 | Planificacion |
| 4 | Dashboard y reportes |
| 5 | Asistente y alertas |
| 6 | Inversion U.S Stock Market |

## Inicio rapido

```bash
# 1. Clonar y entrar
git clone https://github.com/Rasmeh27/aplicacion-web-finanzas-personales-api.git
cd aplicacion-web-finanzas-personales-api

# 2. Instalar dependencias
npm install

# 3. Copiar variables de entorno
cp .env.example .env
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.local.example apps/frontend/.env.local

# 4. Levantar servicios locales opcionales
docker-compose up postgres redis -d

# 5. Correr migraciones
npm run db:migrate

# 6. Desarrollo
npm run dev
```

API disponible en: http://localhost:3001/api/v1
Swagger docs: http://localhost:3001/api/docs
Frontend: http://localhost:3000

## Modulos del MVP

- [x] Cuenta y perfil
- [x] Movimientos
- [x] Planificacion
- [x] Dashboard y reportes
- [ ] Asistente y alertas
- [ ] Inversion U.S Stock Market

## AI Assistant (integración con el AI Service)

El módulo `assistant` (`apps/backend/src/modules/assistant/`) expone el asistente
de IA al frontend. Arquitectura:

```
Frontend  ->  Backend NestJS (/api/v1/assistant/chat)  ->  AI Service FastAPI (/api/v1/chat)
```

El frontend **nunca** llama directamente al AI Service.

### Endpoint frontend -> backend

`POST /api/v1/assistant/chat` — requiere usuario autenticado (`JwtAuthGuard`,
header `Authorization: Bearer <token>`).

El frontend solo puede enviar (y **nada más**):

```json
{
  "message": "¿Cómo voy con mi presupuesto este mes?",
  "session_id": "opcional"
}
```

Gracias al `ValidationPipe` global (`whitelist` + `forbidNonWhitelisted`),
cualquier otro campo (`user_id`, `plan`, `allowed_scopes`, `scope`, `tenant_id`,
`metadata`, ...) se rechaza con **400**. Los datos de autorización los resuelve el
backend desde el usuario autenticado, nunca desde el body.

Respuesta al frontend (limpia, sin detalles internos):

```json
{ "ok": true, "message": "...", "session_id": "...", "metadata": {} }
```

### Contrato interno backend -> AI Service

`AssistantService` construye el request y `AiServiceClient` lo envía con el header
`X-Internal-API-Key`:

```json
{
  "request_id": "uuid",
  "user": { "id": "authenticated-user-id", "email": "opcional" },
  "plan": "basic",
  "allowed_scopes": ["app_usage", "finance_basic"],
  "message": "...",
  "session_id": "opcional",
  "locale": "es",
  "metadata": { "source": "web_app" }
}
```

Scopes por plan (el AI Service revalida y responde 422 si no corresponden):

| Plan      | allowed_scopes                                                  |
| --------- | --------------------------------------------------------------- |
| `basic`   | `app_usage`, `finance_basic`                                    |
| `premium` | `app_usage`, `finance_basic`, `finance_premium`, `user_private` |

> El plan se resuelve en `AssistantService.resolveUserPlan()` — hoy es un
> **placeholder** que devuelve `basic`; se reemplazará por el módulo real de
> planes/suscripciones.

### Errores

| Situación                        | Respuesta |
| -------------------------------- | --------- |
| Usuario no autenticado           | `401`     |
| Body inválido                    | `400`     |
| AI Service no responde / timeout | `503`     |
| AI Service rechaza la API key    | `502`     |

### Variables de entorno (backend)

```
AI_SERVICE_BASE_URL=http://localhost:8001
AI_SERVICE_INTERNAL_API_KEY=change-me   # debe coincidir con la del ai-service; usar clave fuerte
AI_SERVICE_TIMEOUT_MS=30000
```

## Integrantes

| Nombre | Matricula |
|--------|-----------|
| Ayleen Figueroa | 1117498 |
| Fabian Alcantara | 1122348 |
| Luis Herasme | 1120975 |
| Kevin Mieses | 1124625 |
| Pedro Encarnacion | 1121181 |
| Juan Pablo Tavarez | 1123015 |
