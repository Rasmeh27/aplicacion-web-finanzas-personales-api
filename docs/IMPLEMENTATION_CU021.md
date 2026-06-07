# CU-021 Ver balance mensual

## Que hice

Implemente el reporte de balance mensual dentro del modulo de dashboard y reportes.

Use la tabla real `movements` de Supabase. No cree tablas nuevas y no corri migraciones.

El balance se calcula asi:

```text
totalIncome - totalExpense
```

## Endpoint

```http
GET /api/v1/dashboard-reports/monthly-balance?month=6&year=2026
```

Respuesta esperada:

```json
{
  "periodMonth": "2026-06-01",
  "totalIncome": 50000,
  "totalExpense": 15000.25,
  "balance": 34999.75,
  "currency": "DOP"
}
```

## Validaciones

Use el mismo DTO mensual del dashboard:

- `month` debe estar entre 1 y 12.
- `year` debe estar entre 2000 y 2100.

## Archivos tocados

- `apps/backend/src/modules/dashboard-reports/use-cases/cu-021-view-monthly-balance.use-case.ts`
- `apps/backend/src/modules/dashboard-reports/dashboard-reports.controller.ts`
- `apps/backend/src/modules/dashboard-reports/dashboard-reports.service.ts`
- `apps/backend/src/modules/dashboard-reports/dashboard-reports.module.ts`
- `apps/backend/src/modules/dashboard-reports/dashboard-reports.service.spec.ts`

## Pruebas

Corri estas pruebas:

```bash
npx tsc --noEmit
npm test -- --runInBand dashboard-reports/dashboard-reports.service.spec.ts
```

Ambas pasaron.
