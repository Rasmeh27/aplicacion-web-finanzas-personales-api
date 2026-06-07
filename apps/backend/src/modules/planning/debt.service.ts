import { Injectable } from '@nestjs/common';
import { CreateDebtDto } from './dto/create-debt.dto';
import { Debt } from './entities/debt.entity';
import { RegisterDebtUseCase } from './use-cases/cu-016-register-debt.use-case';

@Injectable()
export class DebtService {
  constructor(private readonly registerDebtUseCase: RegisterDebtUseCase) {}

  create(userId: string, dto: CreateDebtDto): Promise<Debt> {
    return this.registerDebtUseCase.execute(userId, dto);
  }
}
