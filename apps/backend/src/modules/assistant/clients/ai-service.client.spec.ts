import {
  BadGatewayException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { AiServiceChatRequest } from '../types/ai-service-contract.types';
import { AiServiceClient } from './ai-service.client';

const payload: AiServiceChatRequest = {
  request_id: 'req-auth-1',
  user: { id: '550e8400-e29b-41d4-a716-446655440000' },
  plan: 'basic',
  allowed_scopes: ['app_usage', 'finance_basic'],
  message: 'Hola',
};

function makeClient(apiKey: string | undefined): AiServiceClient {
  const values: Record<string, string | undefined> = {
    AI_SERVICE_BASE_URL: 'http://127.0.0.1:8001',
    AI_SERVICE_INTERNAL_API_KEY: apiKey,
    AI_SERVICE_TIMEOUT_MS: '60000',
  };
  return new AiServiceClient({
    get: jest.fn((name: string) => values[name]),
  } as unknown as ConfigService);
}

describe('AiServiceClient internal authentication', () => {
  afterEach(() => jest.restoreAllMocks());

  it.each([undefined, '', '   ', 'change-me', 'CHANGE-ME', 'your-secret'])(
    'fails before the network for a missing or placeholder key (%p)',
    async (apiKey) => {
      const fetchSpy = jest.spyOn(global, 'fetch');

      await expect(makeClient(apiKey).chat(payload)).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      expect(fetchSpy).not.toHaveBeenCalled();
    },
  );

  it('sends the configured key using X-Internal-API-Key', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ ok: true, message: 'Respuesta', metadata: {} }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    await expect(makeClient('strong-test-key').chat(payload)).resolves.toMatchObject({
      ok: true,
      message: 'Respuesta',
    });
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://127.0.0.1:8001/api/v1/chat',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'X-Internal-API-Key': 'strong-test-key',
        }),
      }),
    );
  });

  it('maps an ai-service 401 to a safe gateway error', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Invalid internal API key' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(makeClient('wrong-but-configured').chat(payload)).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });
});
