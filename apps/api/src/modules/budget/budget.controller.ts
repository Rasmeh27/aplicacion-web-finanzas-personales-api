import { Controller, Get, Post, Put, Delete, Body, Param, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { BudgetService } from './budget.service';

@ApiTags('budget')
@ApiBearerAuth()
@Controller('budget')
export class BudgetController {
  constructor(private readonly service: BudgetService) {}

  @Get()
  findAll(@Request() req: any) {
    return this.service.findAll(req.user?.id);
  }
}
