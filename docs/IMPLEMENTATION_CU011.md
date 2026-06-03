# CU-011: Filtrar movimientos por fecha, categoria o tipo

## Resumen

En este caso de uso agregue filtros al listado de movimientos para que el usuario pueda consultar sus transacciones por tipo, categoria y rango de fechas. Tambien agregue paginacion para no devolver todos los registros de una vez.

El endpoint que se usa es el mismo listado de movimientos:

```http
GET /api/v1/transactions
```

## Archivos modificados

### `apps/api/src/modules/transaction/dto/filter-transaction.dto.ts`

Cree un DTO nuevo para validar los query params del endpoint. Los filtros soportados son:

- `type`: puede ser `income` o `expense`.
- `categoryId`: debe ser un UUID.
- `startDate`: fecha inicial en formato ISO.
- `endDate`: fecha final en formato ISO.
- `limit`: cantidad de registros a retornar, con maximo de 100.
- `offset`: cantidad de registros a saltar.

Tambien agregue una validacion para evitar que `startDate` sea mayor que `endDate`.

### `apps/api/src/modules/transaction/entities/transaction.entity.ts`

Mapee la entidad `Transaction` a la tabla real de Supabase:

- Tabla: `movements`.
- `userId` usa la columna `user_id`.
- `categoryId` usa la columna `category_id`.
- `date` usa la columna `movement_date`.
- `createdAt` y `updatedAt` usan `created_at` y `updated_at`.
- `type` usa el enum existente `movement_type`.

La tabla real tambien tiene `currency`, por eso se agrego al DTO de creacion y se usa `DOP` por defecto si no viene en el request.

### `apps/api/src/modules/transaction/transaction.controller.ts`

Actualice el metodo `findAll` para recibir `FilterTransactionDto` en vez de un `query: any`.

```ts
findAll(@Request() req: any, @Query() filters: FilterTransactionDto) {
  return this.service.findAll(this.getUserId(req), filters);
}
```

Con esto Nest puede transformar y validar los parametros antes de llegar al servicio.

Como el proyecto todavia no tiene un guard JWT conectado al request, deje soporte para `X-User-Id` en desarrollo. En produccion no se acepta ese header y debe existir un usuario autenticado en `req.user`.

### `apps/api/src/modules/transaction/transaction.service.ts`

El service queda como entrada del modulo y delega el filtrado al caso de uso de CU-011.

### `apps/api/src/modules/transaction/use-cases/filter-transactions.use-case.ts`

Cree este caso de uso para que la logica de CU-011 quede ubicada en un archivo propio. Aqui se arma el `where` de TypeORM segun los filtros recibidos. La consulta usa la tabla existente `movements` y siempre filtra por `userId`, para que un usuario solo vea sus propios movimientos.

La respuesta ahora incluye metadata de paginacion:

```json
{
  "items": [],
  "total": 0,
  "limit": 20,
  "offset": 0,
  "hasMore": false
}
```

### `apps/api/src/modules/transaction/transaction.service.spec.ts`

Agregue pruebas unitarias para validar:

- filtro por tipo;
- filtro por categoria;
- filtro por fechas;
- filtros combinados;
- paginacion;
- que siempre se use el `userId` del usuario autenticado.

## Ejemplos de uso

Filtrar gastos:

```http
GET /api/v1/transactions?type=expense
```

Filtrar por categoria:

```http
GET /api/v1/transactions?categoryId=550e8400-e29b-41d4-a716-446655440000
```

Filtrar por rango de fechas:

```http
GET /api/v1/transactions?startDate=2026-01-01&endDate=2026-01-31
```

Combinar filtros:

```http
GET /api/v1/transactions?type=expense&categoryId=550e8400-e29b-41d4-a716-446655440000&startDate=2026-01-01&endDate=2026-01-31&limit=20&offset=0
```

## Validaciones

Si el cliente manda un tipo invalido, un UUID incorrecto, fechas invalidas o un `limit` fuera del rango permitido, la API debe responder con `400 Bad Request`.

La validacion del rango de fechas se hace en el DTO y tambien se verifica en el servicio antes de consultar la base de datos.

## Pruebas

Para validar esta parte se puede ejecutar:

```bash
cd apps/api
npm test -- --runInBand transaction.service.spec.ts
npm run build
```

Resultado de la validacion:

- `npm run build`: correcto.
- `npm test -- --runInBand transaction.service.spec.ts`: correcto, 18 pruebas pasadas.
- `npx tsc --noEmit`: correcto.

Tambien probe la API real contra Supabase usando `X-User-Id` en desarrollo:

```bash
curl "http://127.0.0.1:3001/api/v1/transactions?type=income&startDate=2026-06-01&endDate=2026-06-30" \
  -H "X-User-Id: 9028b0b0-a7af-4367-9f86-a8b347c55727"
```

La respuesta fue `200 OK` con movimientos desde la tabla `movements`.
