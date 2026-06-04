import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BudgetService } from './budget.service';
import { BudgetProgressQueryDto } from './dto/budget-progress-query.dto';
import { CreateCategoryBudgetDto } from './dto/create-category-budget.dto';
import { CreateBudgetDto } from './dto/create-budget.dto';

@ApiTags('budgets')
@ApiBearerAuth()
@Controller('budget')
export class BudgetController {
  constructor(private readonly service: BudgetService) {}

  @Post()
  @ApiOperation({
    summary: 'Crear presupuesto mensual',
    description: 'Crea el presupuesto mensual general del usuario para un mes y ano especificos.',
  })
  @ApiResponse({
    status: 201,
    description: 'Presupuesto mensual creado correctamente',
  })
  create(@Request() req: any, @Body() dto: CreateBudgetDto) {
    return this.service.create(this.getUserId(req), dto);
  }

  @Post('category')
  @ApiOperation({
    summary: 'Crear presupuesto por categoria',
    description: 'Crea un presupuesto mensual para una categoria de gasto del usuario.',
  })
  @ApiResponse({
    status: 201,
    description: 'Presupuesto por categoria creado correctamente',
  })
  createByCategory(@Request() req: any, @Body() dto: CreateCategoryBudgetDto) {
    return this.service.createByCategory(this.getUserId(req), dto);
  }

  @Get('progress')
  @ApiOperation({
    summary: 'Ver avance del presupuesto',
    description: 'Consulta cuanto se ha gastado y cuanto queda disponible en los presupuestos del mes.',
  })
  @ApiResponse({
    status: 200,
    description: 'Avance del presupuesto consultado correctamente',
  })
  viewProgress(@Request() req: any, @Query() query: BudgetProgressQueryDto) {
    return this.service.viewProgress(this.getUserId(req), query.year, query.month);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar presupuestos del usuario',
    description: 'Retorna los presupuestos creados por el usuario autenticado.',
  })
  findAll(@Request() req: any) {
    return this.service.findAll(this.getUserId(req));
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
