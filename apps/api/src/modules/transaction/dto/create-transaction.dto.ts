import { IsEnum, IsNumber, IsString, IsDateString, IsOptional, IsUUID, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TransactionType, RecurrenceFrequency } from '../entities/transaction.entity';

export class CreateTransactionDto {
  @ApiProperty({ enum: TransactionType })
  @IsEnum(TransactionType)
  type: TransactionType;

  @ApiProperty({ example: 1500.00 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ example: 'Salario mensual' })
  @IsString()
  description: string;

  @ApiProperty({ example: '2026-05-01' })
  @IsDateString()
  date: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiProperty({ enum: RecurrenceFrequency, required: false })
  @IsOptional()
  @IsEnum(RecurrenceFrequency)
  recurrence?: RecurrenceFrequency;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
