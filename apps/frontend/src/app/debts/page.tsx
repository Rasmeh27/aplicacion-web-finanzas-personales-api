import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { ComingSoon } from '@/features/dashboard/components/ComingSoon';

export default function DebtsPage() {
  return (
    <DashboardLayout>
      <ComingSoon titleKey="nav.debts" />
    </DashboardLayout>
  );
}
