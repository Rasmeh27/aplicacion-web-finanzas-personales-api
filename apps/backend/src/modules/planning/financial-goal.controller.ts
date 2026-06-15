import {
  Body,
  Controller,
  Post,
  Request,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateFinancialGoalDto } from './dto/create-financial-goal.dto';
import { FinancialGoalService } from './financial-goal.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('financial-goals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
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

    throw new UnauthorizedException('Authenticated user is required');
  }
}
