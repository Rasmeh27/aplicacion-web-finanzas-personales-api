import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ResolvedUserPlan, UserPlanService } from '../user-plan.service';

/**
 * Permite el acceso únicamente a usuarios con plan Premium VIGENTE.
 *
 * Debe usarse SIEMPRE detrás de JwtAuthGuard:
 *   @UseGuards(JwtAuthGuard, PremiumPlanGuard)
 *
 * El plan se resuelve en el backend vía UserPlanService (fuente de verdad);
 * nada de lo que envíe el frontend puede alterarlo. Un plan Basic recibe
 * HTTP 403 con el código estable `premium_required`.
 */
@Injectable()
export class PremiumPlanGuard implements CanActivate {
  constructor(private readonly userPlanService: UserPlanService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId: string | undefined = request.user?.id ?? request.user?.sub;

    if (!userId) {
      throw new UnauthorizedException('Authenticated user is required');
    }

    const resolved: ResolvedUserPlan = await this.userPlanService.resolveUserPlan(userId);

    if (resolved.plan !== 'premium') {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'premium_required',
        message: 'Esta funcionalidad requiere el Plan Premium.',
      });
    }

    // Disponible para los handlers que necesiten el plan ya resuelto.
    request.userPlan = resolved;
    return true;
  }
}
