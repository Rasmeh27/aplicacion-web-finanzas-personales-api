import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CategoryModule } from '../category/category.module';
import { FinancialProfileModule } from '../financial-profile/financial-profile.module';
import { UserModule } from '../user/user.module';

// Modulo 1: Cuenta y perfil
@Module({
  imports: [AuthModule, UserModule, FinancialProfileModule, CategoryModule],
  exports: [AuthModule, UserModule, FinancialProfileModule, CategoryModule],
})
export class AccountProfileModule {}
