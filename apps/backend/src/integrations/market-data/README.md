# Market data integration

Capa desacoplada de datos de mercado (US stock market). El módulo de inversiones
**nunca** habla HTTP con un proveedor: siempre pasa por `MarketDataService`, que
delega en una implementación de `MarketDataProvider` y agrega cache, dedupe,
límite de concurrencia y fallback `stale`.

## Proveedores

| `MARKET_DATA_PROVIDER` | Implementación | Datos |
|---|---|---|
| `twelve_data` | `TwelveDataMarketDataProvider` | Reales (API oficial Twelve Data) |
| `alphavantage` | `AlphaVantageMarketDataProvider` | Reales (API oficial Alpha Vantage) |
| `mock` | `MockMarketDataProvider` | Demostración deterministas (isMock=true) |

### Selección explícita (sin fallback silencioso)

`resolveProvider` (en `market-data.module.ts`) es la única fuente de selección:

- `twelve_data` / `alphavantage` **requieren** su API key. Si falta, el backend
  **falla en el arranque** con un mensaje claro — nunca degrada a mock.
- `mock` solo se usa cuando se pide explícitamente (o, en desarrollo, cuando la
  variable no está definida). En **producción** una variable sin definir es error.
- Un valor no soportado también es error de configuración.
- Un fallo del proveedor real **en runtime** no cae a mock: se refleja como
  `marketDataStatus` `unavailable` / `stale` / `partial` y las posiciones siguen
  visibles con precio no disponible.

Esto corrige la causa raíz del bug de precios: antes, `alphavantage` sin key caía
en silencio al mock (AMZN≈185.46, NVDA≈133.72 con hora actual).

## Contrato normalizado

Cada provider mapea su JSON crudo a `MarketQuote` (ver `market-data.types.ts`):
`symbol, name, assetType, currency, exchange, price, previousClose, open, high,
low, volume, change, changePct, asOf, provider, marketStatus, isDelayed`. Reglas:

- Los strings numéricos se convierten de forma segura; se rechazan `NaN`,
  `Infinity` y precios `<= 0`.
- `asOf` conserva el timestamp **real** del proveedor (nunca `new Date()`).
- Símbolos normalizados a mayúsculas y validados (`^[A-Z0-9.-]{1,12}$`) antes de
  construir la request; no se arman URLs con entrada arbitraria del usuario.

## Cache, concurrencia y resiliencia

- Cache TTL en memoria: quotes ~60 s, búsqueda ~5 min, históricos ~15 min.
- Dedupe: solicitudes simultáneas del mismo recurso comparten una sola llamada.
- `getQuotes` limita la concurrencia (`MARKET_DATA_MAX_CONCURRENCY`, default 4) y,
  con cache + dedupe, garantiza **una** llamada externa por símbolo por request
  aunque la pidan varios endpoints (positions, summary, allocation).
- Timeout explícito por request; 1 retry solo ante red/5xx; 429 y 4xx no se
  reintentan. Fallback `stale` (≤ `MARKET_DATA_STALE_MAX_AGE_MS`) cuando el
  proveedor falla y hay un dato previo.

## Seguridad

- La API key vive solo en el backend; jamás en variables `NEXT_PUBLIC`, logs ni
  mensajes de error (que solo llevan endpoint + status HTTP).
- No se propaga el error crudo del proveedor al cliente: se traduce a códigos
  controlados (`invalid_market_symbol`, `market_data_rate_limited`,
  `market_data_unavailable`).

## Configurar Twelve Data

1. Crea una API key gratuita en <https://twelvedata.com>.
2. En `apps/backend/.env`:
   ```env
   MARKET_DATA_PROVIDER=twelve_data
   TWELVE_DATA_API_KEY=<tu-key>
   ```
3. Reinicia el backend. Endpoints usados: `/quote`, `/symbol_search`,
   `/time_series` (interval `1day`).

**Plan gratuito**: ~8 créditos/min y ~800/día; datos generalmente EOD/demorados.
El cache y el manejo de 429 están dimensionados para eso. Valida el licenciamiento
de Twelve Data antes de un uso comercial en producción.

## Cambiar entre mock y real

- Demo/local sin red: `MARKET_DATA_PROVIDER=mock` (el frontend muestra el badge
  "Datos de demostración").
- Real: `MARKET_DATA_PROVIDER=twelve_data` + key. Para probar el mapping sin
  gastar créditos, ver la verificación offline en
  [`docs/IMPLEMENTATION_PREMIUM_INVESTMENTS.md`](../../../../../docs/IMPLEMENTATION_PREMIUM_INVESTMENTS.md).
