import { Body, Controller, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RecordConsentDto } from './dto/record-consent.dto';
import { UpdatePrivacySettingsDto } from './dto/update-privacy-settings.dto';
import { PrivacyService } from './privacy.service';

@ApiTags('privacy')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('privacy')
export class PrivacyController {
  constructor(private readonly service: PrivacyService) {}

  @Get('settings')
  getSettings(@Request() req: any) {
    return this.service.getSettings(req.user.id);
  }

  @Patch('settings')
  updateSettings(@Request() req: any, @Body() dto: UpdatePrivacySettingsDto) {
    return this.service.updateSettings(req.user.id, dto);
  }

  @Post('consents')
  recordConsent(@Request() req: any, @Body() dto: RecordConsentDto) {
    return this.service.recordConsent(req.user.id, dto);
  }

  @Get('audit')
  listAudit(@Request() req: any) {
    return this.service.listAudit(req.user.id);
  }

  @Get('notifications')
  listNotifications(@Request() req: any) {
    return this.service.listNotifications(req.user.id);
  }

  @Patch('notifications/:id/read')
  markNotificationRead(@Request() req: any, @Param('id') id: string) {
    return this.service.markNotificationRead(req.user.id, id);
  }
}
