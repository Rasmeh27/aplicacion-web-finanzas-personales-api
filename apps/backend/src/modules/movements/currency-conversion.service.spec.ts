import { describe, expect, it } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import {
  BASE_CURRENCY,
  CurrencyConversionService,
  DEFAULT_USD_BUY_RATE,
  DEFAULT_USD_SELL_RATE,
} from './currency-conversion.service';
import { TransactionType } from './entities/transaction.enums';

const makeService = (env: Record<string, string | undefined> = {}) =>
  new CurrencyConversionService({
    get: (key: string) => env[key],
  } as unknown as ConfigService);

describe('CurrencyConversionService', () => {
  it('convierte INGRESOS en USD con la tasa de compra por defecto (BCRD)', () => {
    const service = makeService();

    const result = service.convertToBase({
      amount: 2400,
      currency: 'USD',
      type: TransactionType.INCOME,
    });

    expect(result.baseCurrency).toBe(BASE_CURRENCY);
    expect(result.exchangeRate).toBe(DEFAULT_USD_BUY_RATE);
    expect(result.amountBase).toBe(140064); // 2400 * 58.36
  });

  it('convierte GASTOS en USD con la tasa de venta por defecto (BCRD)', () => {
    const service = makeService();

    const result = service.convertToBase({
      amount: 100,
      currency: 'USD',
      type: TransactionType.EXPENSE,
    });

    expect(result.exchangeRate).toBe(DEFAULT_USD_SELL_RATE);
    expect(result.amountBase).toBe(5895); // 100 * 58.95
  });

  it('no convierte cuando la moneda ya es la base (tasa 1)', () => {
    const service = makeService();

    const result = service.convertToBase({
      amount: 500,
      currency: 'DOP',
      type: TransactionType.INCOME,
    });

    expect(result.exchangeRate).toBe(1);
    expect(result.amountBase).toBe(500);
  });

  it('respeta overrides de entorno para las tasas', () => {
    const service = makeService({
      EXCHANGE_RATE_USD_BUY: '60',
      EXCHANGE_RATE_USD_SELL: '61.5',
    });

    expect(
      service.convertToBase({
        amount: 10,
        currency: 'USD',
        type: TransactionType.INCOME,
      }).amountBase,
    ).toBe(600);
    expect(
      service.convertToBase({
        amount: 10,
        currency: 'USD',
        type: TransactionType.EXPENSE,
      }).amountBase,
    ).toBe(615);
  });

  it('ignora overrides inválidos y cae a los defaults', () => {
    const service = makeService({ EXCHANGE_RATE_USD_BUY: 'abc' });

    const result = service.convertToBase({
      amount: 1,
      currency: 'USD',
      type: TransactionType.INCOME,
    });

    expect(result.exchangeRate).toBe(DEFAULT_USD_BUY_RATE);
  });

  it('usa 1:1 para monedas sin tasa conocida', () => {
    const service = makeService();

    const result = service.convertToBase({
      amount: 80,
      currency: 'EUR',
      type: TransactionType.INCOME,
    });

    expect(result.exchangeRate).toBe(1);
    expect(result.amountBase).toBe(80);
  });

  it('maneja moneda nula usando la moneda base', () => {
    const service = makeService();

    const result = service.convertToBase({
      amount: 0,
      currency: null,
      type: TransactionType.INCOME,
    });

    expect(result.baseCurrency).toBe(BASE_CURRENCY);
    expect(result.exchangeRate).toBe(1);
    expect(result.amountBase).toBe(0);
  });
});
