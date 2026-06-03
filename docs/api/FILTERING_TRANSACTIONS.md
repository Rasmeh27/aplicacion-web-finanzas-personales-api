# CU-011: Filtrar movimientos

Este endpoint permite listar los movimientos del usuario autenticado y aplicar filtros opcionales por tipo, categoria y fecha.

```http
GET /api/v1/transactions
Authorization: Bearer <jwt_token>
```

En desarrollo tambien se puede probar con el header `X-User-Id`, porque el guard JWT del proyecto todavia no esta conectado a `req.user`.

## Query params

| Parametro | Tipo | Descripcion |
| --- | --- | --- |
| `type` | `income` o `expense` | Filtra por tipo de movimiento. |
| `categoryId` | UUID | Filtra por categoria. |
| `startDate` | string | Fecha inicial en formato ISO, por ejemplo `2026-01-01`. |
| `endDate` | string | Fecha final en formato ISO, por ejemplo `2026-01-31`. |
| `limit` | number | Cantidad de registros a retornar. Por defecto es `20` y el maximo es `100`. |
| `offset` | number | Cantidad de registros a saltar. Por defecto es `0`. |

Todos los parametros son opcionales y se pueden combinar.

## Ejemplos

Filtrar solo gastos:

```http
GET /api/v1/transactions?type=expense
```

Filtrar por categoria:

```http
GET /api/v1/transactions?categoryId=550e8400-e29b-41d4-a716-446655440000
```

Filtrar por fechas:

```http
GET /api/v1/transactions?startDate=2026-05-01&endDate=2026-05-31
```

Usar paginacion:

```http
GET /api/v1/transactions?limit=25&offset=0
GET /api/v1/transactions?limit=25&offset=25
```

Combinar filtros:

```http
GET /api/v1/transactions?type=expense&categoryId=550e8400-e29b-41d4-a716-446655440000&startDate=2026-05-01&endDate=2026-05-31&limit=20&offset=0
```

## Respuesta

```json
{
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "type": "expense",
      "amount": 50,
      "currency": "DOP",
      "description": "Compra en mercado",
      "date": "2026-05-15",
      "categoryId": "550e8400-e29b-41d4-a716-446655440000",
      "category": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Alimentacion",
        "type": "expense"
      },
      "createdAt": "2026-05-15T10:30:00Z",
      "updatedAt": "2026-05-15T10:30:00Z"
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0,
  "hasMore": false
}
```

## Validaciones

La API valida lo siguiente:

- `type` solo puede ser `income` o `expense`.
- `categoryId` debe ser un UUID valido.
- `startDate` y `endDate` deben ser fechas validas.
- `startDate` no puede ser mayor que `endDate`.
- `limit` debe estar entre `1` y `100`.
- `offset` debe ser mayor o igual a `0`.

Si una validacion falla, la API responde con `400 Bad Request`.

## Notas

La consulta usa la tabla existente `movements` de Supabase. No se agrega una tabla nueva ni se necesita una migracion para este caso de uso, porque los campos usados para filtrar ya existen: `user_id`, `type`, `category_id` y `movement_date`.
