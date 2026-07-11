import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsHexColor, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { CategoryType } from '../../planning/entities/category.entity';
import { TransactionClassification } from '../../movements/entities/transaction.enums';

export class UpdateCategoryDto {
  @ApiPropertyOptional({ example: 'Mascotas' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name?: string;

  @ApiPropertyOptional({ enum: CategoryType })
  @IsOptional()
  @IsEnum(CategoryType)
  type?: CategoryType;

  @ApiPropertyOptional({ enum: TransactionClassification })
  @IsOptional()
  @IsEnum(TransactionClassification)
  classification?: TransactionClassification | null;

  @ApiPropertyOptional({ example: 'Tag' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  icon?: string | null;

  @ApiPropertyOptional({ example: '#6366f1' })
  @IsOptional()
  @IsHexColor()
  color?: string | null;
}
