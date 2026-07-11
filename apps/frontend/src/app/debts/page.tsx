import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { DebtsView } from '@/features/debts/components/DebtsView';

export default function DebtsPage() {
  return (
    <DashboardLayout>
      <DebtsView />
    </DashboardLayout>
  );
}
