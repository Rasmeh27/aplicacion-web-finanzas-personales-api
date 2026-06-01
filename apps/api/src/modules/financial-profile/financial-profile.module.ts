import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialProfile } from './entities/financial-profile.entity';
import { FinancialProfileController } from './financial-profile.controller';
import { FinancialProfileService } from './financial-profile.service';

@Module({
  imports: [TypeOrmModule.forFeature([FinancialProfile])],
  controllers: [FinancialProfileController],
  providers: [FinancialProfileService],
  exports: [FinancialProfileService],
})
export class FinancialProfileModule {}
