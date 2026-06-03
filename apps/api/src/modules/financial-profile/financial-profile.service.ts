import { Injectable } from '@nestjs/common';
import { CreateFinancialProfileDto } from './dto/create-financial-profile.dto';
import { UpdateFinancialProfileDto } from './dto/update-financial-profile.dto';
import { User } from '../user/entities/user.entity';
import { UserService } from '../user/user.service';

@Injectable()
export class FinancialProfileService {
  constructor(private readonly userService: UserService) {}

  findByUserId(userId: string): Promise<User | null> {
    return this.userService.findById(userId);
  }

  async upsertBasicProfile(
    userId: string,
    dto: CreateFinancialProfileDto | UpdateFinancialProfileDto,
  ): Promise<User> {
    return this.userService.upsertProfile(userId, dto);
  }
}
