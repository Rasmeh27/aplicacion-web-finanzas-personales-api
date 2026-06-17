import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { ComingSoon } from '@/features/dashboard/components/ComingSoon';

export default function BudgetsPage() {
  return (
    <DashboardLayout>
      <ComingSoon titleKey="nav.budgets" />
    </DashboardLayout>
  );
}
