import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsObject, IsOptional, IsString, MinLength } from 'class-validator';

export class RecordConsentDto {
  @ApiProperty({ example: 'data_processing' })
  @IsString()
  @MinLength(2)
  consentType: string;

  @ApiProperty()
  @IsBoolean()
  accepted: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
