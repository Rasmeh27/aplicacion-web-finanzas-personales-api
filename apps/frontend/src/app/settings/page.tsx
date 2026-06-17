import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { SettingsView } from '@/features/dashboard/components/SettingsView';

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <SettingsView />
    </DashboardLayout>
  );
}
