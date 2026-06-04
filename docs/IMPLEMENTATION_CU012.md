# CU-012 Crear presupuesto mensual

## Que hice

Implemente la creacion de un presupuesto mensual general usando la tabla real `budgets` de Supabase.

No cree tablas nuevas y no corri migraciones. Revise la estructura actual de Supabase y use estos campos:

- `user_id`
- `category_id`
- `name`
- `period_month`
- `limit_amount`
- `currency`
- `created_at`
- `updated_at`

Para CU-012 el presupuesto es mensual general, por eso `category_id` se guarda como `null`. El presupuesto por categoria queda para CU-013.

## Endpoint

```http
POST /api/v1/budget
```

Body:

```json
{
  "month": 6,
  "year": 2026,
  "limitAmount": 25000,
  "currency": "DOP",
  "name": "Presupuesto mensual junio 2026"
}
```

`name` y `currency` son opcionales. Si no envio `name`, el backend genera uno como:

```text
Presupuesto mensual 06/2026
```

## Validaciones

Agregue validaciones para que la API respete las reglas que ya tiene Supabase:

- `month` debe estar entre 1 y 12.
- `year` debe estar entre 2000 y 2100.
- `limitAmount` debe ser mayor que 0.
- `currency` debe tener 3 letras y se guarda en mayuscula.
- `period_month` siempre se guarda como el primer dia del mes, por ejemplo `2026-06-01`.

Tambien valide que un usuario no pueda crear dos presupuestos mensuales generales para el mismo mes.

## Archivos tocados

- `apps/backend/src/modules/planning/entities/budget.entity.ts`
- `apps/backend/src/modules/planning/dto/create-budget.dto.ts`
- `apps/backend/src/modules/planning/budget.controller.ts`
- `apps/backend/src/modules/planning/budget.service.ts`
- `apps/backend/src/modules/planning/budget.module.ts`
- `apps/backend/src/modules/planning/use-cases/cu-012-create-monthly-budget.use-case.ts`
- `apps/backend/src/modules/planning/budget.service.spec.ts`

## Pruebas

Corri estas pruebas:

```bash
npx tsc --noEmit
npm test -- --runInBand budget.service.spec.ts
```

Ambas pasaron.
