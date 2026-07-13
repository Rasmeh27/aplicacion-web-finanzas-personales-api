import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class MfaSessionDto {
  @ApiProperty()
  @IsString()
  @MinLength(10)
  accessToken: string;

  @ApiProperty()
  @IsString()
  @MinLength(10)
  refreshToken: string;
}

export class MfaEnrollDto extends MfaSessionDto {
  @ApiPropertyOptional({ example: 'MONI' })
  @IsOptional()
  @IsString()
  friendlyName?: string;
}

export class MfaFactorDto extends MfaSessionDto {
  @ApiProperty()
  @IsString()
  factorId: string;
}

export class MfaVerifyDto extends MfaFactorDto {
  @ApiProperty()
  @IsString()
  challengeId: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(6)
  code: string;
}
