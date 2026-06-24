import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateDebtPaymentDto } from './dto/create-debt-payment.dto';
import { CreateDebtDto } from './dto/create-debt.dto';
import { DebtIncomeRatioQueryDto } from './dto/debt-income-ratio-query.dto';
import { DebtService } from './debt.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('debts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('planning/debts')
export class DebtController {
  constructor(private readonly service: DebtService) {}

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

  private getUserId(req: any): string {
    const userId = req.user?.id ?? req.user?.sub;
    if (userId) return userId;

    throw new UnauthorizedException('Authenticated user is required');
  }
}
