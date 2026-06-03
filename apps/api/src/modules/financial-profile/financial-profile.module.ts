import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { FinancialProfileController } from './financial-profile.controller';
import { FinancialProfileService }    from './financial-profile.service';

@Module({
  imports:     [UserModule],
  controllers: [FinancialProfileController],
  providers:   [FinancialProfileService],
  exports:     [FinancialProfileService],
})
export class FinancialProfileModule {}
