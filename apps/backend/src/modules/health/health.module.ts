import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

/**
 * Expone /health/live y /health/ready.
 *
 * No declara providers de TypeORM: el DataSource lo aporta TypeOrmModule.forRoot
 * (registrado globalmente en AppModule) y se inyecta vía @InjectDataSource().
 */
@Module({
  controllers: [HealthController],
})
export class HealthModule {}
