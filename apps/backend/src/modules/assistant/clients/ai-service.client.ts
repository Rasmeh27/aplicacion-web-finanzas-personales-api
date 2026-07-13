import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AiServiceChatRequest,
  AiServiceChatResponse,
} from '../types/ai-service-contract.types';
import { isInternalApiKeyConfigured } from '../internal-api-key.util';

/**
 * Thin HTTP client for the internal AI service.
 *
 * - Targets `AI_SERVICE_BASE_URL`.
 * - Sends the `X-Internal-API-Key` header and `Content-Type: application/json`.
 * - Enforces a request timeout (`AI_SERVICE_TIMEOUT_MS`).
 * - Maps transport/HTTP failures to safe gateway errors.
 * - Never logs the API key nor the user's message content.
 */
@Injectable()
export class AiServiceClient {
  private readonly logger = new Logger(AiServiceClient.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;

  constructor(private readonly config: ConfigService) {
    const baseUrl =
      this.config.get<string>('AI_SERVICE_BASE_URL') ?? 'http://localhost:8001';
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.apiKey = (this.config.get<string>('AI_SERVICE_INTERNAL_API_KEY') ?? '').trim();
    this.timeoutMs = Number(
      this.config.get<string>('AI_SERVICE_TIMEOUT_MS') ?? 30000,
    );
  }

  /** true solo si hay una API key interna real configurada. */
  private isApiKeyConfigured(): boolean {
    return isInternalApiKeyConfigured(this.apiKey);
  }

  async chat(payload: AiServiceChatRequest): Promise<AiServiceChatResponse> {
    // Falla ANTES de la red con un mensaje inequívoco: sin esta clave el
    // ai-service SIEMPRE responde 401 y el síntoma (502 "no disponible") no
    // revela la causa. No se registra el valor de la clave, solo su ausencia.
    if (!this.isApiKeyConfigured()) {
      this.logger.error(
        `AI_SERVICE_INTERNAL_API_KEY is missing or a placeholder (request_id=${payload.request_id}). ` +
          'Set it in apps/backend/.env to the SAME value as the ai-service .env.',
      );
      throw new ServiceUnavailableException('AI service is not configured');
    }

    const url = `${this.baseUrl}/api/v1/chat`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-API-Key': this.apiKey,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (error) {
      // Network failure, DNS error, or timeout/abort -> service unreachable.
      this.logger.error(
        `AI service unreachable (request_id=${payload.request_id}, reason=${(error as Error).name})`,
      );
      throw new ServiceUnavailableException('AI service is unavailable');
    } finally {
      clearTimeout(timer);
    }

    if (response.status === 401) {
      // Internal API key rejected: integration misconfiguration, not a client
      // error. Do not leak details to the caller.
      this.logger.error(
        `AI service rejected the internal API key (request_id=${payload.request_id})`,
      );
      throw new BadGatewayException('AI service integration error');
    }

    if (!response.ok) {
      this.logger.error(
        `AI service returned HTTP ${response.status} (request_id=${payload.request_id})`,
      );
      throw new BadGatewayException('AI service integration error');
    }

    return (await response.json()) as AiServiceChatResponse;
  }
}
