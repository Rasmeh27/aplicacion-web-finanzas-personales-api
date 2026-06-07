# CU-018 Calcular ratio deuda/ingreso

## Que hice

Implemente el calculo del ratio deuda/ingreso dentro del modulo de planificacion usando las tablas reales de Supabase:

- `debts`
- `movements`

No cree tablas nuevas y no corri migraciones. El calculo toma los pagos minimos de las deudas activas y los compara contra los ingresos registrados en el mes.

## Endpoint

```http
GET /api/v1/planning/debts/income-ratio?month=6&year=2026
```

Respuesta esperada:

```json
{
  "periodMonth": "2026-06-01",
  "totalMonthlyIncome": 50000,
  "totalMinimumDebtPayment": 10000,
  "debtIncomeRatio": 20,
  "riskLevel": "healthy",
  "isHealthy": true
}
```

## Como se calcula

El backend suma:

- `minimum_payment` de las deudas con `status = active`.
- `amount` de los movimientos del mes con `type = income`.

Formula:

```text
(totalMinimumDebtPayment / totalMonthlyIncome) * 100
```

Si no hay ingresos en el mes, `debtIncomeRatio` devuelve `null` y `riskLevel` devuelve `no_income`.

## Niveles de riesgo

Use estos rangos:

- `healthy`: menor a 36%.
- `warning`: desde 36% hasta 50%.
- `critical`: mayor a 50%.
- `no_income`: no hay ingresos registrados en el mes.

## Validaciones

Agregue validacion para los query params:

- `month` debe estar entre 1 y 12.
- `year` debe estar entre 2000 y 2100.

## Archivos tocados

- `apps/backend/src/modules/planning/dto/debt-income-ratio-query.dto.ts`
- `apps/backend/src/modules/planning/use-cases/cu-018-calculate-debt-income-ratio.use-case.ts`
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
