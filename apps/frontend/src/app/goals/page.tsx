import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { GoalsView } from '@/features/goals/components/GoalsView';

export default function GoalsPage() {
  return (
    <DashboardLayout>
      <GoalsView />
    </DashboardLayout>
  );
}
