import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { supabaseConfigured } from '@/lib/supabase/config';
import { getSupabaseServer, getCurrentProfile, getCurrentUser } from '@/lib/supabase/server';
import { Page, PageHeader, Section, Panel, CalledOut, Steps, SourceNote } from '@/components/ui';
import type { Classroom } from '@/lib/supabase/types';
import { signOut } from '@/app/(auth)/actions';
import JoinClassroomForm from './JoinClassroomForm';

export const metadata: Metadata = { title: 'Classroom' };

export default async function ClassroomPage() {
  if (!supabaseConfigured) {
    return (
      <Page>
        <PageHeader eyebrow="Accounts" title="Classroom" />
        <Panel>
          <p className="measure" style={{ margin: 0, color: 'var(--fg-muted)', fontSize: '1.0625rem' }}>
            This deployment has no backend configured, so Lectio is running in solo mode: there are
            no accounts, classrooms or teacher oversight. Every study section still works exactly as
            it always has.
          </p>
          <Link href="/" className="btn btn-primary mt-4">
            Back to studying
          </Link>
        </Panel>
      </Page>
    );
  }

  const profile = await getCurrentProfile();
  if (profile?.role === 'teacher') redirect('/teach');

  const supabase = (await getSupabaseServer())!;
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { data: memberships } = await supabase
    .from('classroom_members')
    .select('classroom_id')
    .eq('student_id', user.id);

  const ids = (memberships ?? []).map((m) => m.classroom_id);
  let classrooms: Classroom[] = [];
  if (ids.length > 0) {
    const { data } = await supabase.from('classrooms').select('*').in('id', ids).order('created_at');
    classrooms = data ?? [];
  }

  const firstRun = classrooms.length === 0;

  return (
    <Page>
      <PageHeader
        eyebrow="Accounts"
        title={firstRun ? `Welcome, ${profile?.display_name ?? 'there'}` : 'Classroom'}
        lede={
          firstRun
            ? 'One step left: the join code your teacher gave you. Until then, nothing about how you study changes.'
            : 'Your assignments, and where you stand in each class.'
        }
        actions={
          <form action={signOut}>
            <button type="submit" className="btn btn-ghost">
              Sign out
            </button>
          </form>
        }
      />

      {/* First run leads with the one action that matters. Once a student is
          actually in a class, the list is what they came for and joining
          another drops to the bottom. */}
      {firstRun ? (
        <>
          <CalledOut rubric="Join your classroom" className="mb-12">
            <JoinClassroomForm />
          </CalledOut>

          <Section title="Then what">
            <Steps
              items={[
                {
                  title: 'Your assignments show up here',
                  body: 'Whatever your teacher sets — so many minutes in the Reading Room, or on scansion — with how far along you are.',
                },
                {
                  title: 'Studying counts on its own',
                  body: 'Time and accuracy sync while you work, on any section. There is nothing to start or stop.',
                },
                {
                  title: 'You appear on the leaderboard',
                  body: 'Ranked by time studied. Classmates only ever see a name and a total — never your answers or your notes.',
                },
              ]}
            />
          </Section>
        </>
      ) : (
        <>
          <Section title="Your classrooms" className="mb-12">
            <ul className="stagger flex flex-col pl-0" style={{ listStyle: 'none' }}>
              {classrooms.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/classroom/${c.id}`}
                    className="squish row-hover block w-full border-t px-3 py-5"
                    style={{ borderColor: 'var(--rule)', marginLeft: '-0.75rem' }}
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <span style={{ fontFamily: 'var(--font-latin)', fontSize: '1.25rem', fontWeight: 600 }}>
                        {c.name}
                      </span>
                      {c.exam_date && (
                        <span className="slab-sm">
                          exam{' '}
                          {new Date(c.exam_date + 'T00:00:00').toLocaleDateString(undefined, {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Join another">
            <Panel>
              <JoinClassroomForm />
            </Panel>
          </Section>
        </>
      )}

      <SourceNote>
        Time studied and accuracy sync automatically while you work, whenever you are signed in —
        nothing extra to do. Your local progress stays exactly as it was; this only adds a copy your
        teacher can see.
      </SourceNote>
    </Page>
  );
}
