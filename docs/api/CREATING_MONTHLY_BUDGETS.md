# Crear presupuesto mensual

## Endpoint

```http
POST /api/v1/budget
```

En desarrollo se puede probar con el header `X-User-Id`, igual que en movimientos:

```bash
curl -X POST http://localhost:3001/api/v1/budget \
  -H "Content-Type: application/json" \
  -H "X-User-Id: 550e8400-e29b-41d4-a716-446655440000" \
  -d '{
    "month": 6,
    "year": 2026,
    "limitAmount": 25000,
    "currency": "DOP",
    "name": "Presupuesto mensual junio 2026"
  }'
```

Respuesta esperada:

```json
{
  "id": "uuid-del-presupuesto",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "categoryId": null,
  "name": "Presupuesto mensual junio 2026",
  "periodMonth": "2026-06-01",
  "limitAmount": "25000.00",
  "currency": "DOP",
  "createdAt": "2026-06-03T00:00:00.000Z",
  "updatedAt": "2026-06-03T00:00:00.000Z"
}
```

## Listar presupuestos

```http
GET /api/v1/budget
```

Ejemplo:

```bash
curl http://localhost:3001/api/v1/budget \
  -H "X-User-Id: 550e8400-e29b-41d4-a716-446655440000"
```

## Notas

Este caso de uso crea el presupuesto mensual general. Por eso `categoryId` queda en `null`.

El presupuesto por categoria corresponde a CU-013.
