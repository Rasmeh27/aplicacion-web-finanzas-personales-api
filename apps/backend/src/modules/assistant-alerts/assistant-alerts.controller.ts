import { Controller, Post, Request, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PremiumPlanGuard } from '../subscriptions/guards/premium-plan.guard';
import { AssistantAlertsService } from './assistant-alerts.service';

@ApiTags('premium-alerts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PremiumPlanGuard)
@Controller('premium-alerts')
export class AssistantAlertsController {
  constructor(private readonly service: AssistantAlertsService) {}

  @Post('run')
  @ApiOperation({ summary: 'Evaluar y enviar alertas premium por correo' })
  run(@Request() req: any) {
    const userId = req.user?.id ?? req.user?.sub;
    const email = req.user?.email;
    if (!userId || !email) {
      throw new UnauthorizedException('Authenticated user with email is required');
    }

    return this.service.runPremiumAlerts(userId, email);
  }
}
