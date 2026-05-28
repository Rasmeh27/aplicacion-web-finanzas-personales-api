import { Module } from '@nestjs/common';
import { HealthSnapshotController } from './health-snapshot.controller';
import { HealthSnapshotService }    from './health-snapshot.service';

@Module({
  controllers: [HealthSnapshotController],
  providers:   [HealthSnapshotService],
  exports:     [HealthSnapshotService],
})
export class HealthSnapshotModule {}
