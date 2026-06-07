# CU-023 Ver gastos por categoria

## Que hice

Implemente el reporte para ver los gastos del mes agrupados por categoria dentro del modulo de dashboard y reportes.

Use las tablas reales `movements` y `categories` de Supabase. No cree tablas nuevas y no corri migraciones.

El calculo usa:

- `movements.type = expense`
- `movements.amount`
- `movements.movement_date`
- `movements.category_id`
- `categories.name`

## Endpoint

```http
GET /api/v1/dashboard-reports/expenses-by-category?month=6&year=2026
```

Respuesta esperada:

```json
{
  "periodMonth": "2026-06-01",
  "totalExpense": 5000,
  "categories": [
    {
      "categoryId": "food-category",
      "categoryName": "Comida",
      "totalExpense": 4000,
      "percentage": 80
    }
  ],
  "currency": "DOP"
}
```

Los gastos sin categoria se agrupan como `Sin categoria`.

## Validaciones

Use el mismo DTO mensual del dashboard:

- `month` debe estar entre 1 y 12.
- `year` debe estar entre 2000 y 2100.

## Archivos tocados

- `apps/backend/src/modules/dashboard-reports/use-cases/cu-023-view-expenses-by-category.use-case.ts`
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
