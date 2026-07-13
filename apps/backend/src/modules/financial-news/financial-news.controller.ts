import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PremiumPlanGuard } from '../subscriptions/guards/premium-plan.guard';
import { FinancialNewsQueryDto } from './dto/financial-news-query.dto';
import { FinancialNewsService } from './financial-news.service';

@ApiTags('financial-news')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PremiumPlanGuard)
@Controller('financial-news')
export class FinancialNewsController {
  constructor(private readonly service: FinancialNewsService) {}

  @Get()
  @ApiOperation({ summary: 'Consultar noticias financieras premium' })
  search(@Query() query: FinancialNewsQueryDto) {
    return this.service.search(query.q, query.limit);
  }
}
