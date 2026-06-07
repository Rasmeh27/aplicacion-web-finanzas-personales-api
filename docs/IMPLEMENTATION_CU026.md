# CU-026 Calcular salud financiera

## Que hice

Implemente el calculo de salud financiera dentro del modulo de dashboard y reportes.

Use las tablas reales `movements`, `debts`, `debt_payments` y `financial_goals` de Supabase. No cree tablas nuevas y no corri migraciones.

El calculo toma:

- Ingresos y gastos del mes desde `movements`.
- Deudas activas desde `debts`.
- Pagos de deudas desde `debt_payments`.
- Avance de metas desde `financial_goals`.

## Endpoint

```http
GET /api/v1/dashboard-reports/financial-health?month=6&year=2026
```

Respuesta esperada:

```json
{
  "periodMonth": "2026-06-01",
  "totalIncome": 50000,
  "totalExpense": 15000,
  "monthlyBalance": 35000,
  "savingsPercentage": 70,
  "debtIncomeRatio": 10,
  "totalDebtRemaining": 30000,
  "goalsProgressPercentage": 50,
  "financialHealthScore": 90,
  "status": "excellent",
  "recommendations": [
    "Priorizar pagos a deudas activas para bajar el saldo pendiente."
  ],
  "currency": "DOP"
}
```

## Calculos

- `savingsPercentage`: balance mensual dividido entre ingresos.
- `debtIncomeRatio`: pagos minimos de deudas activas dividido entre ingresos.
- `totalDebtRemaining`: monto inicial de deudas activas menos pagos registrados.
- `goalsProgressPercentage`: avance general de metas.
- `financialHealthScore`: puntuacion de 0 a 100 usando ahorro, deuda/ingreso, balance y metas.
- `status`: `excellent`, `stable`, `attention` o `critical`.

## Archivos tocados

- `apps/backend/src/modules/dashboard-reports/use-cases/cu-026-calculate-financial-health.use-case.ts`
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
