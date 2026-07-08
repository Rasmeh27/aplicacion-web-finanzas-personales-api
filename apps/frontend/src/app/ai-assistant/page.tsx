import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { WallterSettingsView } from '@/features/assistant/components/WallterSettingsView';

export default function AiAssistantPage() {
  return (
    <DashboardLayout>
      <WallterSettingsView />
    </DashboardLayout>
  );
}
