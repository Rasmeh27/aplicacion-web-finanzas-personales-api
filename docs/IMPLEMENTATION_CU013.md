# CU-013 Crear presupuesto por categoria

## Que hice

Implemente la creacion de presupuestos por categoria usando la tabla real `budgets` de Supabase.

No cree tablas nuevas y no corri migraciones. El presupuesto por categoria usa los mismos campos que el presupuesto mensual:

- `user_id`
- `category_id`
- `name`
- `period_month`
- `limit_amount`
- `currency`
- `created_at`
- `updated_at`

La diferencia con CU-012 es que aqui `category_id` si se guarda con el id de una categoria. Para que quede consistente con la base de datos, primero valido que la categoria exista y pertenezca al usuario.

## Endpoint

```http
POST /api/v1/budget/category
```

Body:

```json
{
  "categoryId": "550e8400-e29b-41d4-a716-446655440000",
  "month": 6,
  "year": 2026,
  "limitAmount": 8500,
  "currency": "DOP",
  "name": "Presupuesto comida junio 2026"
}
```

`name` y `currency` son opcionales. Si no envio `name`, el backend genera uno usando el nombre de la categoria:

```text
Presupuesto Comida 06/2026
```

## Validaciones

Agregue validaciones para que la API respete la estructura real de Supabase:

- `categoryId` debe ser un UUID.
- La categoria debe existir.
- La categoria debe pertenecer al usuario.
- La categoria debe ser de tipo `expense`.
- `month` debe estar entre 1 y 12.
- `year` debe estar entre 2000 y 2100.
- `limitAmount` debe ser mayor que 0.
- `currency` debe tener 3 letras y se guarda en mayuscula.
- `period_month` siempre se guarda como el primer dia del mes, por ejemplo `2026-06-01`.

Tambien valide que un usuario no pueda crear dos presupuestos para la misma categoria en el mismo mes.

## Archivos tocados

- `apps/backend/src/modules/planning/dto/create-category-budget.dto.ts`
- `apps/backend/src/modules/planning/use-cases/create-category-budget.use-case.ts`
- `apps/backend/src/modules/planning/budget.controller.ts`
- `apps/backend/src/modules/planning/budget.service.ts`
- `apps/backend/src/modules/planning/budget.module.ts`
- `apps/backend/src/modules/planning/budget.service.spec.ts`

## Pruebas

Corri estas pruebas:

```bash
npx tsc --noEmit
npm test -- --runInBand budget.service.spec.ts
```

Ambas pasaron.
