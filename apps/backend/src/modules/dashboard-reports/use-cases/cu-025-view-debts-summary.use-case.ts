import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Debt, DebtStatus } from '../../planning/entities/debt.entity';
import { DebtPayment } from '../../planning/entities/debt-payment.entity';

export interface DebtSummaryItem {
  debtId: string;
  name: string;
  creditor: string | null;
  initialAmount: number;
  paidAmount: number;
  remainingAmount: number;
  minimumPayment: number;
  interestRatePct: number;
  dueDay: number | null;
  status: DebtStatus;
}

export interface DebtsSummaryResponse {
  totalDebts: number;
  activeDebts: number;
  paidDebts: number;
  cancelledDebts: number;
  totalInitialAmount: number;
  totalPaidAmount: number;
  totalRemainingAmount: number;
  totalMinimumPayment: number;
  averageInterestRatePct: number;
  currency: string;
  debts: DebtSummaryItem[];
}

@Injectable()
export class ViewDebtsSummaryUseCase {
  constructor(
    @InjectRepository(Debt)
    private readonly debtRepo: Repository<Debt>,
    @InjectRepository(DebtPayment)
    private readonly paymentRepo: Repository<DebtPayment>,
  ) {}

  async execute(userId: string): Promise<DebtsSummaryResponse> {
    const [debts, payments] = await Promise.all([
      this.debtRepo.find({
        where: { userId },
        order: { createdAt: 'DESC' },
      }),
      this.paymentRepo.find({
        where: { userId },
      }),
    ]);

    const paidByDebt = this.groupPaymentsByDebt(payments);
    const debtItems = debts.map((debt) => this.toSummaryItem(debt, paidByDebt));
    const activeDebtItems = debtItems.filter(
      (debt) => debt.status === DebtStatus.ACTIVE,
    );

    return {
      totalDebts: debts.length,
      activeDebts: this.countByStatus(debts, DebtStatus.ACTIVE),
      paidDebts: this.countByStatus(debts, DebtStatus.PAID),
      cancelledDebts: this.countByStatus(debts, DebtStatus.CANCELLED),
      totalInitialAmount: this.sumAmounts(debtItems.map((debt) => debt.initialAmount)),
      totalPaidAmount: this.sumAmounts(debtItems.map((debt) => debt.paidAmount)),
      totalRemainingAmount: this.sumAmounts(
        activeDebtItems.map((debt) => debt.remainingAmount),
      ),
      totalMinimumPayment: this.sumAmounts(
        activeDebtItems.map((debt) => debt.minimumPayment),
      ),
      averageInterestRatePct: this.calculateAverageInterestRate(activeDebtItems),
      currency: 'DOP',
      debts: debtItems,
    };
  }

  private toSummaryItem(
    debt: Debt,
    paidByDebt: Map<string, number>,
  ): DebtSummaryItem {
    const initialAmount = Number(debt.initialAmount);
    const paidAmount = paidByDebt.get(debt.id) ?? 0;
    const remainingAmount =
      debt.status === DebtStatus.ACTIVE
        ? Math.max(initialAmount - paidAmount, 0)
        : 0;

    return {
      debtId: debt.id,
      name: debt.name,
      creditor: debt.creditor ?? null,
      initialAmount: this.roundMoney(initialAmount),
      paidAmount: this.roundMoney(paidAmount),
      remainingAmount: this.roundMoney(remainingAmount),
      minimumPayment: this.roundMoney(Number(debt.minimumPayment)),
      interestRatePct: this.roundMoney(Number(debt.interestRatePct)),
      dueDay: debt.dueDay ?? null,
      status: debt.status,
    };
  }

  private groupPaymentsByDebt(payments: DebtPayment[]): Map<string, number> {
    return payments.reduce((acc, payment) => {
      const currentAmount = acc.get(payment.debtId) ?? 0;
      acc.set(
        payment.debtId,
        this.roundMoney(currentAmount + Number(payment.amount)),
      );
      return acc;
    }, new Map<string, number>());
  }

  private countByStatus(debts: Debt[], status: DebtStatus): number {
    return debts.filter((debt) => debt.status === status).length;
  }

  private calculateAverageInterestRate(debts: DebtSummaryItem[]): number {
    if (debts.length === 0) return 0;

    return this.roundMoney(
      debts.reduce((total, debt) => total + debt.interestRatePct, 0) /
        debts.length,
    );
  }

  private sumAmounts(amounts: number[]): number {
    return this.roundMoney(
      amounts.reduce((total, amount) => total + Number(amount), 0),
    );
  }

  private roundMoney(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
