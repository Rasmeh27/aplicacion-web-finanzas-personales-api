import { Controller, Get, Post, Put, Delete, Body, Param, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReportService } from './report.service';

@ApiTags('report')
@ApiBearerAuth()
@Controller('report')
export class ReportController {
  constructor(private readonly service: ReportService) {}

  @Get()
  findAll(@Request() req: any) {
    return this.service.findAll(req.user?.id);
  }
}
