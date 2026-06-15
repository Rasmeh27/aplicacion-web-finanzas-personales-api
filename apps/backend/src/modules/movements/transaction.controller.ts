import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TransactionService } from './transaction.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { FilterTransactionDto } from './dto/filter-transaction.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionController {
  constructor(private readonly service: TransactionService) {}

  @Post()
  @ApiOperation({
    summary: 'Crear una nueva transacción',
    description: 'Crea un nuevo movimiento (ingreso o gasto) para el usuario autenticado',
  })
  @ApiResponse({
    status: 201,
    description: 'Transacción creada exitosamente',
  })
  create(@Request() req: any, @Body() dto: CreateTransactionDto) {
    return this.service.create(this.getUserId(req), dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar todas las transacciones del usuario',
    description: 'Retorna una lista paginada de transacciones con opción de filtrar por tipo, categoría y rango de fechas',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de transacciones obtenida exitosamente',
    schema: {
      example: {
        items: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            type: 'expense',
            amount: 50,
            description: 'Compra en mercado',
            date: '2026-05-15',
            categoryId: '550e8400-e29b-41d4-a716-446655440000',
            category: {
              id: '550e8400-e29b-41d4-a716-446655440000',
              name: 'Alimentación',
            },
            recurrence: 'none',
            notes: null,
            createdAt: '2026-05-15T10:30:00Z',
            updatedAt: '2026-05-15T10:30:00Z',
          },
        ],
        total: 42,
      },
    },
  })
  findAll(@Request() req: any, @Query() filters: FilterTransactionDto) {
    return this.service.findAll(this.getUserId(req), filters);
  }

  @Get('summary')
  @ApiOperation({
    summary: 'Obtener resumen mensual de transacciones',
    description: 'Retorna totales de ingresos, gastos y tasa de ahorro para un mes específico',
  })
  summary(@Request() req: any, @Query('year') year: number, @Query('month') month: number) {
    return this.service.getMonthlySummary(this.getUserId(req), year, month);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener una transacción por ID',
    description: 'Retorna los detalles de una transacción específica',
  })
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.service.findOne(this.getUserId(req), id);
  }

  @Put(':id')
  update(@Request() req: any, @Param('id') id: string, @Body() dto: Partial<CreateTransactionDto>) {
    return this.service.update(this.getUserId(req), id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Request() req: any, @Param('id') id: string) {
    return this.service.remove(this.getUserId(req), id);
  }

  private getUserId(req: any): string {
    const userId = req.user?.id ?? req.user?.sub;
    if (userId) return userId;

    throw new UnauthorizedException('Authenticated user is required');
  }
}
