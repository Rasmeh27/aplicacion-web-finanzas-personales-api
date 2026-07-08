import {
  CanActivate,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';

/**
 * Guard para endpoints INTERNOS servicio-a-servicio (ai-service -> backend).
 *
 * Valida el header `X-Internal-API-Key` contra `BACKEND_INTERNAL_API_KEY`.
 * NO usa JWT de usuario final: estos endpoints nunca se exponen al frontend.
 *
 * Reglas (mismas convenciones que el ai-service):
 *  - Key no configurada o placeholder `change-me` -> 500 (misconfiguración,
 *    no un error del caller).
 *  - Header ausente o incorrecto -> 401 (comparación en tiempo constante).
 *  - Nunca loguea la key.
 */
@Injectable()
export class InternalApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(InternalApiKeyGuard.name);

  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<string>('BACKEND_INTERNAL_API_KEY') ?? '';
    if (!expected || expected === 'change-me') {
      this.logger.error(
        'BACKEND_INTERNAL_API_KEY is not configured (empty or placeholder)',
      );
      throw new InternalServerErrorException(
        'Internal API is not configured correctly',
      );
    }

    const request = context.switchToHttp().getRequest();
    const headerValue = request.headers?.['x-internal-api-key'];
    const provided = Array.isArray(headerValue) ? headerValue[0] : headerValue;

    if (typeof provided !== 'string' || !this.safeEquals(provided, expected)) {
      throw new UnauthorizedException('Invalid internal API key');
    }
    return true;
  }

  /** Comparación en tiempo constante; longitudes distintas -> false. */
  private safeEquals(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  }
}
