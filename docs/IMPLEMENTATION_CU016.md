# CU-016 Registrar deuda

## Que hice

Implemente el registro de deudas dentro del modulo de planificacion usando la tabla real `debts` de Supabase.

No cree tablas nuevas y no corri migraciones. La entidad usa los mismos campos que existen en la base de datos:

- `user_id`
- `name`
- `creditor`
- `initial_amount`
- `minimum_payment`
- `interest_rate_pct`
- `due_day`
- `currency`
- `status`
- `created_at`
- `updated_at`

Tambien use el enum real `debt_status`, con estos valores:

- `active`
- `paid`
- `cancelled`

## Endpoint

```http
POST /api/v1/planning/debts
```

Body:

```json
{
  "name": "Prestamo del carro",
  "creditor": "Banco Popular",
  "initialAmount": 150000,
  "minimumPayment": 7500,
  "interestRatePct": 12.5,
  "dueDay": 15,
  "currency": "DOP"
}
```

`creditor`, `minimumPayment`, `interestRatePct`, `dueDay` y `currency` son opcionales. Si no envio `currency`, se guarda como `DOP`. Si no envio `minimumPayment` o `interestRatePct`, se guardan en `0`.

## Validaciones

Agregue validaciones para que la API respete la estructura real de Supabase:

- `name` debe tener al menos 3 caracteres.
- `name` no puede quedar vacio despues de limpiar espacios.
- `initialAmount` debe ser mayor que 0.
- `minimumPayment` no puede ser negativo.
- `minimumPayment` no puede ser mayor que `initialAmount`.
- `interestRatePct` debe estar entre 0 y 100.
- `dueDay` debe estar entre 1 y 31.
- `currency` debe tener 3 letras y se guarda en mayuscula.

La deuda se crea con estado `active`.

## Archivos tocados

- `apps/backend/src/modules/planning/dto/create-debt.dto.ts`
- `apps/backend/src/modules/planning/entities/debt.entity.ts`
- `apps/backend/src/modules/planning/use-cases/cu-016-register-debt.use-case.ts`
- `apps/backend/src/modules/planning/debt.controller.ts`
- `apps/backend/src/modules/planning/debt.service.ts`
- `apps/backend/src/modules/planning/debt.service.spec.ts`
- `apps/backend/src/modules/planning/budget.module.ts`

## Pruebas

Corri estas pruebas:

```bash
npx tsc --noEmit
npm test -- --runInBand planning/budget.service.spec.ts planning/financial-goal.service.spec.ts planning/debt.service.spec.ts
```

Ambas pasaron.
