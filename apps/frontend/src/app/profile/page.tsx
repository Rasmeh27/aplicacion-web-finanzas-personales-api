import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { ComingSoon } from '@/features/dashboard/components/ComingSoon';

export default function ProfilePage() {
  return (
    <DashboardLayout>
      <ComingSoon titleKey="nav.profile" />
    </DashboardLayout>
  );
}
