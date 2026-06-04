# CU-015 Crear metas financieras

## Que hice

Implemente la creacion de metas financieras dentro del modulo de planificacion usando la tabla real `financial_goals` de Supabase.

No cree tablas nuevas y no corri migraciones. La entidad usa los mismos campos que existen en la base de datos:

- `user_id`
- `name`
- `target_amount`
- `current_amount`
- `currency`
- `target_date`
- `status`
- `created_at`
- `updated_at`

Tambien use el enum real `goal_status`, con estos valores:

- `active`
- `completed`
- `paused`
- `cancelled`

## Endpoint

```http
POST /api/v1/planning/goals
```

Body:

```json
{
  "name": "Fondo de emergencia",
  "targetAmount": 50000,
  "currentAmount": 5000,
  "currency": "DOP",
  "targetDate": "2026-12-31"
}
```

`currentAmount`, `currency` y `targetDate` son opcionales. Si no envio `currentAmount`, se guarda en `0`. Si no envio `currency`, se guarda como `DOP`.

## Validaciones

Agregue validaciones para que la API respete la estructura real de Supabase:

- `name` debe tener al menos 3 caracteres.
- `targetAmount` debe ser mayor que 0.
- `currentAmount` no puede ser negativo.
- `currentAmount` no puede ser mayor que `targetAmount`.
- `currency` debe tener 3 letras y se guarda en mayuscula.
- `targetDate` debe ser una fecha valida.
- `targetDate` no puede estar en el pasado.

Si el `currentAmount` es igual al `targetAmount`, la meta se crea con estado `completed`. En los demas casos se crea como `active`.

## Archivos tocados

- `apps/backend/src/modules/planning/dto/create-financial-goal.dto.ts`
- `apps/backend/src/modules/planning/entities/financial-goal.entity.ts`
- `apps/backend/src/modules/planning/use-cases/cu-015-create-financial-goal.use-case.ts`
- `apps/backend/src/modules/planning/financial-goal.controller.ts`
- `apps/backend/src/modules/planning/financial-goal.service.ts`
- `apps/backend/src/modules/planning/financial-goal.service.spec.ts`
- `apps/backend/src/modules/planning/budget.module.ts`

## Pruebas

Corri estas pruebas:

```bash
npx tsc --noEmit
npm test -- --runInBand planning/budget.service.spec.ts planning/financial-goal.service.spec.ts
```

Ambas pasaron.
