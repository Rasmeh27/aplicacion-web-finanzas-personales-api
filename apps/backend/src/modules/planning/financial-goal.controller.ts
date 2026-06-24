import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Request,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateFinancialGoalDto } from './dto/create-financial-goal.dto';
import { UpdateFinancialGoalDto } from './dto/update-financial-goal.dto';
import { CreateGoalContributionDto } from './dto/create-goal-contribution.dto';
import { ConfigureEmergencyFundDto } from './dto/configure-emergency-fund.dto';
import { FinancialGoalService } from './financial-goal.service';

@ApiTags('financial-goals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('planning/goals')
export class FinancialGoalController {
  constructor(private readonly service: FinancialGoalService) {}

  @Post()
  @ApiOperation({ summary: 'Crear meta financiera' })
  @ApiResponse({ status: 201, description: 'Meta financiera creada correctamente' })
  create(@Request() req: any, @Body() dto: CreateFinancialGoalDto) {
    return this.service.create(this.getUserId(req), dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar metas del usuario (Fondo de emergencia primero)' })
  list(@Request() req: any) {
    return this.service.list(this.getUserId(req));
  }

  @Get('summary')
  @ApiOperation({ summary: 'Resumen de metas y estado del fondo de emergencia' })
  summary(@Request() req: any) {
    return this.service.summary(this.getUserId(req));
  }

  @Post('emergency-fund')
  @ApiOperation({
    summary: 'Configurar/crear el Fondo de emergencia',
    description:
      'Crea el fondo de emergencia (predeterminado). Si no se envía targetAmount sugiere 3 meses de gastos del onboarding.',
  })
  configureEmergencyFund(@Request() req: any, @Body() dto: ConfigureEmergencyFundDto) {
    return this.service.configureEmergencyFund(this.getUserId(req), dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una meta por ID' })
  findOne(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(this.getUserId(req), id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una meta (incluye pausar/completar/cancelar vía status)' })
  update(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFinancialGoalDto,
  ) {
    return this.service.update(this.getUserId(req), id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una meta' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(this.getUserId(req), id);
  }

  @Get(':id/contributions')
  @ApiOperation({ summary: 'Listar aportes de una meta' })
  listContributions(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.listContributions(this.getUserId(req), id);
  }

  @Post(':id/contributions')
  @ApiOperation({ summary: 'Agregar fondos a una meta' })
  @ApiResponse({ status: 201, description: 'Aporte registrado y progreso actualizado' })
  addContribution(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateGoalContributionDto,
  ) {
    return this.service.addContribution(this.getUserId(req), id, dto);
  }

  private getUserId(req: any): string {
    const userId = req.user?.id ?? req.user?.sub;
    if (userId) return userId;

    throw new UnauthorizedException('Authenticated user is required');
  }
}

