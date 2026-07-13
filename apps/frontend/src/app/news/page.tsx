import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { NewsView } from '@/features/news/components/NewsView';

export default function NewsPage() {
  return (
    <DashboardLayout>
      <NewsView />
    </DashboardLayout>
  );
}
