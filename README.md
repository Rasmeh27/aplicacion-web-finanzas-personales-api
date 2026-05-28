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
│   ├── web/          # Next.js (App Router)
│   └── api/          # NestJS REST API
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

## Módulos del API (NestJS)

| Módulo              | Responsabilidad                              |
|---------------------|----------------------------------------------|
| `auth`              | Registro, login, JWT, MFA, recuperación      |
| `user`              | Perfil de usuario y preferencias             |
| `financial-profile` | Configuración financiera personal            |
| `transaction`       | CRUD de ingresos y gastos                    |
| `category`          | Categorías predefinidas y personalizadas     |
| `budget`            | Presupuestos mensuales y alertas             |
| `goal`              | Metas financieras y seguimiento              |
| `debt`              | Control de deudas y vencimientos             |
| `health-snapshot`   | Índice interno de salud financiera           |
| `report`            | Generación de reportes                       |
| `ai-assistant`      | Chat contextual con guardrails               |
| `investment`        | Portafolio manual (Premium)                  |
| `watchlist`         | Seguimiento de activos (Premium)             |
| `news`              | Noticias financieras autorizadas (Premium)   |
| `notification`      | Alertas in-app y correo                      |
| `audit`             | Trazabilidad y cumplimiento                  |

## Inicio rápido

```bash
# 1. Clonar y entrar
git clone https://github.com/Rasmeh27/aplicacion-web-finanzas-personales-api.git
cd aplicacion-web-finanzas-personales-api

# 2. Instalar dependencias
npm install

# 3. Copiar variables de entorno
cp .env.example .env
cp apps/web/.env.local.example apps/web/.env.local

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

- [x] Autenticación y perfil
- [x] Gestión de ingresos y gastos
- [x] Categorías
- [ ] Dashboard financiero
- [ ] Presupuestos
- [ ] Metas
- [ ] Control de deudas
- [ ] Índice de salud financiera
- [ ] Reportes básicos
- [ ] AI Assistant básico

## Integrantes

| Nombre           | Matrícula |
|------------------|-----------|
| Ayleen Figueroa  | 1117498   |
| Fabian Alcántara | 1122348   |
| Luis Herasme     | 1120975   |
| Kevin Mieses     | 1124625   |
| Pedro Encarnacion| 1121181   |
| Juan Pablo Tavarez| 1123015  |
