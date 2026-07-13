import { Module }         from '@nestjs/common';
import { AuthController }  from './auth.controller';
import { AuthService }     from './auth.service';
import { UserModule }      from '../user/user.module';
import { EmailModule } from '../../integrations/email/email.module';

@Module({
  imports: [UserModule, EmailModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
