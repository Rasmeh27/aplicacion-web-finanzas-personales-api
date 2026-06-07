import {
  Body,
  Controller,
  Param,
  Post,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateDebtPaymentDto } from './dto/create-debt-payment.dto';
import { CreateDebtDto } from './dto/create-debt.dto';
import { DebtService } from './debt.service';

@ApiTags('debts')
@ApiBearerAuth()
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

    const devUserId = req.headers?.['x-user-id'];
    if (process.env.NODE_ENV !== 'production' && devUserId) {
      return Array.isArray(devUserId) ? devUserId[0] : devUserId;
    }

    throw new UnauthorizedException('Authenticated user is required');
  }
}
