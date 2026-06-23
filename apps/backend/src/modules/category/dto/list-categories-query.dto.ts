import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CategoryType } from '../../planning/entities/category.entity';
import { TransactionClassification } from '../../movements/entities/transaction.enums';

export class ListCategoriesQueryDto {
  @ApiPropertyOptional({ enum: CategoryType, description: 'Filtrar por tipo (income/expense)' })
  @IsOptional()
  @IsEnum(CategoryType)
  type?: CategoryType;

  @ApiPropertyOptional({
    enum: TransactionClassification,
    description: 'Filtrar por clasificación de finanzas personales',
  })
  @IsOptional()
  @IsEnum(TransactionClassification)
  classification?: TransactionClassification;
}
