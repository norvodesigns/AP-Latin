import Dashboard from '@/components/Dashboard';
import { getUpcomingAssignments } from '@/lib/supabase/dashboard';

export default async function Home() {
  const assignments = await getUpcomingAssignments();
  return <Dashboard assignments={assignments ?? undefined} />;
}
