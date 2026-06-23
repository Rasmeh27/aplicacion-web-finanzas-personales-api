import {
  Controller,
  Get,
  Query,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CategoryService } from './category.service';
import { ListCategoriesQueryDto } from './dto/list-categories-query.dto';

@ApiTags('category')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('category')
export class CategoryController {
  constructor(private readonly service: CategoryService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar categorías del usuario',
    description:
      'Devuelve las categorías del usuario (creando las categorías por defecto si aún no existen).',
  })
  findAll(@Request() req: any, @Query() query: ListCategoriesQueryDto) {
    return this.service.findAll(this.getUserId(req), query);
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
