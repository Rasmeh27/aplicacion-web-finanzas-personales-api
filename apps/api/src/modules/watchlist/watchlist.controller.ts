import { Controller, Get, Post, Put, Delete, Body, Param, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { WatchlistService } from './watchlist.service';

@ApiTags('watchlist')
@ApiBearerAuth()
@Controller('watchlist')
export class WatchlistController {
  constructor(private readonly service: WatchlistService) {}

  @Get()
  findAll(@Request() req: any) {
    return this.service.findAll(req.user?.id);
  }
}
