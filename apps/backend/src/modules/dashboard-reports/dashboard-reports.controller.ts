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
