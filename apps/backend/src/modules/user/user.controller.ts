import { Body, Controller, Delete, Get, Patch, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateUserPreferencesDto } from './dto/update-user.dto';
import { UserService } from './user.service';

@ApiTags('user')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('user')
export class UserController {
  constructor(private readonly service: UserService) {}

  @Get('me')
  findAll(@Request() req: any) {
    return this.service.findAll(req.user.id);
  }

  @Get('me/export')
  exportMyData(@Request() req: any) {
    return this.service.exportAccountData(req.user.id);
  }

  @Patch('me/preferences')
  updatePreferences(@Request() req: any, @Body() dto: UpdateUserPreferencesDto) {
    return this.service.updatePreferences(req.user.id, dto);
  }

  @Delete('me')
  removeMe(@Request() req: any) {
    return this.service.removeAccount(req.user.id);
  }
}
