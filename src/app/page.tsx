import Dashboard from '@/components/Dashboard';
import TeacherDashboard from '@/components/TeacherDashboard';
import { getTeacherOverview, getUpcomingAssignments } from '@/lib/supabase/dashboard';

/**
 * The home screen, which is a different page depending on who is looking at
 * it. A teacher gets their classrooms, their students and their assignments;
 * everyone else gets the student dashboard.
 *
 * The role comes from `getTeacherOverview`, which reads it from the profile
 * row behind a verified session — never from anything the browser sent. It
 * returns null for a student, for a signed-out visitor and in solo mode, so
 * the fall-through below is the only path those three can take.
 */
export default async function Home() {
  const teacher = await getTeacherOverview();
  if (teacher) return <TeacherDashboard overview={teacher} />;

  const assignments = await getUpcomingAssignments();
  return <Dashboard assignments={assignments ?? undefined} />;
}
