import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { MarketDataService } from '../../integrations/market-data/market-data.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PremiumPlanGuard } from '../subscriptions/guards/premium-plan.guard';
import {
  PerformanceQueryDto,
  SymbolHistoryQueryDto,
  SymbolSearchQueryDto,
} from './dto/market-query.dto';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
import { rethrowMarketError } from './investments.errors';
import { InvestmentAnalyticsService } from './services/investment-analytics.service';
import { InvestmentPortfolioService } from './services/investment-portfolio.service';
import { InvestmentPositionsService } from './services/investment-positions.service';

/**
 * API Premium de inversiones (US stock market).
 *
 * Todos los endpoints exigen JWT válido + Plan Premium vigente
 * (PremiumPlanGuard responde 403 `premium_required` a usuarios Basic) y operan
 * con aislamiento estricto por user_id.
 */
@ApiTags('investments')
@ApiBearerAuth()
@ApiForbiddenResponse({
  description: 'Plan Premium requerido (code: premium_required).',
})
@UseGuards(JwtAuthGuard, PremiumPlanGuard)
@Controller('investments')
export class InvestmentsController {
  constructor(
    private readonly portfolioService: InvestmentPortfolioService,
    private readonly positionsService: InvestmentPositionsService,
    private readonly analyticsService: InvestmentAnalyticsService,
    private readonly marketData: MarketDataService,
  ) {}

  // --- Portafolio -----------------------------------------------------------

  @Get('portfolio')
  @ApiOperation({
    summary: 'Portafolio predeterminado del usuario',
    description: 'Lo obtiene o lo crea de forma idempotente.',
  })
  getPortfolio(@Request() req: any) {
    return this.portfolioService.getOrCreateDefaultPortfolio(this.getUserId(req));
  }

  // --- Posiciones -----------------------------------------------------------

  @Get('positions')
  @ApiOperation({
    summary: 'Posiciones activas del usuario',
    description:
      'Incluye datos de mercado enriquecidos cuando están disponibles; si el ' +
      'proveedor falla, las posiciones se conservan con estado unavailable.',
  })
  listPositions(@Request() req: any) {
    return this.analyticsService.getEnrichedPositions(this.getUserId(req));
  }

  @Post('positions')
  @ApiOperation({ summary: 'Registrar manualmente una posición' })
  @ApiResponse({ status: 201, description: 'Posición creada.' })
  @ApiResponse({ status: 400, description: 'invalid_market_symbol | invalid_purchase_date' })
  @ApiResponse({ status: 409, description: 'duplicate_position' })
  createPosition(@Request() req: any, @Body() dto: CreatePositionDto) {
    return this.positionsService.createPosition(this.getUserId(req), dto);
  }

  @Patch('positions/:id')
  @ApiOperation({ summary: 'Actualizar una posición propia' })
  @ApiResponse({ status: 404, description: 'position_not_found' })
  updatePosition(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePositionDto,
  ) {
    return this.positionsService.updatePosition(this.getUserId(req), id, dto);
  }

  @Delete('positions/:id')
  @ApiOperation({ summary: 'Eliminar (soft delete) una posición propia' })
  @ApiResponse({ status: 404, description: 'position_not_found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  removePosition(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.positionsService.removePosition(this.getUserId(req), id);
  }

  // --- Analítica ------------------------------------------------------------

  @Get('summary')
  @ApiOperation({
    summary: 'Resumen del portafolio',
    description:
      'Costo, valor de mercado, ganancia/pérdida, cambio diario y concentración. ' +
      'Los valores dependientes de mercado son null cuando no hay cotización.',
  })
  getSummary(@Request() req: any) {
    return this.analyticsService.getSummary(this.getUserId(req));
  }

  @Get('allocation')
  @ApiOperation({ summary: 'Distribución del portafolio por símbolo y tipo de activo' })
  getAllocation(@Request() req: any) {
    return this.analyticsService.getAllocation(this.getUserId(req));
  }

  @Get('performance')
  @ApiOperation({
    summary: 'Evolución del portafolio (snapshots reales)',
    description:
      'Devuelve los snapshots almacenados; incluye insufficientData cuando aún ' +
      'no hay historial suficiente. No se fabrica una curva.',
  })
  getPerformance(@Request() req: any, @Query() query: PerformanceQueryDto) {
    return this.analyticsService.getPerformance(this.getUserId(req), query.range ?? 'ALL');
  }

  // --- Mercado --------------------------------------------------------------

  @Get('symbols/search')
  @ApiOperation({ summary: 'Buscar símbolos de acciones y ETFs de EE. UU.' })
  async searchSymbols(@Query() query: SymbolSearchQueryDto) {
    try {
      const items = await this.marketData.searchSymbols(query.query);
      return {
        items,
        marketDataSource: this.marketData.providerId,
        marketData: { provider: this.marketData.providerId, isMock: this.marketData.isMock },
      };
    } catch (error) {
      rethrowMarketError(error);
    }
  }

  @Get('symbols/:symbol/quote')
  @ApiOperation({ summary: 'Cotización actual de un símbolo' })
  @ApiResponse({ status: 400, description: 'invalid_market_symbol' })
  @ApiResponse({ status: 429, description: 'market_data_rate_limited' })
  @ApiResponse({ status: 503, description: 'market_data_unavailable' })
  async getQuote(@Param('symbol') symbol: string) {
    try {
      const result = await this.marketData.getQuote(symbol);
      const quote = result.quote;
      return {
        symbol: result.symbol,
        status: result.status,
        // Modelo normalizado (currentPrice = último precio del proveedor).
        quote: quote
          ? {
              symbol: quote.symbol,
              name: quote.name,
              assetType: quote.assetType,
              currency: quote.currency,
              exchange: quote.exchange,
              currentPrice: quote.price,
              previousClose: quote.previousClose,
              open: quote.open,
              high: quote.high,
              low: quote.low,
              volume: quote.volume,
              change: quote.change,
              changePercent: quote.changePct,
              asOf: quote.asOf || null,
              provider: quote.provider,
              marketStatus: quote.marketStatus,
              dataStatus: result.status,
              isMock: this.marketData.isMock,
              isDelayed: quote.isDelayed,
            }
          : null,
        marketData: {
          provider: this.marketData.providerId,
          isMock: this.marketData.isMock,
          status: result.status,
          marketStatus: quote?.marketStatus ?? 'unknown',
          asOf: quote?.asOf || null,
        },
      };
    } catch (error) {
      rethrowMarketError(error);
    }
  }

  @Get('symbols/:symbol/history')
  @ApiOperation({ summary: 'Histórico de precios de un símbolo' })
  async getHistory(@Param('symbol') symbol: string, @Query() query: SymbolHistoryQueryDto) {
    try {
      const range = query.range ?? '3M';
      const normalized = this.marketData.normalizeSymbol(symbol);
      const points = await this.marketData.getHistoricalPrices(normalized, range);
      return {
        symbol: normalized,
        range,
        points,
        marketDataSource: this.marketData.providerId,
        marketData: { provider: this.marketData.providerId, isMock: this.marketData.isMock },
      };
    } catch (error) {
      rethrowMarketError(error);
    }
  }

  private getUserId(req: any): string {
    const userId = req.user?.id ?? req.user?.sub;
    if (userId) return userId;

    throw new UnauthorizedException('Authenticated user is required');
  }
}
