/**
 * Contrato de respuesta del endpoint interno financial-context.
 *
 * Es un RESUMEN agregado y controlado: NUNCA incluye transacciones crudas,
 * merchants, cuentas bancarias, tarjetas, emails, prompts, JWT ni API keys.
 * `allowed_scopes` tampoco se devuelve (el caller ya los conoce).
 */

export interface FinancialPeriodResponse {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
}

export interface FinancialSummaryResponse {
  income_total: number;
  expense_total: number;
  /** null cuando no hay transacciones clasificadas para calcularlo. */
  fixed_expenses_total: number | null;
  variable_expenses_total: number | null;
  net_cashflow: number;
  /** (income - expense) / income; null si no hay ingresos en el periodo. */
  savings_rate: number | null;
  transactions_count: number;
}

export interface FinancialCategorySummaryResponse {
  category: string;
  amount: number;
  /** Fracción del gasto total del periodo (0..1). */
  percentage: number;
  type: 'expense';
}

export interface FinancialBudgetSummaryResponse {
  name: string;
  budgeted: number;
  spent: number;
  remaining: number;
  status: 'on_track' | 'warning' | 'exceeded';
}

export interface FinancialGoalSummaryResponse {
  name: string;
  target_amount: number;
  current_amount: number;
  /** Entero 0..N (puede superar 100 si la meta se sobrepasó). */
  progress_percentage: number;
}

/**
 * Sección PREMIUM de inversiones. Solo se incluye cuando el plan resuelto por
 * el backend es premium, el request trae los scopes finance_premium y
 * user_private, y la pregunta necesita contexto del portafolio. Contiene solo
 * agregados: sin notas, sin fechas de compra, sin credenciales de broker.
 */
export interface InvestmentContextResponse {
  portfolioAvailable: boolean;
  currency: string;
  marketDataStatus: string;
  asOf: string | null;
  summary: {
    costBasis: number;
    marketValue: number | null;
    unrealizedGainLoss: number | null;
    unrealizedGainLossPct: number | null;
    dayChange: number | null;
  } | null;
  allocation: {
    symbol: string;
    assetType: string;
    marketValue: number | null;
    weight: number;
  }[];
  riskIndicators: {
    topPositionWeight: number | null;
    topThreeWeight: number | null;
    positionCount: number;
  } | null;
  warnings: string[];
}

export interface FinancialContextResponseDto {
  ok: true;
  request_id: string;
  user_id: string;
  period: FinancialPeriodResponse;
  currency: string;
  has_sufficient_data: boolean;
  summary: FinancialSummaryResponse;
  top_categories: FinancialCategorySummaryResponse[];
  budgets: FinancialBudgetSummaryResponse[];
  goals: FinancialGoalSummaryResponse[];
  /** Solo premium + scopes finance_premium/user_private; ausente para basic. */
  investments?: InvestmentContextResponse;
  warnings: string[];
  metadata: {
    generated_at: string;
    source: 'backend_financial_summary';
    raw_transactions_included: false;
    investment_context_included?: boolean;
  };
}
