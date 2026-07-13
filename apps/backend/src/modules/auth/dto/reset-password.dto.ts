import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';

export class ResetPasswordDto {
  @ApiPropertyOptional({ description: 'Code returned by the Supabase recovery link.' })
  @IsOptional()
  @IsString()
  @MinLength(10)
  code?: string;

  @ApiPropertyOptional({ description: 'Token hash returned by the Supabase recovery link.' })
  @IsOptional()
  @IsString()
  @MinLength(10)
  tokenHash?: string;

  @ApiPropertyOptional({ description: 'Access token returned by the Supabase recovery link.' })
  @ValidateIf((dto: ResetPasswordDto) => !dto.code && !dto.tokenHash)
  @IsString()
  @MinLength(10)
  accessToken?: string;

  @ApiPropertyOptional({ description: 'Refresh token returned by the Supabase recovery link.' })
  @ValidateIf((dto: ResetPasswordDto) => !dto.code && !dto.tokenHash)
  @IsString()
  @MinLength(10)
  refreshToken?: string;

  @ApiProperty({ minLength: 8, example: 'N3wStr0ngP@ssword' })
  @IsString()
  @MinLength(8)
  password: string;
}
