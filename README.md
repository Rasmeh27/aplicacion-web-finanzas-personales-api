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

## Integrantes

| Nombre | Matricula |
|--------|-----------|
| Ayleen Figueroa | 1117498 |
| Fabian Alcantara | 1122348 |
| Luis Herasme | 1120975 |
| Kevin Mieses | 1124625 |
| Pedro Encarnacion | 1121181 |
| Juan Pablo Tavarez | 1123015 |
