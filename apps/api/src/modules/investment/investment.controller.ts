import { Controller, Get, Post, Put, Delete, Body, Param, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InvestmentService } from './investment.service';

@ApiTags('investment')
@ApiBearerAuth()
@Controller('investment')
export class InvestmentController {
  constructor(private readonly service: InvestmentService) {}

  @Get()
  findAll(@Request() req: any) {
    return this.service.findAll(req.user?.id);
  }
}
