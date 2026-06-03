# Crear presupuesto por categoria

## Endpoint

```http
POST /api/v1/budget/category
```

En desarrollo se puede probar con el header `X-User-Id`:

```bash
curl -X POST http://localhost:3001/api/v1/budget/category \
  -H "Content-Type: application/json" \
  -H "X-User-Id: 550e8400-e29b-41d4-a716-446655440000" \
  -d '{
    "categoryId": "550e8400-e29b-41d4-a716-446655440001",
    "month": 6,
    "year": 2026,
    "limitAmount": 8500,
    "currency": "DOP",
    "name": "Presupuesto comida junio 2026"
  }'
```

Respuesta esperada:

```json
{
  "id": "uuid-del-presupuesto",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "categoryId": "550e8400-e29b-41d4-a716-446655440001",
  "name": "Presupuesto comida junio 2026",
  "periodMonth": "2026-06-01",
  "limitAmount": "8500.00",
  "currency": "DOP",
  "createdAt": "2026-06-03T00:00:00.000Z",
  "updatedAt": "2026-06-03T00:00:00.000Z"
}
```

## Reglas

La categoria debe ser del usuario y debe ser de tipo `expense`.

No se puede crear dos veces un presupuesto para la misma categoria en el mismo mes.

## Listar presupuestos

Los presupuestos por categoria salen en el mismo endpoint de listado:

```http
GET /api/v1/budget
```
