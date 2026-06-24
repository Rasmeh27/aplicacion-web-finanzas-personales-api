import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  token: string;

  @ApiProperty({ minLength: 8, example: 'N3wStr0ngP@ssword' })
  @IsString()
  @MinLength(8)
  password: string;
}
