import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
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

async function bootstrap() {
  const rootModule = readLocalEnvFlag('LOCAL_MOCK_BACKEND') === 'true' ? LocalDevModule : AppModule;
  const app = await NestFactory.create(rootModule);
  const config = app.get(ConfigService);

  // Security
  app.use(helmet());
  app.enableCors({
    origin: config.get('FRONTEND_URL'),
    credentials: true,
  });

  // Versioning
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // Global prefix
  app.setGlobalPrefix('api');

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger (dev only)
  if (config.get('NODE_ENV') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('SmartWallet API')
      .setDescription('Plataforma Web de Finanzas Personales con AI Assistant')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = config.get('API_PORT') ?? 3001;
  await app.listen(port);
  console.log(`🚀 SmartWallet API running on port ${port}`);
}

bootstrap();
