import { Controller, Get, Post, Put, Delete, Body, Param, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { HealthSnapshotService } from './health-snapshot.service';

@ApiTags('health-snapshot')
@ApiBearerAuth()
@Controller('health-snapshot')
export class HealthSnapshotController {
  constructor(private readonly service: HealthSnapshotService) {}

  @Get()
  findAll(@Request() req: any) {
    return this.service.findAll(req.user?.id);
  }
}
