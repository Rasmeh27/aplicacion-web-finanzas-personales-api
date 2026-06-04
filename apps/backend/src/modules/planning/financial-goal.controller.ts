import {
  Body,
  Controller,
  Post,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateFinancialGoalDto } from './dto/create-financial-goal.dto';
import { FinancialGoalService } from './financial-goal.service';

@ApiTags('financial-goals')
@ApiBearerAuth()
@Controller('planning/goals')
export class FinancialGoalController {
  constructor(private readonly service: FinancialGoalService) {}

  @Post()
  @ApiOperation({
    summary: 'Crear meta financiera',
    description: 'Crea una meta financiera del usuario autenticado.',
  })
  @ApiResponse({
    status: 201,
    description: 'Meta financiera creada correctamente',
  })
  create(@Request() req: any, @Body() dto: CreateFinancialGoalDto) {
    return this.service.create(this.getUserId(req), dto);
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
