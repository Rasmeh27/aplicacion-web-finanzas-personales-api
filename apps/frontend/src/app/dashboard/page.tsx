import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { DashboardOverview } from '@/features/dashboard/components/DashboardOverview';

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <DashboardOverview />
    </DashboardLayout>
  );
}
