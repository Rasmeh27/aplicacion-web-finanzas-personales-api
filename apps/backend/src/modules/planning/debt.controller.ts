import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateDebtPaymentDto } from './dto/create-debt-payment.dto';
import { CreateDebtDto } from './dto/create-debt.dto';
import { UpdateDebtDto } from './dto/update-debt.dto';
import { DebtIncomeRatioQueryDto } from './dto/debt-income-ratio-query.dto';
import { DebtService } from './debt.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('debts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('planning/debts')
export class DebtController {
  constructor(private readonly service: DebtService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar deudas',
    description: 'Lista las deudas del usuario autenticado con balance y progreso calculado.',
  })
  list(@Request() req: any) {
    return this.service.list(this.getUserId(req));
  }

  @Get('summary')
  @ApiOperation({
    summary: 'Resumen de deudas',
    description: 'Resume saldo pendiente, pagos mínimos, ratio deuda/ingreso y deudas activas.',
  })
  summary(
    @Request() req: any,
    @Query() query: DebtIncomeRatioQueryDto,
  ) {
    return this.service.getSummary(this.getUserId(req), query.year, query.month);
  }

  @Post()
  @ApiOperation({
    summary: 'Registrar deuda',
    description: 'Registra una deuda del usuario autenticado.',
  })
  @ApiResponse({
    status: 201,
    description: 'Deuda registrada correctamente',
  })
  create(@Request() req: any, @Body() dto: CreateDebtDto) {
    return this.service.create(this.getUserId(req), dto);
  }

  @Patch(':debtId')
  @ApiOperation({
    summary: 'Actualizar deuda',
    description: 'Actualiza los datos principales de una deuda del usuario autenticado.',
  })
  update(
    @Request() req: any,
    @Param('debtId') debtId: string,
    @Body() dto: UpdateDebtDto,
  ) {
    return this.service.update(this.getUserId(req), debtId, dto);
  }

  @Delete(':debtId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar deuda',
    description: 'Elimina una deuda del usuario autenticado conservando trazabilidad interna.',
  })
  remove(@Request() req: any, @Param('debtId') debtId: string) {
    return this.service.remove(this.getUserId(req), debtId);
  }

  @Get('income-ratio')
  @ApiOperation({
    summary: 'Calcular ratio deuda/ingreso',
    description: 'Calcula el peso de pagos minimos de deudas activas contra los ingresos del mes.',
  })
  @ApiResponse({
    status: 200,
    description: 'Ratio deuda/ingreso calculado correctamente',
  })
  calculateIncomeRatio(
    @Request() req: any,
    @Query() query: DebtIncomeRatioQueryDto,
  ) {
    return this.service.calculateIncomeRatio(
      this.getUserId(req),
      query.year,
      query.month,
    );
  }

  @Post(':debtId/payments')
  @ApiOperation({
    summary: 'Registrar pago de deuda',
    description: 'Registra un pago a una deuda activa del usuario autenticado.',
  })
  @ApiResponse({
    status: 201,
    description: 'Pago de deuda registrado correctamente',
  })
  registerPayment(
    @Request() req: any,
    @Param('debtId') debtId: string,
    @Body() dto: CreateDebtPaymentDto,
  ) {
    return this.service.registerPayment(this.getUserId(req), debtId, dto);
  }

  @Get(':debtId/payments')
  @ApiOperation({
    summary: 'Listar pagos de una deuda',
    description: 'Lista los pagos registrados para una deuda del usuario autenticado.',
  })
  listPayments(
    @Request() req: any,
    @Param('debtId') debtId: string,
  ) {
    return this.service.listPayments(this.getUserId(req), debtId);
  }

  private getUserId(req: any): string {
    const userId = req.user?.id ?? req.user?.sub;
    if (userId) return userId;

    throw new UnauthorizedException('Authenticated user is required');
  }
}
