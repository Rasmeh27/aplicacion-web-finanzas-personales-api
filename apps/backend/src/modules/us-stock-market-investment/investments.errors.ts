import {
  BadRequestException,
  HttpException,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  InvalidMarketSymbolError,
  MarketDataRateLimitedError,
  MarketDataUnavailableError,
} from '../../integrations/market-data/market-data.errors';

/**
 * Traduce errores tipados de la integración de mercado a respuestas HTTP con
 * códigos estables. Nunca expone mensajes crudos del proveedor.
 */
export function rethrowMarketError(error: unknown): never {
  if (error instanceof InvalidMarketSymbolError) {
    throw new BadRequestException({
      statusCode: 400,
      code: 'invalid_market_symbol',
      message: 'El símbolo no es válido o no pudo resolverse en el mercado.',
    });
  }
  if (error instanceof MarketDataRateLimitedError) {
    throw new HttpException(
      {
        statusCode: 429,
        code: 'market_data_rate_limited',
        message: 'El proveedor de datos de mercado alcanzó su límite. Intenta más tarde.',
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
  if (error instanceof MarketDataUnavailableError) {
    throw new ServiceUnavailableException({
      statusCode: 503,
      code: 'market_data_unavailable',
      message: 'Los datos de mercado no están disponibles en este momento.',
    });
  }
  throw error;
}
