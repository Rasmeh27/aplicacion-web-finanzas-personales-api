import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  ServiceUnavailableException,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

const SERVICE_NAME = 'moni-api';

/**
 * Health checks para orquestadores (Render).
 *
 * Rutas fuera de /api/v1 (excluidas del prefijo global y version-neutral) para
 * que el proveedor las consulte de forma estable en /health/live y /health/ready.
 */
@ApiTags('health')
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * Liveness: el proceso está vivo. NO consulta base de datos ni servicios
   * externos. Se usa para detectar procesos colgados, no dependencias caídas.
   */
  @Get('live')
  @HttpCode(HttpStatus.OK)
  live() {
    return { status: 'ok', service: SERVICE_NAME };
  }

  /**
   * Readiness: el backend puede atender tráfico. Comprueba conectividad real
   * con Postgres/Supabase (SELECT 1). 200 si está listo, 503 si la BD no responde.
   * No consulta AI Service, Alpha Vantage ni ningún proveedor externo.
   */
  @Get('ready')
  @HttpCode(HttpStatus.OK)
  async ready() {
    try {
      await this.dataSource.query('SELECT 1');
    } catch (error) {
      this.logger.error(
        `Readiness check failed: database unavailable (${(error as Error).name})`,
      );
      throw new ServiceUnavailableException({
        status: 'error',
        service: SERVICE_NAME,
        database: 'down',
      });
    }

    return { status: 'ok', service: SERVICE_NAME, database: 'up' };
  }
}
