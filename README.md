# SmartWallet 💰

Plataforma Web de Finanzas Personales con AI Assistant

## Stack

| Capa        | Tecnología                        |
|-------------|-----------------------------------|
| Frontend    | Next.js 14, React, Tailwind CSS   |
| Backend     | NestJS, TypeORM, Passport JWT     |
| Base datos  | PostgreSQL 16                     |
| Caché       | Redis 7                           |
| Monorepo    | Turborepo                         |

## Estructura

```
smartwallet/
├── apps/
│   ├── backend/      # Backend - NestJS REST API
│   └── frontend/     # Frontend - Next.js (App Router)
├── packages/
│   └── shared/       # Types, constants, validations compartidas
├── infrastructure/
│   ├── docker/       # Dockerfiles
│   ├── nginx/        # Reverse proxy config
│   └── scripts/      # Setup, deploy, migrations
└── docs/
    ├── api/          # OpenAPI spec
    ├── architecture/ # HLD y diagramas
    └── decisions/    # ADRs
```

## Módulos

| Módulo | Nombre                                      |
|--------|---------------------------------------------|
| 1      | Cuenta y perfil                             |
| 2      | Movimientos                                 |
| 3      | Planificación                               |
| 4      | Dashboard y reportes                        |
| 5      | Asistente y alertas                         |
| 6      | Inversión U.S Stock Market                  |

## Inicio rápido

```bash
# 1. Clonar y entrar
git clone https://github.com/Rasmeh27/aplicacion-web-finanzas-personales-api.git
cd aplicacion-web-finanzas-personales-api

# 2. Instalar dependencias
npm install

# 3. Copiar variables de entorno
cp .env.example .env
cp apps/frontend/.env.local.example apps/frontend/.env.local

# 4. Levantar servicios (DB + Redis)
docker-compose up postgres redis -d

# 5. Correr migraciones
npm run db:migrate

# 6. Desarrollo
npm run dev
```

API disponible en: http://localhost:3001/api/v1  
Swagger docs:      http://localhost:3001/api/docs  
Frontend:          http://localhost:3000

## Módulos del MVP (Fase 1)

- [x] Cuenta y perfil
- [x] Movimientos
- [x] Planificación
- [ ] Dashboard y reportes
- [ ] Asistente y alertas
- [ ] Inversión U.S Stock Market

## Integrantes

| Nombre           | Matrícula |
|------------------|-----------|
| Ayleen Figueroa  | 1117498   |
| Fabian Alcántara | 1122348   |
| Luis Herasme     | 1120975   |
| Kevin Mieses     | 1124625   |
| Pedro Encarnacion| 1121181   |
| Juan Pablo Tavarez| 1123015  |
