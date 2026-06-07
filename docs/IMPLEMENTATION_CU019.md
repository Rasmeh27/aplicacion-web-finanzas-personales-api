# CU-019 Ver total de ingresos del mes

## Que hice

Implemente el reporte para ver el total de ingresos de un mes dentro del modulo de dashboard y reportes.

Use la tabla real `movements` de Supabase. No cree tablas nuevas y no corri migraciones.

El calculo usa:

- `user_id`
- `type = income`
- `amount`
- `movement_date`

## Endpoint

```http
GET /api/v1/dashboard-reports/monthly-income-total?month=6&year=2026
```

Respuesta esperada:

```json
{
  "periodMonth": "2026-06-01",
  "totalIncome": 30000.5,
  "currency": "DOP"
}
```

## Validaciones

Agregue validacion para los query params:

- `month` debe estar entre 1 y 12.
- `year` debe estar entre 2000 y 2100.

## Archivos tocados

- `apps/backend/src/modules/dashboard-reports/dto/monthly-report-query.dto.ts`
- `apps/backend/src/modules/dashboard-reports/use-cases/cu-019-view-monthly-income-total.use-case.ts`
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
