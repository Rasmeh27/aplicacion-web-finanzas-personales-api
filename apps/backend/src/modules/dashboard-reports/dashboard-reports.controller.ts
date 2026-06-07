import {
  Controller,
  Get,
  Query,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DashboardReportsService } from './dashboard-reports.service';
import { MonthlyReportQueryDto } from './dto/monthly-report-query.dto';

@ApiTags('dashboard-reports')
@ApiBearerAuth()
@Controller('dashboard-reports')
export class DashboardReportsController {
  constructor(private readonly service: DashboardReportsService) {}

  @Get('monthly-income-total')
  @ApiOperation({
    summary: 'Ver total de ingresos del mes',
    description: 'Consulta el total de ingresos registrados por el usuario en un mes.',
  })
  @ApiResponse({
    status: 200,
    description: 'Total de ingresos del mes consultado correctamente',
  })
  viewMonthlyIncomeTotal(@Request() req: any, @Query() query: MonthlyReportQueryDto) {
    return this.service.viewMonthlyIncomeTotal(
      this.getUserId(req),
      query.year,
      query.month,
    );
  }

  @Get('monthly-expense-total')
  @ApiOperation({
    summary: 'Ver total de gastos del mes',
    description: 'Consulta el total de gastos registrados por el usuario en un mes.',
  })
  @ApiResponse({
    status: 200,
    description: 'Total de gastos del mes consultado correctamente',
  })
  viewMonthlyExpenseTotal(@Request() req: any, @Query() query: MonthlyReportQueryDto) {
    return this.service.viewMonthlyExpenseTotal(
      this.getUserId(req),
      query.year,
      query.month,
    );
  }

  @Get('monthly-balance')
  @ApiOperation({
    summary: 'Ver balance mensual',
    description: 'Consulta ingresos, gastos y balance del usuario en un mes.',
  })
  @ApiResponse({
    status: 200,
    description: 'Balance mensual consultado correctamente',
  })
  viewMonthlyBalance(@Request() req: any, @Query() query: MonthlyReportQueryDto) {
    return this.service.viewMonthlyBalance(
      this.getUserId(req),
      query.year,
      query.month,
    );
  }

  @Get('savings-percentage')
  @ApiOperation({
    summary: 'Ver porcentaje de ahorro',
    description: 'Calcula el porcentaje de ahorro mensual del usuario.',
  })
  @ApiResponse({
    status: 200,
    description: 'Porcentaje de ahorro consultado correctamente',
  })
  viewSavingsPercentage(@Request() req: any, @Query() query: MonthlyReportQueryDto) {
    return this.service.viewSavingsPercentage(
      this.getUserId(req),
      query.year,
      query.month,
    );
  }

  @Get('expenses-by-category')
  @ApiOperation({
    summary: 'Ver gastos por categoria',
    description: 'Consulta los gastos del mes agrupados por categoria.',
  })
  @ApiResponse({
    status: 200,
    description: 'Gastos por categoria consultados correctamente',
  })
  viewExpensesByCategory(@Request() req: any, @Query() query: MonthlyReportQueryDto) {
    return this.service.viewExpensesByCategory(
      this.getUserId(req),
      query.year,
      query.month,
    );
  }

  @Get('financial-goals-summary')
  @ApiOperation({
    summary: 'Ver resumen de metas',
    description: 'Consulta el avance general de las metas financieras del usuario.',
  })
  @ApiResponse({
    status: 200,
    description: 'Resumen de metas consultado correctamente',
  })
  viewFinancialGoalsSummary(@Request() req: any) {
    return this.service.viewFinancialGoalsSummary(this.getUserId(req));
  }

  @Get('debts-summary')
  @ApiOperation({
    summary: 'Ver resumen de deudas',
    description: 'Consulta el resumen de deudas y pagos registrados por el usuario.',
  })
  @ApiResponse({
    status: 200,
    description: 'Resumen de deudas consultado correctamente',
  })
  viewDebtsSummary(@Request() req: any) {
    return this.service.viewDebtsSummary(this.getUserId(req));
  }

  @Get('financial-health')
  @ApiOperation({
    summary: 'Calcular salud financiera',
    description: 'Calcula la salud financiera mensual del usuario.',
  })
  @ApiResponse({
    status: 200,
    description: 'Salud financiera calculada correctamente',
  })
  calculateFinancialHealth(
    @Request() req: any,
    @Query() query: MonthlyReportQueryDto,
  ) {
    return this.service.calculateFinancialHealth(
      this.getUserId(req),
      query.year,
      query.month,
    );
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
