export type AuthUser = {
  id: string;
  email: string;
  fullName: string | null;
  primaryCurrency: string;
  country?: string | null;
  timezone?: string | null;
  phoneNumber?: string | null;
  monthlyIncomeEstimate: number;
  monthlySavingTargetPct: number;
  monthlySavingTargetAmount: number | null;
  monthlyFixedExpenseEstimate: number;
  monthlyVariableExpenseEstimate: number;
  onboardingCompletedAt: string | null;
  onboardingVersion: number;
};

export type AuthenticatedResponse = {
  status: 'authenticated';
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

export type EmailConfirmationRequiredResponse = {
  status: 'email_confirmation_required';
  accessToken: null;
  refreshToken: null;
  user: AuthUser;
  message: string;
};

export type AuthResponse = AuthenticatedResponse | EmailConfirmationRequiredResponse;

export type LoginRequest = {
  email: string;
  password: string;
};

export type RegisterRequest = {
  email: string;
  password: string;
  fullName: string;
};
