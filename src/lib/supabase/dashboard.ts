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

/* ==========================================================================
   The teacher's overview

   A teacher signing in lands on their own dashboard, not a student one — so
   the home screen has to answer the questions a teacher actually opens the
   app with: who has stopped working, what is due, and how is each class
   doing. All of it comes from the two existing SECURITY DEFINER RPCs, which
   already do the membership check and already return aggregates rather than
   raw rows, so nothing here needs new tables or new access.

   `classroom_leaderboard` takes a `since` date, so the activity windows are
   just the same call asked three different questions: all time, this week,
   and today. That is deliberately cheap in schema terms — the alternative
   was a per-day breakdown the teacher view does not otherwise need.
   ========================================================================== */

export interface TeacherStudent {
  id: string;
  name: string;
  /** Study time over all time, this week, and today, in seconds. */
  totalSeconds: number;
  weekSeconds: number;
  todaySeconds: number;
  /** Graded work, auto and self combined — the same figure the roster shows. */
  correct: number;
  answered: number;
  /** Seconds per section, for measuring progress against an assignment. */
  sectionSeconds: Record<string, number>;
}

export interface TeacherAssignment {
  id: string;
  section: string;
  targetMinutes: number;
  dueDate: string | null;
  note: string | null;
  /** Students who have met the target, and the roster size it is out of. */
  met: number;
  outOf: number;
}

export interface TeacherClassroom {
  id: string;
  name: string;
  joinCode: string;
  archived: boolean;
  examDate: string | null;
  students: TeacherStudent[];
  assignments: TeacherAssignment[];
}

export interface TeacherOverview {
  displayName: string;
  classrooms: TeacherClassroom[];
}

/** ISO date `days` before today, in the server's local reckoning. */
function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

/**
 * Everything the teacher dashboard renders, for every classroom the signed-in
 * teacher owns. Returns null when the caller is not a teacher (or accounts
 * are off), so the home page can fall through to the student dashboard.
 *
 * An empty `classrooms` array is a real answer, not an absence: it means a
 * teacher who has not created one yet, and the dashboard has a first-run
 * state for exactly that.
 */
export async function getTeacherOverview(): Promise<TeacherOverview | null> {
  if (!supabaseConfigured) return null;

  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'teacher') return null;

  const supabase = await getSupabaseServer();
  const user = await getCurrentUser();
  if (!supabase || !user) return null;

  const { data: classrooms } = await supabase
    .from('classrooms')
    .select('*')
    .eq('teacher_id', user.id)
    .order('created_at', { ascending: false });

  if (!classrooms || classrooms.length === 0) {
    return { displayName: profile.display_name, classrooms: [] };
  }

  const weekAgo = isoDaysAgo(7);
  const today = new Date().toISOString().slice(0, 10);

  // Per classroom: four reads, all independent, so the whole dashboard costs
  // one round of parallel queries rather than one per classroom in series.
  const perClassroom = await Promise.all(
    classrooms.map(async (c) => {
      const [allTime, week, todayOnly, sectionTime, assignments] = await Promise.all([
        supabase.rpc('classroom_leaderboard', { cid: c.id }),
        supabase.rpc('classroom_leaderboard', { cid: c.id, since: weekAgo }),
        supabase.rpc('classroom_leaderboard', { cid: c.id, since: today }),
        supabase.rpc('classroom_section_time', { cid: c.id }),
        supabase
          .from('assignments')
          .select('*')
          .eq('classroom_id', c.id)
          .order('due_date', { nullsFirst: false }),
      ]);

      const weekById = new Map((week.data ?? []).map((r) => [r.student_id, Number(r.total_seconds)]));
      const todayById = new Map(
        (todayOnly.data ?? []).map((r) => [r.student_id, Number(r.total_seconds)]),
      );

      const sectionById = new Map<string, Record<string, number>>();
      for (const row of sectionTime.data ?? []) {
        const bucket = sectionById.get(row.student_id) ?? {};
        bucket[row.section] = (bucket[row.section] ?? 0) + Number(row.seconds);
        sectionById.set(row.student_id, bucket);
      }

      const students: TeacherStudent[] = (allTime.data ?? [])
        .map((r) => ({
          id: r.student_id,
          name: r.display_name,
          totalSeconds: Number(r.total_seconds),
          weekSeconds: weekById.get(r.student_id) ?? 0,
          todaySeconds: todayById.get(r.student_id) ?? 0,
          correct: Number(r.overall_correct),
          answered: Number(r.overall_total),
          sectionSeconds: sectionById.get(r.student_id) ?? {},
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      return {
        id: c.id,
        name: c.name,
        joinCode: c.join_code,
        archived: c.archived,
        examDate: c.exam_date,
        students,
        assignments: (assignments.data ?? []).map((a) => ({
          id: a.id,
          section: a.section,
          targetMinutes: a.target_minutes,
          dueDate: a.due_date,
          note: a.note,
          // The same rule the student's own view uses: total time ever spent
          // on that section counts, not only time since it was assigned.
          met: students.filter(
            (s) => (s.sectionSeconds[a.section] ?? 0) >= a.target_minutes * 60,
          ).length,
          outOf: students.length,
        })),
      };
    }),
  );

  // Live classrooms first, then archived — an archived one is history, and
  // should not push a class the teacher is actually running down the page.
  const ordered = [
    ...perClassroom.filter((c) => !c.archived),
    ...perClassroom.filter((c) => c.archived),
  ];

  return { displayName: profile.display_name, classrooms: ordered };
}
