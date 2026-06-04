# CU-014 Ver avance del presupuesto

## Que hice

Implemente la consulta del avance de presupuesto mensual usando las tablas reales de Supabase:

- `budgets`
- `movements`

No cree tablas nuevas y no corri migraciones. El avance se calcula comparando el limite guardado en `budgets.limit_amount` contra los movimientos de gasto (`type = expense`) del mismo mes.

## Endpoint

```http
GET /api/v1/budget/progress?month=6&year=2026
```

Respuesta esperada:

```json
{
  "periodMonth": "2026-06-01",
  "budgets": [
    {
      "id": "budget-id",
      "name": "Presupuesto mensual 06/2026",
      "categoryId": null,
      "categoryName": null,
      "periodMonth": "2026-06-01",
      "limitAmount": 25000,
      "spentAmount": 6000.5,
      "remainingAmount": 18999.5,
      "progressPercentage": 24,
      "isExceeded": false,
      "currency": "DOP"
    }
  ]
}
```

## Como se calcula

Para el presupuesto mensual general, sumo todos los movimientos de gasto del usuario dentro del mes.

Para un presupuesto por categoria, sumo solamente los movimientos de gasto que tengan ese mismo `category_id`.

El backend devuelve:

- `spentAmount`: lo gastado en el periodo.
- `remainingAmount`: lo que queda disponible.
- `progressPercentage`: porcentaje usado del presupuesto.
- `isExceeded`: indica si el gasto paso el limite.

## Validaciones

Agregue validacion para los query params:

- `month` debe estar entre 1 y 12.
- `year` debe estar entre 2000 y 2100.

El usuario se toma igual que en los otros endpoints: desde el usuario autenticado o desde `x-user-id` en desarrollo.

## Archivos tocados

- `apps/backend/src/modules/planning/dto/budget-progress-query.dto.ts`
- `apps/backend/src/modules/planning/use-cases/cu-014-view-budget-progress.use-case.ts`
- `apps/backend/src/modules/planning/budget.controller.ts`
- `apps/backend/src/modules/planning/budget.service.ts`
- `apps/backend/src/modules/planning/budget.module.ts`
- `apps/backend/src/modules/planning/budget.service.spec.ts`

## Pruebas

Corri estas pruebas:

```bash
npx tsc --noEmit
npm test -- --runInBand planning/budget.service.spec.ts
```

Ambas pasaron.
