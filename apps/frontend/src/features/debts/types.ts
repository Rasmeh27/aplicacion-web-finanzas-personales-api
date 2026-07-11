export type DebtStatus = 'active' | 'paid' | 'cancelled';
export type DebtRiskLevel = 'healthy' | 'warning' | 'critical' | 'no_income';

export type Debt = {
  id: string;
  userId: string;
  name: string;
  creditor: string | null;
  initialAmount: number;
  minimumPayment: number;
  interestRatePct: number;
  dueDay: number | null;
  currency: string;
  status: DebtStatus;
  createdAt: string;
  updatedAt: string;
  totalPaid: number;
  balance: number;
  progress: number;
  nextPaymentDate: string | null;
};

export type DebtPayment = {
  id: string;
  userId: string;
  debtId: string;
  amount: number;
  paymentDate: string;
  note: string | null;
  createdAt: string;
};

export type DebtSummary = {
  totalPending: number;
  totalMinimumPayment: number;
  activeDebtsCount: number;
  debtIncomeRatio: number | null;
  riskLevel: DebtRiskLevel;
  debts: Debt[];
};

export type CreateDebtPayload = {
  name: string;
  creditor?: string;
  initialAmount: number;
  minimumPayment?: number;
  interestRatePct?: number;
  dueDay?: number;
  currency?: string;
};

export type CreateDebtPaymentPayload = {
  amount: number;
  paymentDate?: string;
  note?: string;
};
