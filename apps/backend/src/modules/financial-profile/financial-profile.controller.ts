import { Body, Controller, Get, Put, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateFinancialProfileDto } from './dto/update-financial-profile.dto';
import { FinancialProfileService } from './financial-profile.service';

@ApiTags('financial-profile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('financial-profile')
export class FinancialProfileController {
  constructor(private readonly service: FinancialProfileService) {}

  @Get('me')
  findMine(@Request() req: any) {
    return this.service.findByUserId(req.user.id);
  }

  @Put('me')
  configureBasicProfile(@Request() req: any, @Body() dto: UpdateFinancialProfileDto) {
    return this.service.upsertBasicProfile(req.user.id, dto);
  }
}
