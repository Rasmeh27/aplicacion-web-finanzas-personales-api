import { Controller, Get, Post, Put, Delete, Body, Param, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { NewsService } from './news.service';

@ApiTags('news')
@ApiBearerAuth()
@Controller('news')
export class NewsController {
  constructor(private readonly service: NewsService) {}

  @Get()
  findAll(@Request() req: any) {
    return this.service.findAll(req.user?.id);
  }
}
