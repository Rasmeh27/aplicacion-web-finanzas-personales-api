import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from '@jest/globals';
import { CreatePositionDto } from './create-position.dto';

/** Replica la configuración global del ValidationPipe (main.ts). */
function validate(payload: Record<string, unknown>) {
  const instance = plainToInstance(CreatePositionDto, payload);
  return validateSync(instance, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
}

const validPayload = {
  symbol: 'AAPL',
  assetType: 'stock',
  quantity: 2.5,
  averageCost: 190.25,
  purchaseDate: '2026-07-01',
  notes: 'Posición principal',
};

describe('CreatePositionDto', () => {
  it('acepta el body documentado', () => {
    expect(validate(validPayload)).toHaveLength(0);
  });

  it('acepta cantidades fraccionadas', () => {
    expect(validate({ ...validPayload, quantity: 0.00000001 })).toHaveLength(0);
  });

  it.each([
    ['cantidad cero', { quantity: 0 }],
    ['cantidad negativa', { quantity: -1 }],
    ['costo negativo', { averageCost: -0.01 }],
    ['símbolo vacío', { symbol: '' }],
    ['símbolo demasiado largo', { symbol: 'ABCDEFGHIJKLM' }],
    ['símbolo con caracteres inválidos', { symbol: 'AAPL;DROP' }],
    ['assetType fuera del enum', { assetType: 'crypto' }],
    ['fecha inválida', { purchaseDate: 'not-a-date' }],
  ])('rechaza %s', (_label, override) => {
    const errors = validate({ ...validPayload, ...override });
    expect(errors.length).toBeGreaterThan(0);
  });

  it.each([['userId'], ['portfolioId'], ['plan'], ['currentPrice']])(
    'rechaza el campo extra prohibido %s (whitelist)',
    (field) => {
      const errors = validate({ ...validPayload, [field]: 'x' });
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === field)).toBe(true);
    },
  );
});
