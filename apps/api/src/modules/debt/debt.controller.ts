import { Controller, Get, Post, Put, Delete, Body, Param, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DebtService } from './debt.service';

@ApiTags('debt')
@ApiBearerAuth()
@Controller('debt')
export class DebtController {
  constructor(private readonly service: DebtService) {}

  @Get()
  findAll(@Request() req: any) {
    return this.service.findAll(req.user?.id);
  }
}
