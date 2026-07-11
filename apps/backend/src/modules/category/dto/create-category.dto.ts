import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsHexColor, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { CategoryType } from '../../planning/entities/category.entity';
import { TransactionClassification } from '../../movements/entities/transaction.enums';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Mascotas', description: 'Nombre visible de la categoría' })
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name: string;

  @ApiProperty({ enum: CategoryType, example: CategoryType.EXPENSE })
  @IsEnum(CategoryType)
  type: CategoryType;

  @ApiPropertyOptional({
    enum: TransactionClassification,
    example: TransactionClassification.VARIABLE_EXPENSE,
  })
  @IsOptional()
  @IsEnum(TransactionClassification)
  classification?: TransactionClassification;

  @ApiPropertyOptional({ example: 'Tag' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  icon?: string;

  @ApiPropertyOptional({ example: '#6366f1' })
  @IsOptional()
  @IsHexColor()
  color?: string;
}
