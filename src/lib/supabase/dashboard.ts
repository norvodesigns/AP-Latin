import { supabaseConfigured } from './config';
import { getSupabaseServer, getCurrentProfile, getCurrentUser } from './server';

export interface UpcomingAssignment {
  id: string;
  classroomId: string;
  classroomName: string;
  section: string;
  dueDate: string | null;
  targetMinutes: number;
  seconds: number;
}

/**
 * Assignments across every classroom a signed-in student belongs to that
 * are not yet met, soonest deadline first (no deadline sorts last). Powers
 * the small classroom widget on the dashboard — the full list, with the
 * rest of a classroom's context, lives on /classroom/[id].
 *
 * Returns null when there is nothing to show (solo mode, signed out, a
 * teacher account, or no classroom membership) so the dashboard can render
 * nothing rather than an empty section.
 *
 * "Not yet met" is total time ever spent on that section, matching the same
 * rule the classroom detail page uses — the same minutes count toward every
 * assignment on that section, not just time since it was assigned.
 */
export async function getUpcomingAssignments(): Promise<UpcomingAssignment[] | null> {
  if (!supabaseConfigured) return null;

  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'student') return null;

  const supabase = await getSupabaseServer();
  const user = await getCurrentUser();
  if (!supabase || !user) return null;

  const { data: memberships } = await supabase
    .from('classroom_members')
    .select('classroom_id')
    .eq('student_id', user.id);
  const classroomIds = (memberships ?? []).map((m) => m.classroom_id);
  if (classroomIds.length === 0) return null;

  const [{ data: classrooms }, { data: assignments }, { data: ownTime }] = await Promise.all([
    supabase.from('classrooms').select('id, name').in('id', classroomIds),
    supabase.from('assignments').select('*').in('classroom_id', classroomIds),
    supabase.from('study_sessions').select('section, seconds').eq('student_id', user.id),
  ]);

  const classroomName = new Map((classrooms ?? []).map((c) => [c.id, c.name]));
  const secondsBySection = new Map<string, number>();
  for (const row of ownTime ?? []) {
    secondsBySection.set(row.section, (secondsBySection.get(row.section) ?? 0) + row.seconds);
  }

  const upcoming = (assignments ?? [])
    .map((a) => ({
      id: a.id,
      classroomId: a.classroom_id,
      classroomName: classroomName.get(a.classroom_id) ?? 'Classroom',
      section: a.section,
      dueDate: a.due_date,
      targetMinutes: a.target_minutes,
      seconds: secondsBySection.get(a.section) ?? 0,
    }))
    .filter((a) => a.seconds < a.targetMinutes * 60)
    .sort((a, b) => {
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    })
    .slice(0, 4);

  return upcoming.length > 0 ? upcoming : null;
}
