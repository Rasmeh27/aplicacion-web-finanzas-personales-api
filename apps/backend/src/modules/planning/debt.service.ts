import { Injectable } from '@nestjs/common';
import { CreateDebtPaymentDto } from './dto/create-debt-payment.dto';
import { CreateDebtDto } from './dto/create-debt.dto';
import { Debt } from './entities/debt.entity';
import { DebtPayment } from './entities/debt-payment.entity';
import { RegisterDebtPaymentUseCase } from './use-cases/cu-017-register-debt-payment.use-case';
import { RegisterDebtUseCase } from './use-cases/cu-016-register-debt.use-case';

@Injectable()
export class DebtService {
  constructor(
    private readonly registerDebtUseCase: RegisterDebtUseCase,
    private readonly registerDebtPaymentUseCase: RegisterDebtPaymentUseCase,
  ) {}

  create(userId: string, dto: CreateDebtDto): Promise<Debt> {
    return this.registerDebtUseCase.execute(userId, dto);
  }

  registerPayment(
    userId: string,
    debtId: string,
    dto: CreateDebtPaymentDto,
  ): Promise<DebtPayment> {
    return this.registerDebtPaymentUseCase.execute(userId, debtId, dto);
  }
}
