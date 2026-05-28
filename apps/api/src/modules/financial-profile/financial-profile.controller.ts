import { Controller, Get, Post, Put, Delete, Body, Param, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FinancialProfileService } from './financial-profile.service';

@ApiTags('financial-profile')
@ApiBearerAuth()
@Controller('financial-profile')
export class FinancialProfileController {
  constructor(private readonly service: FinancialProfileService) {}

  @Get()
  findAll(@Request() req: any) {
    return this.service.findAll(req.user?.id);
  }
}
