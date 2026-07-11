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
  Query,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { ListCategoriesQueryDto } from './dto/list-categories-query.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

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

  @Post()
  @ApiOperation({ summary: 'Crear categoría personalizada del usuario' })
  create(@Request() req: any, @Body() dto: CreateCategoryDto) {
    return this.service.create(this.getUserId(req), dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar categoría personalizada del usuario' })
  update(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.service.update(this.getUserId(req), id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar categoría personalizada del usuario' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(this.getUserId(req), id);
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
