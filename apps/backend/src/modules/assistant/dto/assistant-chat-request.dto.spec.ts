import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from '@jest/globals';
import { AssistantChatRequestDto } from './assistant-chat-request.dto';

const VALIDATION_OPTS = { forbidNonWhitelisted: true, whitelist: true };
const UUID = 'b3f1c0de-0000-4000-8000-000000000000';

describe('AssistantChatRequestDto', () => {
  it('acepta solo message', () => {
    const dto = plainToInstance(AssistantChatRequestDto, {
      message: 'Hola asistente',
    });
    expect(validateSync(dto, VALIDATION_OPTS)).toEqual([]);
  });

  it('acepta message + session_id UUID', () => {
    const dto = plainToInstance(AssistantChatRequestDto, {
      message: 'Hola',
      session_id: UUID,
    });
    expect(validateSync(dto, VALIDATION_OPTS)).toEqual([]);
  });

  it('rechaza un session_id que no es UUID', () => {
    const dto = plainToInstance(AssistantChatRequestDto, {
      message: 'Hola',
      session_id: 'no-es-uuid',
    });
    expect(validateSync(dto, VALIDATION_OPTS).length).toBeGreaterThan(0);
  });

  it('rechaza message vacio', () => {
    const dto = plainToInstance(AssistantChatRequestDto, { message: '' });
    expect(validateSync(dto, VALIDATION_OPTS).length).toBeGreaterThan(0);
  });

  it.each(['user_id', 'plan', 'allowed_scopes', 'user', 'metadata'])(
    'rechaza el campo prohibido "%s" enviado por el frontend',
    (field) => {
      const dto = plainToInstance(AssistantChatRequestDto, {
        message: 'Hola',
        [field]: 'valor-malicioso',
      });
      const errors = validateSync(dto, VALIDATION_OPTS);
      expect(errors.length).toBeGreaterThan(0);
    },
  );
});
