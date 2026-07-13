import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdatePrivacySettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  weeklySummary?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  budgetAlerts?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  twoFactor?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  marketingConsent?: boolean;
}
