import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from '../user/user.module';
import { User } from '../user/entities/user.entity';
import { PlannedFinancialItem } from './entities/planned-financial-item.entity';
import { FinancialProfileController } from './financial-profile.controller';
import { FinancialProfileService } from './financial-profile.service';

@Module({
  imports: [UserModule, TypeOrmModule.forFeature([User, PlannedFinancialItem])],
  controllers: [FinancialProfileController],
  providers: [FinancialProfileService],
  exports: [FinancialProfileService],
})
export class FinancialProfileModule {}
