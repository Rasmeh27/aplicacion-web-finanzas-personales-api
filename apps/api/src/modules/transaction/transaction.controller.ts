import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TransactionService }    from './transaction.service';
import { CreateTransactionDto }  from './dto/create-transaction.dto';

@ApiTags('transactions')
@ApiBearerAuth()
@Controller('transactions')
export class TransactionController {
  constructor(private readonly service: TransactionService) {}

  @Post()
  create(@Request() req: any, @Body() dto: CreateTransactionDto) {
    return this.service.create(req.user.id, dto);
  }

  @Get()
  findAll(@Request() req: any, @Query() query: any) {
    return this.service.findAll(req.user.id, query);
  }

  @Get('summary')
  summary(@Request() req: any, @Query('year') year: number, @Query('month') month: number) {
    return this.service.getMonthlySummary(req.user.id, year, month);
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.service.findOne(req.user.id, id);
  }

  @Put(':id')
  update(@Request() req: any, @Param('id') id: string, @Body() dto: Partial<CreateTransactionDto>) {
    return this.service.update(req.user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Request() req: any, @Param('id') id: string) {
    return this.service.remove(req.user.id, id);
  }
}
