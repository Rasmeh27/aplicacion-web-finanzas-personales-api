export type GoalStatus = 'active' | 'completed' | 'paused' | 'cancelled';

export type FinancialGoal = {
  id: string;
  userId: string;
  name: string;
  targetAmount: number | string;
  currentAmount: number | string;
  currency: string;
  targetDate: string | null;
  status: GoalStatus;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type GoalContribution = {
  id: string;
  goalId: string;
  userId: string;
  amount: number | string;
  currency: string;
  contributionDate: string;
  note: string | null;
  createdAt: string;
};

export type EmergencyFundStatus = 'active' | 'suggested' | 'unavailable';

export type EmergencyFundInfo = {
  status: EmergencyFundStatus;
  goalId: string | null;
  targetAmount: number | null;
  currentAmount: number | null;
  progressPct: number | null;
  suggestedTargetAmount: number | null;
  monthsCovered: number;
};

export type GoalsSummary = {
  totalSaved: number;
  totalTarget: number;
  overallProgressPct: number;
  activeGoalsCount: number;
  completedGoalsCount: number;
  emergencyFund: EmergencyFundInfo;
};

export type CreateGoalPayload = {
  name: string;
  targetAmount: number;
  currentAmount?: number;
  currency: string;
  targetDate?: string;
};

export type UpdateGoalPayload = Partial<CreateGoalPayload> & { status?: GoalStatus };

export type CreateContributionPayload = {
  amount: number;
  currency?: string;
  contributionDate?: string;
  note?: string;
};

export type ConfigureEmergencyFundPayload = {
  targetAmount?: number;
  currentAmount?: number;
  currency?: string;
  targetDate?: string;
};

export const GOAL_STATUS_META: Record<GoalStatus, { label: string; badge: string }> = {
  active: { label: 'Activa', badge: 'bg-indigo-50 text-indigo-700' },
  completed: { label: 'Completada', badge: 'bg-emerald-50 text-emerald-700' },
  paused: { label: 'Pausada', badge: 'bg-amber-50 text-amber-700' },
  cancelled: { label: 'Cancelada', badge: 'bg-slate-100 text-slate-600' },
};
