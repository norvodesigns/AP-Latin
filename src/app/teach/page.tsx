import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { supabaseConfigured } from '@/lib/supabase/config';
import { getSupabaseServer, getCurrentProfile, getCurrentUser } from '@/lib/supabase/server';
import { Page, PageHeader, Section, Panel, CalledOut, Steps, SourceNote } from '@/components/ui';
import { signOut } from '@/app/(auth)/actions';
import CreateClassroomForm from './CreateClassroomForm';

export const metadata: Metadata = { title: 'Teach' };

export default async function TeachPage() {
  if (!supabaseConfigured) {
    return (
      <Page>
        <PageHeader eyebrow="Accounts" title="Teach" />
        <Panel>
          <p className="measure" style={{ margin: 0, color: 'var(--fg-muted)', fontSize: '1.0625rem' }}>
            This deployment has no backend configured, so classroom management is unavailable.
          </p>
          <Link href="/" className="btn btn-primary mt-4">
            Back to studying
          </Link>
        </Panel>
      </Page>
    );
  }

  const profile = await getCurrentProfile();
  if (profile?.role !== 'teacher') redirect('/classroom');

  const supabase = (await getSupabaseServer())!;
  // A teacher profile implies a valid session (getCurrentProfile only
  // returns a row for one), so this is never null in practice — checked
  // anyway rather than asserting it, consistent with the other pages.
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { data: classrooms } = await supabase
    .from('classrooms')
    .select('*')
    .eq('teacher_id', user.id)
    .order('created_at', { ascending: false });

  const ids = (classrooms ?? []).map((c) => c.id);
  const counts = new Map<string, number>();
  if (ids.length > 0) {
    const { data: members } = await supabase
      .from('classroom_members')
      .select('classroom_id')
      .in('classroom_id', ids);
    for (const m of members ?? []) counts.set(m.classroom_id, (counts.get(m.classroom_id) ?? 0) + 1);
  }

  const firstRun = !classrooms || classrooms.length === 0;

  return (
    <Page>
      <PageHeader
        eyebrow="Accounts"
        title={firstRun ? `Welcome, ${profile.display_name}` : 'Teach'}
        lede={
          firstRun
            ? 'Name a classroom and you get a code to hand out. That is the whole setup.'
            : 'Your classrooms, their join codes, and how everyone is doing.'
        }
        actions={
          <form action={signOut}>
            <button type="submit" className="btn btn-ghost">
              Sign out
            </button>
          </form>
        }
      />

      {firstRun ? (
        <>
          <CalledOut rubric="Create your first classroom" className="mb-12">
            <CreateClassroomForm />
          </CalledOut>

          <Section title="Then what">
            <Steps
              items={[
                {
                  title: 'Read out the join code',
                  body: 'Six characters, no vowels and no 0/O or 1/I/L — so it survives being read off a whiteboard. Students enter it once.',
                },
                {
                  title: 'Assign target minutes',
                  body: 'Pick a section and a number of minutes, with a due date if you want one. Students see their own progress toward it.',
                },
                {
                  title: 'Watch the roster',
                  body: 'Time studied and accuracy per student, updating as they work. You never have to collect anything.',
                },
              ]}
            />
          </Section>
        </>
      ) : (
        <>
          <Section title="Your classrooms" className="mb-12">
            <ul className="stagger flex flex-col pl-0" style={{ listStyle: 'none' }}>
              {(classrooms ?? []).map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/teach/${c.id}`}
                    className="squish row-hover block w-full border-t px-3 py-5"
                    style={{ borderColor: 'var(--rule)', marginLeft: '-0.75rem' }}
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <span style={{ fontFamily: 'var(--font-latin)', fontSize: '1.25rem', fontWeight: 600 }}>
                        {c.name}
                        {c.archived && <span className="slab-sm ml-2">archived</span>}
                      </span>
                      <span className="chip">{c.join_code}</span>
                    </div>
                    <div className="mt-1.5" style={{ color: 'var(--fg-faint)', fontSize: '0.9375rem' }}>
                      {counts.get(c.id) ?? 0} student{counts.get(c.id) === 1 ? '' : 's'}
                      {c.exam_date &&
                        ` · exam ${new Date(c.exam_date + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="New classroom">
            <Panel>
              <CreateClassroomForm />
            </Panel>
          </Section>
        </>
      )}

      <SourceNote>
        Students never see each other’s raw activity — the leaderboard and roster views return only
        aggregates and display names, enforced in the database rather than the client.
      </SourceNote>
    </Page>
  );
}
