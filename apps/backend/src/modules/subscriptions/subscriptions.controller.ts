import {
  Controller,
  Get,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly service: SubscriptionsService) {}

  @Get('me')
  @ApiOperation({
    summary: 'Plan actual del usuario autenticado',
    description:
      'Resuelve el plan (basic | premium) en el backend usando user_subscriptions. ' +
      'El frontend solo consulta este estado: nunca puede enviarlo ni modificarlo.',
  })
  @ApiResponse({
    status: 200,
    description: 'Plan, estado de la suscripción vigente y capacidades del plan.',
  })
  getMe(@Request() req: any) {
    return this.service.getMySubscription(this.getUserId(req));
  }

  @Get('plans')
  @ApiOperation({
    summary: 'Catálogo de planes activos',
    description: 'Planes disponibles (basic, premium) con las capacidades de cada uno.',
  })
  @ApiResponse({ status: 200, description: 'Listado de planes activos.' })
  getPlans() {
    return this.service.getActivePlans();
  }

  private getUserId(req: any): string {
    const userId = req.user?.id ?? req.user?.sub;
    if (userId) return userId;

    throw new UnauthorizedException('Authenticated user is required');
  }
}
