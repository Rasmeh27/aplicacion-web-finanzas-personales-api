import { ReportsView } from '@/features/reports/components/ReportsView';
import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';

export default function ReportsPage() {
  return (
    <DashboardLayout>
      <ReportsView />
    </DashboardLayout>
  );
}
