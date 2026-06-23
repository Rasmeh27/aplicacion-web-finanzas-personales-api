import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { TransactionsView } from '@/features/transactions/components/TransactionsView';

export default function TransactionsPage() {
  return (
    <DashboardLayout>
      <TransactionsView />
    </DashboardLayout>
  );
}
