import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { ComingSoon } from '@/features/dashboard/components/ComingSoon';

export default function AiAssistantPage() {
  return (
    <DashboardLayout>
      <ComingSoon titleKey="nav.aiAssistant" />
    </DashboardLayout>
  );
}
