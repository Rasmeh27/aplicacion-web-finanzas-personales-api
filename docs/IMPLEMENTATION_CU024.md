# CU-024 Ver resumen de metas

## Que hice

Implemente el reporte para ver el resumen de metas financieras dentro del modulo de dashboard y reportes.

Use la tabla real `financial_goals` de Supabase. No cree tablas nuevas y no corri migraciones.

El resumen toma:

- `financial_goals.name`
- `financial_goals.target_amount`
- `financial_goals.current_amount`
- `financial_goals.target_date`
- `financial_goals.status`

## Endpoint

```http
GET /api/v1/dashboard-reports/financial-goals-summary
```

Respuesta esperada:

```json
{
  "totalGoals": 3,
  "activeGoals": 1,
  "completedGoals": 1,
  "pausedGoals": 1,
  "cancelledGoals": 0,
  "totalTargetAmount": 170000,
  "totalCurrentAmount": 80000,
  "overallProgressPercentage": 47.06,
  "currency": "DOP",
  "goals": [
    {
      "goalId": "goal-1",
      "name": "Fondo de emergencia",
      "targetAmount": 100000,
      "currentAmount": 25000,
      "remainingAmount": 75000,
      "progressPercentage": 25,
      "status": "active",
      "targetDate": "2026-12-31"
    }
  ]
}
```

## Calculos

- `remainingAmount`: monto objetivo menos monto actual.
- `progressPercentage`: avance de cada meta.
- `overallProgressPercentage`: avance general usando el total acumulado sobre el total objetivo.
- Las metas completadas, activas, pausadas y canceladas se cuentan por estado.

## Archivos tocados

- `apps/backend/src/modules/dashboard-reports/use-cases/cu-024-view-financial-goals-summary.use-case.ts`
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
