import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { ProfileView } from '@/features/profile/components/ProfileView';

export default function ProfilePage() {
  return (
    <DashboardLayout>
      <ProfileView />
    </DashboardLayout>
  );
}
