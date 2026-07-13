# US Stock Market Investment module (Plan Premium)

Portafolio manual de acciones y ETF de EE. UU. para usuarios **Premium**.
Moneda del módulo: **USD** (sin conversión a DOP: no hay fuente real de tasas).

## Estructura

| Ruta | Propósito |
|---|---|
| `entities/` | `InvestmentPortfolio`, `InvestmentPosition`, `InvestmentPortfolioSnapshot` |
| `dto/` | `CreatePositionDto`, `UpdatePositionDto`, queries de mercado/performance |
| `domain/portfolio-math.ts` | Cálculos financieros **puros** (cost basis, market value, G/P, pesos, concentración, estado agregado) |
| `services/investment-portfolio.service.ts` | Get-or-create idempotente del portafolio default |
| `services/investment-positions.service.ts` | CRUD con aislamiento por `user_id`, normalización y verificación de símbolo |
| `services/investment-analytics.service.ts` | positions enriquecidas, summary, allocation, performance y snapshot diario idempotente |
| `services/investment-context.service.ts` | Contexto agregado para Wallter (consumido por `FinancialContextService`) |
| `investments.controller.ts` | Endpoints bajo `JwtAuthGuard` + `PremiumPlanGuard` |
| `investments.errors.ts` | Mapeo de errores del proveedor a códigos HTTP estables |

## Reglas clave

- **Todos** los endpoints requieren JWT válido **y** plan Premium vigente
  (`PremiumPlanGuard` → 403 `premium_required` para Basic).
- **Todas** las consultas filtran por `user_id`; nunca se confía solo en
  `portfolio_id`. Posición ajena → 404 `position_not_found`.
- Datos de mercado vía `integrations/market-data` (mock determinista o
  Alpha Vantage oficial) — nunca HTTP directo desde este módulo.
- Honestidad de datos: sin cotización, `marketValue`/`gainLoss`/`dayChange`
  son `null` (jamás se usa el costo como valor actual) y `marketDataStatus`
  refleja `fresh|partial|stale|unavailable|empty`.
- Snapshot diario idempotente (unique `portfolio_id+snapshot_date`) al
  consultar `/summary`; nunca degrada un snapshot `fresh` ya guardado.
- Migración: `src/database/migrations/202607110004_investments_premium.sql`
  (idempotente, con RLS defensiva).

## Endpoints (prefijo `/api/v1/investments`)

| Método | Ruta | Propósito |
|---|---|---|
| GET | `/portfolio` | Portafolio default (get-or-create idempotente) |
| GET | `/positions` | Posiciones activas enriquecidas con mercado |
| POST | `/positions` | Alta manual (valida símbolo; warning si proveedor caído) |
| PATCH | `/positions/:id` | Actualiza posición propia (símbolo NO editable) |
| DELETE | `/positions/:id` | Soft delete |
| GET | `/summary` | Totales, concentración, estado de mercado + snapshot |
| GET | `/allocation` | Distribución por símbolo y tipo de activo |
| GET | `/performance?range=` | Snapshots reales (`insufficientData` si < 2) |
| GET | `/symbols/search?query=` | Búsqueda de símbolos |
| GET | `/symbols/:symbol/quote` | Cotización actual |
| GET | `/symbols/:symbol/history?range=` | Histórico de cierres |

## Automatización futura del snapshot

`InvestmentAnalyticsService.upsertDailySnapshot` es invocable desde un job de
`@nestjs/schedule` (p. ej. `@Cron('0 22 * * 1-5')`) que itere SOLO portafolios
con posiciones activas y en lotes pequeños para respetar el rate limit del
proveedor. No implementado a propósito en esta fase (el snapshot se registra al
consultar el resumen).

Documentación completa: [`docs/IMPLEMENTATION_PREMIUM_INVESTMENTS.md`](../../../../../docs/IMPLEMENTATION_PREMIUM_INVESTMENTS.md).
