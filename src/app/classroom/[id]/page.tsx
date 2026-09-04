import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { supabaseConfigured } from '@/lib/supabase/config';
import { getSupabaseServer, getCurrentProfile, getCurrentUser } from '@/lib/supabase/server';
import { Page, PageHeader, Section, Meter, SourceNote } from '@/components/ui';
import { Leaderboard } from '@/components/Leaderboard';
import { sectionLabel } from '@/lib/nav';
import { leaveClassroom } from '../actions';

export const metadata: Metadata = { title: 'Classroom' };

export default async function ClassroomDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!supabaseConfigured) redirect('/classroom');
  const { id } = await params;

  const profile = await getCurrentProfile();
  if (profile?.role === 'teacher') redirect(`/teach/${id}`);

  const supabase = (await getSupabaseServer())!;
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { data: classroom } = await supabase.from('classrooms').select('*').eq('id', id).maybeSingle();
  if (!classroom) notFound();

  const [{ data: assignments }, { data: sectionTime }, { data: leaderboard }] = await Promise.all([
    supabase.from('assignments').select('*').eq('classroom_id', id).order('due_date', { nullsFirst: false }),
    supabase.rpc('classroom_section_time', { cid: id }),
    supabase.rpc('classroom_leaderboard', { cid: id }),
  ]);

  const ownSeconds = new Map<string, number>();
  for (const row of sectionTime ?? []) {
    if (row.student_id === user.id) ownSeconds.set(row.section, row.seconds);
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Classroom"
        title={classroom.name}
        lede={
          classroom.exam_date
            ? `Exam day: ${new Date(classroom.exam_date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`
            : undefined
        }
      />

      <Section title="Assignments" className="mb-12">
        {!assignments || assignments.length === 0 ? (
          <p style={{ color: 'var(--fg-muted)', fontFamily: 'var(--font-latin)', fontSize: '1.0625rem' }}>
            Nothing assigned yet.
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            {assignments.map((a) => {
              const seconds = ownSeconds.get(a.section) ?? 0;
              const targetSeconds = a.target_minutes * 60;
              return (
                <div key={a.id}>
                  <Meter
                    value={Math.min(seconds, targetSeconds)}
                    max={targetSeconds}
                    label={sectionLabel(a.section)}
                    showFraction={false}
                  />
                  <div
                    className="mt-1.5 flex flex-wrap items-baseline justify-between gap-2"
                    style={{ color: 'var(--fg-faint)', fontSize: '0.875rem' }}
                  >
                    <span className="tabular-nums">
                      {Math.round(seconds / 60)} of {a.target_minutes} minutes
                    </span>
                    {a.due_date && (
                      <span>
                        due{' '}
                        {new Date(a.due_date + 'T00:00:00').toLocaleDateString(undefined, {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    )}
                  </div>
                  {a.note && (
                    <p
                      className="mt-1.5"
                      style={{ margin: '0.375rem 0 0', color: 'var(--ink2)', fontFamily: 'var(--font-latin)', fontSize: '0.9375rem' }}
                    >
                      {a.note}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <Section title="Leaderboard" className="mb-12">
        <Leaderboard rows={leaderboard ?? []} currentUserId={user.id} />
      </Section>

      <form
        action={async () => {
          'use server';
          await leaveClassroom(id);
        }}
      >
        <button type="submit" className="btn btn-ghost" style={{ color: 'var(--accent)' }}>
          Leave this classroom
        </button>
      </form>

      <SourceNote>
        Assignment progress is total time ever spent on that section, not just time since it was
        assigned — the same minutes count toward every assignment on that section.
      </SourceNote>
    </Page>
  );
}
