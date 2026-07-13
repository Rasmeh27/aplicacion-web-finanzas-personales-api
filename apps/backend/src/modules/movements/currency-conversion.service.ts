import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TransactionType } from './entities/transaction.enums';

/** Moneda base / de liquidación de la app (peso dominicano, RD$). */
export const BASE_CURRENCY = 'DOP';

/**
 * Tasas oficiales del Banco Central de la República Dominicana (BCRD),
 * expresadas en RD$ por 1 USD. Se usan como defaults cuando no hay override
 * en variables de entorno.
 * - `buy`  (compra): RD$ que recibes al vender 1 USD  -> aplica a INGRESOS en USD.
 * - `sell` (venta):  RD$ que pagas para comprar 1 USD -> aplica a GASTOS en USD.
 */
export const DEFAULT_USD_BUY_RATE = 58.36;
export const DEFAULT_USD_SELL_RATE = 58.95;

export interface CurrencyRate {
  /** Tasa de compra (RD$ por 1 unidad de la divisa). Aplica a ingresos. */
  buy: number;
  /** Tasa de venta (RD$ por 1 unidad de la divisa). Aplica a gastos. */
  sell: number;
}

export interface ConversionResult {
  /** Moneda en la que queda expresado `amountBase`. */
  baseCurrency: string;
  /** Unidades de `baseCurrency` por 1 unidad de la moneda de origen. */
  exchangeRate: number;
  /** `amount` convertido a la moneda base, redondeado a 2 decimales. */
  amountBase: number;
}

/**
 * Convierte montos de una moneda a la moneda base del usuario (RD$ por defecto)
 * usando las tasas del Banco Central. El resultado (tasa + monto convertido) se
 * PERSISTE en cada movimiento al crearlo/actualizarlo, de modo que los reportes
 * suman siempre en moneda base y el histórico conserva la tasa aplicada.
 *
 * Hoy solo se conoce el par USD -> DOP. Cualquier otro par (o cuando la moneda
 * ya es la base) se resuelve 1:1 para no corromper datos.
 */
@Injectable()
export class CurrencyConversionService {
  private readonly logger = new Logger(CurrencyConversionService.name);
  private readonly rates: Record<string, CurrencyRate>;

  constructor(private readonly config: ConfigService) {
    this.rates = {
      USD: {
        buy: this.readRate('EXCHANGE_RATE_USD_BUY', DEFAULT_USD_BUY_RATE),
        sell: this.readRate('EXCHANGE_RATE_USD_SELL', DEFAULT_USD_SELL_RATE),
      },
    };
  }

  /**
   * Convierte `amount` (en `currency`) a la moneda base indicada.
   * El tipo del movimiento decide si se usa compra (income) o venta (expense).
   */
  convertToBase(params: {
    amount: number;
    currency?: string | null;
    type: TransactionType;
    baseCurrency?: string | null;
  }): ConversionResult {
    const baseCurrency = (params.baseCurrency || BASE_CURRENCY).toUpperCase();
    const currency = (params.currency || baseCurrency).toUpperCase();
    const amount = Number(params.amount) || 0;

    const exchangeRate = this.resolveRate(currency, baseCurrency, params.type);

    return {
      baseCurrency,
      exchangeRate,
      amountBase: this.round2(amount * exchangeRate),
    };
  }

  /** Tasa (unidades de base por 1 de origen) para el par y tipo indicados. */
  private resolveRate(
    currency: string,
    baseCurrency: string,
    type: TransactionType,
  ): number {
    if (currency === baseCurrency) return 1;

    // Solo sabemos convertir hacia la moneda base de la app (DOP) por ahora.
    if (baseCurrency === BASE_CURRENCY) {
      const rate = this.rates[currency];
      if (rate) {
        return type === TransactionType.INCOME ? rate.buy : rate.sell;
      }
    }

    // Par no soportado: se conserva el monto tal cual (1:1) y se avisa.
    this.logger.warn(
      `Sin tasa de cambio para ${currency}->${baseCurrency}; se usa 1:1 (sin conversión).`,
    );
    return 1;
  }

  private readRate(key: string, fallback: number): number {
    const raw = this.config.get<string>(key);
    const parsed = raw !== undefined && raw !== '' ? Number(raw) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private round2(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
