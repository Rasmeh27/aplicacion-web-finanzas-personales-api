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
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TransactionService } from './transaction.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { FilterTransactionDto } from './dto/filter-transaction.dto';

@ApiTags('transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionController {
  constructor(private readonly service: TransactionService) {}

  @Post()
  @ApiOperation({
    summary: 'Crear una nueva transacción',
    description: 'Crea un movimiento personal (ingreso o gasto) para el usuario autenticado',
  })
  @ApiResponse({ status: 201, description: 'Transacción creada exitosamente' })
  create(@Request() req: any, @Body() dto: CreateTransactionDto) {
    return this.service.create(this.getUserId(req), dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar transacciones del usuario',
    description:
      'Lista paginada con filtros por tipo, clasificación, categoría, rango de fechas y búsqueda',
  })
  @ApiResponse({ status: 200, description: 'Lista de transacciones obtenida exitosamente' })
  findAll(@Request() req: any, @Query() filters: FilterTransactionDto) {
    return this.service.findAll(this.getUserId(req), filters);
  }

  @Get('summary')
  @ApiOperation({
    summary: 'Resumen mensual de transacciones',
    description:
      'Totales por clasificación (ingresos, ingresos extra, gastos fijos y variables) y balance del mes',
  })
  summary(
    @Request() req: any,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    return this.service.getMonthlySummary(
      this.getUserId(req),
      year !== undefined ? Number(year) : undefined,
      month !== undefined ? Number(month) : undefined,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una transacción por ID' })
  findOne(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(this.getUserId(req), id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar una transacción' })
  update(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTransactionDto,
  ) {
    return this.service.update(this.getUserId(req), id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una transacción' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(this.getUserId(req), id);
  }

  private getUserId(req: any): string {
    const userId = req.user?.id ?? req.user?.sub;
    if (userId) return userId;

    const devUserId = req.headers?.['x-user-id'];
    if (process.env.NODE_ENV !== 'production' && devUserId) {
      return Array.isArray(devUserId) ? devUserId[0] : devUserId;
    }

    throw new UnauthorizedException('Authenticated user is required');
  }
}
