import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { InvestmentsView } from '@/features/investments/components/InvestmentsView';

export default function InvestmentsPage() {
  return (
    <DashboardLayout>
      <InvestmentsView />
    </DashboardLayout>
  );
}
