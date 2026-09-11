import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { supabaseConfigured } from '@/lib/supabase/config';
import { getSupabaseServer, getCurrentProfile, getCurrentUser } from '@/lib/supabase/server';
import { Page, PageHeader, Section, Panel, SourceNote } from '@/components/ui';
import { signOut } from '@/app/(auth)/actions';
import CreateClassroomForm from './CreateClassroomForm';

export const metadata: Metadata = { title: 'Classrooms' };

/**
 * Classroom management.
 *
 * This used to be the teacher's home — the only page in the app that knew
 * they taught anybody. That job belongs to the dashboard now (see
 * TeacherDashboard), which is where a teacher lands and where the actual
 * numbers live. What is left here is the administration the dashboard has no
 * business carrying: the full list including archived classrooms, making a
 * new one, and signing out.
 */
export default async function TeachPage() {
  if (!supabaseConfigured) {
    return (
      <Page>
        <PageHeader eyebrow="Accounts" title="Classrooms" />
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

  const live = (classrooms ?? []).filter((c) => !c.archived);
  const archived = (classrooms ?? []).filter((c) => c.archived);

  return (
    <Page>
      <PageHeader
        eyebrow="Accounts"
        title="Classrooms"
        lede={
          <>
            Join codes, archives and new classrooms. How everyone is actually doing is on your{' '}
            <Link href="/" className="link-rule" style={{ color: 'var(--accent)' }}>
              dashboard
            </Link>
            .
          </>
        }
        actions={
          <form action={signOut}>
            <button type="submit" className="btn btn-ghost">
              Sign out
            </button>
          </form>
        }
      />

      {live.length > 0 && (
        <Section title="Your classrooms" className="mb-12">
          <ClassroomList rooms={live} counts={counts} />
        </Section>
      )}

      <Section title={live.length > 0 ? 'New classroom' : 'Create your first classroom'} className="mb-12">
        <Panel>
          <CreateClassroomForm />
        </Panel>
      </Section>

      {archived.length > 0 && (
        <Section title="Archived" className="mb-12">
          <ClassroomList rooms={archived} counts={counts} />
        </Section>
      )}

      <SourceNote>
        Students never see each other’s raw activity — the leaderboard and roster views return only
        aggregates and display names, enforced in the database rather than the client.
      </SourceNote>
    </Page>
  );
}

function ClassroomList({
  rooms,
  counts,
}: {
  rooms: Array<{ id: string; name: string; join_code: string; archived: boolean; exam_date: string | null }>;
  counts: Map<string, number>;
}) {
  return (
    <ul className="stagger flex flex-col pl-0" style={{ listStyle: 'none' }}>
      {rooms.map((c) => {
        const n = counts.get(c.id) ?? 0;
        return (
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
                {n} student{n === 1 ? '' : 's'}
                {c.exam_date &&
                  ` · exam ${new Date(c.exam_date + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
