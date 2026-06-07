# CU-025 Ver resumen de deudas

## Que hice

Implemente el reporte para ver el resumen de deudas dentro del modulo de dashboard y reportes.

Use las tablas reales `debts` y `debt_payments` de Supabase. No cree tablas nuevas y no corri migraciones.

El resumen toma:

- `debts.name`
- `debts.creditor`
- `debts.initial_amount`
- `debts.minimum_payment`
- `debts.interest_rate_pct`
- `debts.due_day`
- `debts.status`
- `debt_payments.amount`

## Endpoint

```http
GET /api/v1/dashboard-reports/debts-summary
```

Respuesta esperada:

```json
{
  "totalDebts": 3,
  "activeDebts": 1,
  "paidDebts": 1,
  "cancelledDebts": 1,
  "totalInitialAmount": 90000,
  "totalPaidAmount": 45000.5,
  "totalRemainingAmount": 34999.5,
  "totalMinimumPayment": 2500,
  "averageInterestRatePct": 18.5,
  "currency": "DOP",
  "debts": [
    {
      "debtId": "debt-1",
      "name": "Tarjeta",
      "creditor": "Banco A",
      "initialAmount": 50000,
      "paidAmount": 15000.5,
      "remainingAmount": 34999.5,
      "minimumPayment": 2500,
      "interestRatePct": 18.5,
      "dueDay": 15,
      "status": "active"
    }
  ]
}
```

## Calculos

- `paidAmount`: suma de pagos registrados por deuda.
- `remainingAmount`: monto inicial menos pagos, solo para deudas activas.
- `totalRemainingAmount`: total pendiente de deudas activas.
- `totalMinimumPayment`: suma de pagos minimos de deudas activas.
- `averageInterestRatePct`: promedio de interes de deudas activas.

## Archivos tocados

- `apps/backend/src/modules/dashboard-reports/use-cases/cu-025-view-debts-summary.use-case.ts`
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
