import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { ComingSoon } from '@/features/dashboard/components/ComingSoon';

export default function TransactionsPage() {
  return (
    <DashboardLayout>
      <ComingSoon titleKey="nav.transactions" />
    </DashboardLayout>
  );
}
