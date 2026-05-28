import { Controller, Get, Post, Put, Delete, Body, Param, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { GoalService } from './goal.service';

@ApiTags('goal')
@ApiBearerAuth()
@Controller('goal')
export class GoalController {
  constructor(private readonly service: GoalService) {}

  @Get()
  findAll(@Request() req: any) {
    return this.service.findAll(req.user?.id);
  }
}
