import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { ComingSoon } from '@/features/dashboard/components/ComingSoon';

export default function GoalsPage() {
  return (
    <DashboardLayout>
      <ComingSoon titleKey="nav.goals" />
    </DashboardLayout>
  );
}
