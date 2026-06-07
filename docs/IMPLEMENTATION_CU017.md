# CU-017 Registrar pago de deuda

## Que hice

Implemente el registro de pagos de deuda dentro del modulo de planificacion usando la tabla real `debt_payments` de Supabase.

No cree tablas nuevas y no corri migraciones. La entidad usa los mismos campos que existen en la base de datos:

- `user_id`
- `debt_id`
- `amount`
- `payment_date`
- `note`
- `created_at`

La relacion se valida contra la tabla real `debts`, usando la llave compuesta `(debt_id, user_id)` para que un usuario solo pueda registrar pagos sobre sus propias deudas.

## Endpoint

```http
POST /api/v1/planning/debts/:debtId/payments
```

Body:

```json
{
  "amount": 7500,
  "paymentDate": "2026-06-30",
  "note": "Pago mensual"
}
```

`paymentDate` y `note` son opcionales. Si no envio `paymentDate`, se usa la fecha actual.

## Validaciones

Agregue validaciones para que la API respete la estructura real de Supabase:

- `amount` debe ser mayor que 0.
- La deuda debe existir.
- La deuda debe pertenecer al usuario.
- La deuda debe estar en estado `active`.
- El pago no puede ser mayor que el saldo pendiente.
- Si el pago completa el saldo, la deuda se marca como `paid`.

## Archivos tocados

- `apps/backend/src/modules/planning/dto/create-debt-payment.dto.ts`
- `apps/backend/src/modules/planning/entities/debt-payment.entity.ts`
- `apps/backend/src/modules/planning/use-cases/cu-017-register-debt-payment.use-case.ts`
- `apps/backend/src/modules/planning/debt.controller.ts`
- `apps/backend/src/modules/planning/debt.service.ts`
- `apps/backend/src/modules/planning/debt.service.spec.ts`
- `apps/backend/src/modules/planning/budget.module.ts`

## Pruebas

Corri estas pruebas:

```bash
npx tsc --noEmit
npm test -- --runInBand planning/debt.service.spec.ts
```

Ambas pasaron.
