import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { ListBudgetsQueryDto } from './dto/list-budgets-query.dto';

@ApiTags('budgets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('budgets')
export class BudgetsController {
  constructor(private readonly service: BudgetsService) {}

  @Post()
  @ApiOperation({
    summary: 'Crear presupuesto mensual por categoría de gasto',
  })
  @ApiResponse({ status: 201, description: 'Presupuesto creado correctamente' })
  create(@Request() req: any, @Body() dto: CreateBudgetDto) {
    return this.service.create(this.getUserId(req), dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar presupuestos con métricas calculadas',
    description: 'spentAmount/remainingAmount/usagePct/status se calculan desde transacciones reales.',
  })
  findAll(@Request() req: any, @Query() query: ListBudgetsQueryDto) {
    return this.service.findAll(this.getUserId(req), query);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Resumen mensual de presupuestos' })
  getSummary(
    @Request() req: any,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.service.getSummary(
      this.getUserId(req),
      month !== undefined ? Number(month) : undefined,
      year !== undefined ? Number(year) : undefined,
    );
  }

  @Get('compliance-history')
  @ApiOperation({
    summary: 'Historial formal de cumplimiento de presupuestos',
    description: 'Devuelve periodos mensuales con presupuesto, gasto real, uso y cumplimiento.',
  })
  getComplianceHistory(@Request() req: any, @Query('months') months?: string) {
    return this.service.getComplianceHistory(
      this.getUserId(req),
      months !== undefined ? Number(months) : undefined,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un presupuesto por ID' })
  findOne(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(this.getUserId(req), id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar límite, umbral de alerta, moneda o estado' })
  update(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBudgetDto,
  ) {
    return this.service.update(this.getUserId(req), id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Desactivar (soft delete) un presupuesto',
    description: 'No elimina transacciones. Marca isActive=false; puede reactivarse vía PATCH.',
  })
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
