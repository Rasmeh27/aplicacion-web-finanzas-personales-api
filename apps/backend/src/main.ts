import { NestFactory } from '@nestjs/core';
import {
  Logger,
  RequestMethod,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { existsSync, readFileSync } from 'fs';
import { AppModule } from './app.module';
import { BACKEND_ENV_FILE } from './config/env-file';
import { LocalDevModule } from './local-dev.module';

function readLocalEnvFlag(name: string): string | undefined {
  if (process.env[name]) return process.env[name];

  if (!existsSync(BACKEND_ENV_FILE)) return undefined;

  const line = readFileSync(BACKEND_ENV_FILE, 'utf8')
    .split(/\r?\n/)
    .find((entry) => entry.trim().startsWith(`${name}=`));

  return line?.slice(line.indexOf('=') + 1).trim();
}

/**
 * Parsea la lista de orígenes permitidos desde FRONTEND_URL.
 * Admite uno o varios separados por coma. Elimina espacios e ignora vacíos.
 * Se conserva el nombre de variable existente (FRONTEND_URL) por compatibilidad.
 */
function parseAllowedOrigins(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

async function bootstrap() {
  const rootModule =
    readLocalEnvFlag('LOCAL_MOCK_BACKEND') === 'true' ? LocalDevModule : AppModule;
  const app = await NestFactory.create(rootModule);
  const config = app.get(ConfigService);
  const nodeEnv = config.get<string>('NODE_ENV') ?? 'development';
  const isProduction = nodeEnv === 'production';

  // Cierre ordenado: TypeORM/Supabase cierran conexiones al recibir SIGTERM
  // (Render envía SIGTERM en cada deploy/scale-down).
  app.enableShutdownHooks();

  // Security
  app.use(helmet());

  // CORS restringido por variable de entorno. Nunca origin:'*' con credentials.
  const allowedOrigins = parseAllowedOrigins(config.get<string>('FRONTEND_URL'));
  app.enableCors({
    origin: (origin, callback) => {
      // Peticiones sin Origin (curl, health checks, server-to-server) se permiten:
      // CORS solo aplica a navegadores.
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin not allowed by CORS: ${origin}`), false);
    },
    credentials: true,
  });

  // Versioning
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // Global prefix. Los health checks quedan FUERA de /api/v1 para que Render
  // pueda consultarlos en /health/live y /health/ready.
  app.setGlobalPrefix('api', {
    exclude: [
      { path: 'health/live', method: RequestMethod.GET },
      { path: 'health/ready', method: RequestMethod.GET },
    ],
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger. Configurable por ENABLE_SWAGGER; si no se define, se mantiene el
  // comportamiento histórico (activo solo fuera de producción).
  const swaggerFlag = config.get<string>('ENABLE_SWAGGER');
  const enableSwagger =
    swaggerFlag !== undefined ? swaggerFlag === 'true' : !isProduction;
  if (enableSwagger) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('MONI API')
      .setDescription('Plataforma Web de Finanzas Personales con AI Assistant')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  // Puerto: Render inyecta PORT; API_PORT es el fallback local histórico.
  const port = Number(process.env.PORT ?? config.get<string>('API_PORT') ?? 3001);
  await app.listen(port, '0.0.0.0');
  Logger.log(`🚀 MONI API running on 0.0.0.0:${port} (${nodeEnv})`, 'Bootstrap');
}

bootstrap().catch((error) => {
  Logger.error(`Fatal error during bootstrap: ${(error as Error).message}`, 'Bootstrap');
  process.exit(1);
});
