import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { supabaseConfigured } from '@/lib/supabase/config';
import { getSupabaseServer, getCurrentProfile } from '@/lib/supabase/server';
import { Page, PageHeader, Section, SourceNote } from '@/components/ui';
import { Leaderboard } from '@/components/Leaderboard';
import AssignmentManager from './AssignmentManager';
import { toggleArchived } from './actions';

export const metadata: Metadata = { title: 'Classroom' };

export default async function TeachClassroomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!supabaseConfigured) redirect('/teach');
  const { id } = await params;

  const profile = await getCurrentProfile();
  if (profile?.role !== 'teacher') redirect(`/classroom/${id}`);

  const supabase = (await getSupabaseServer())!;

  const { data: classroom } = await supabase.from('classrooms').select('*').eq('id', id).maybeSingle();
  if (!classroom) notFound();

  const [{ data: assignments }, { data: leaderboard }] = await Promise.all([
    supabase.from('assignments').select('*').eq('classroom_id', id).order('due_date', { nullsFirst: false }),
    supabase.rpc('classroom_leaderboard', { cid: id }),
  ]);

  return (
    <Page>
      <PageHeader
        eyebrow="Teach"
        title={classroom.name}
        lede={
          classroom.exam_date
            ? `Exam day: ${new Date(classroom.exam_date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`
            : undefined
        }
        actions={
          <span
            className="chip"
            title="Students enter this to join"
            style={{ fontSize: '1.0625rem', letterSpacing: '0.1em' }}
          >
            {classroom.join_code}
          </span>
        }
      />

      <Section title="Assignments" className="mb-12">
        <AssignmentManager classroomId={id} assignments={assignments ?? []} />
      </Section>

      <Section title="Roster" className="mb-12">
        <Leaderboard rows={leaderboard ?? []} />
      </Section>

      <form action={toggleArchived.bind(null, id, !classroom.archived)}>
        <button type="submit" className="btn btn-ghost">
          {classroom.archived ? 'Reopen this classroom' : 'Archive this classroom'}
        </button>
      </form>

      <SourceNote>
        {classroom.archived
          ? 'Archived classrooms stay visible here but no longer accept new join requests.'
          : 'Archiving stops new students from joining with the code above. Existing students, their history, and this page all stay exactly as they are.'}
      </SourceNote>
    </Page>
  );
}
