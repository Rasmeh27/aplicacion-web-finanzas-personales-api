import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { BudgetsView } from '@/features/budgets/components/BudgetsView';

export default function BudgetsPage() {
  return (
    <DashboardLayout>
      <BudgetsView />
    </DashboardLayout>
  );
}
