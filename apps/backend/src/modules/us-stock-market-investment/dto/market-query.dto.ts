import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Length } from 'class-validator';
import { MarketRange } from '../../../integrations/market-data/market-data.types';

export class SymbolSearchQueryDto {
  @ApiProperty({ example: 'apple', description: 'Texto de búsqueda (1-40 caracteres).' })
  @IsString()
  @Length(1, 40)
  query: string;
}

export class SymbolHistoryQueryDto {
  @ApiPropertyOptional({ enum: ['1M', '3M', '6M', '1Y'], default: '3M' })
  @IsOptional()
  @IsIn(['1M', '3M', '6M', '1Y'])
  range?: Extract<MarketRange, '1M' | '3M' | '6M' | '1Y'>;
}

export class PerformanceQueryDto {
  @ApiPropertyOptional({ enum: ['1M', '3M', '6M', '1Y', 'ALL'], default: 'ALL' })
  @IsOptional()
  @IsIn(['1M', '3M', '6M', '1Y', 'ALL'])
  range?: MarketRange;
}
