import Link from 'next/link';
import { CalledOut, SourceNote, Steps } from '@/components/ui';
import CreateClassroomForm from '@/app/teach/CreateClassroomForm';
import ClassroomRoster from '@/components/ClassroomRoster';
import { sectionLabel } from '@/lib/nav';
import { formatDuration, formatHours, dueLabel, daysUntil } from '@/lib/format';
import type { TeacherClassroom, TeacherOverview, TeacherStudent } from '@/lib/supabase/dashboard';

/**
 * The teacher's home screen.
 *
 * A teacher used to land on the student dashboard — an exam countdown, their
 * own (empty) mastery meters, their own (nonexistent) vocabulary queue — and
 * had to go find /teach to see anything about the people they teach. This is
 * that page's replacement: the same ruled two-column shape as the student
 * dashboard, answering the three questions a teacher opens the app with.
 *
 *   Who has stopped working?   The left column leads with it, and the rail
 *                              names the students by name.
 *   What is due, and who has   Every assignment carries a meter of how many
 *   met it?                    of the class have met it.
 *   How is each class doing?   A roster per classroom, sorted quietest-first
 *                              so the students who need chasing are the ones
 *                              at the top rather than the ones already fine.
 *
 * Server-rendered throughout: everything on it comes from Supabase, so unlike
 * the student dashboard there is no localStorage to wait for and no `mounted`
 * guard. The one client island is the roster's sort control.
 */
export default function TeacherDashboard({ overview }: { overview: TeacherOverview }) {
  const live = overview.classrooms.filter((c) => !c.archived);

  if (overview.classrooms.length === 0) {
    return <FirstRun name={overview.displayName} />;
  }

  const students = live.flatMap((c) => c.students);
  const activeThisWeek = students.filter((s) => s.weekSeconds > 0).length;
  const activeToday = students.filter((s) => s.todaySeconds > 0).length;
  const weekSeconds = students.reduce((n, s) => n + s.weekSeconds, 0);
  const answered = students.reduce((n, s) => n + s.answered, 0);
  const correct = students.reduce((n, s) => n + s.correct, 0);
  const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : null;

  /* Quiet students, quietest first. A student with no time at all this week
     sorts above one who did ten minutes, and all-time total breaks ties so
     someone who has never started is not hidden behind someone who has
     merely paused. */
  const quiet = live
    .flatMap((c) => c.students.map((s) => ({ ...s, classroom: c })))
    .filter((s) => s.weekSeconds === 0)
    .sort((a, b) => a.totalSeconds - b.totalSeconds || a.name.localeCompare(b.name));

  /* Assignments still open, soonest first — across every classroom, since
     the teacher's week is not organised by classroom. */
  const dueSoon = live
    .flatMap((c) => c.assignments.map((a) => ({ ...a, classroom: c })))
    .filter((a) => a.met < a.outOf)
    .sort((a, b) => {
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    });

  const attention = pickAttention({ quiet, dueSoon, students, activeThisWeek });

  return (
    <div className="mx-auto w-full max-w-[1160px] px-5 sm:px-10">
      <div className="grid lg:grid-cols-[1fr_1px_minmax(340px,400px)]">
        {/* ────────── Left ────────── */}
        <div className="flex flex-col gap-11 py-10 lg:py-12 lg:pr-12">
          {/* The lead number is the one a teacher actually wants first: how
              much of the class is still moving. The student dashboard leads
              with days-to-exam for the same reason — one number that frames
              everything under it. */}
          <section className="marginal">
            <div className="slab mb-4">Discipulī · studying this week</div>
            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
              <div className="numeral" style={{ fontSize: 'clamp(4rem, 2.8rem + 6vw, 6rem)' }}>
                {activeThisWeek}
                <span style={{ color: 'var(--fg-faint)' }}>/{students.length}</span>
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-latin)',
                  fontSize: '1.25rem',
                  lineHeight: 1.35,
                  color: 'var(--fg-muted)',
                }}
              >
                across {live.length} classroom{live.length === 1 ? '' : 's'}
                <br />
                <span style={{ fontSize: '1rem', letterSpacing: '0.04em' }}>
                  {activeToday} today · {formatHours(weekSeconds)} hours logged this week
                  {accuracy !== null && ` · ${accuracy}% accuracy`}
                </span>
              </div>
            </div>
          </section>

          {overview.classrooms.map((c) => (
            <ClassroomBlock key={c.id} classroom={c} />
          ))}

          <section className="border-t pt-9" style={{ borderColor: 'var(--rule)' }}>
            <div className="slab mb-4">New classroom</div>
            <CreateClassroomForm />
          </section>

          <SourceNote>
            Students never see each other&rsquo;s raw activity — the roster and leaderboard views
            return only aggregates and display names, enforced in the database rather than the
            client. What you can see here, you can see because you own the classroom.
          </SourceNote>
        </div>

        {/* The ruling */}
        <div className="hidden lg:block" style={{ background: 'var(--rule)' }} />

        {/* ────────── Right ────────── */}
        <div
          className="flex flex-col gap-8 border-t py-10 lg:border-t-0 lg:py-12 lg:pl-10"
          style={{ borderColor: 'var(--rule)' }}
        >
          <CalledOut rubric="Worth a look">
            <div
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.4375rem',
                lineHeight: 1.35,
                color: 'var(--fg)',
                marginBottom: '0.75rem',
              }}
            >
              {attention.title}
            </div>
            <p
              style={{
                margin: '0 0 1.25rem',
                fontFamily: 'var(--font-latin)',
                fontSize: '1.0625rem',
                lineHeight: 1.55,
                color: 'var(--ink2)',
              }}
            >
              {attention.body}
            </p>
            {attention.href && (
              <Link href={attention.href} className="btn">
                {attention.cta}
              </Link>
            )}
          </CalledOut>

          {dueSoon.length > 0 && (
            <div>
              <div className="slab mb-4">Open assignments</div>
              <ul className="flex flex-col pl-0" style={{ listStyle: 'none' }}>
                {dueSoon.slice(0, 5).map((a, i) => {
                  const late = Boolean(a.dueDate && daysUntil(a.dueDate) < 0);
                  return (
                    <li key={a.id}>
                      <Link
                        href={`/teach/${a.classroom.id}`}
                        className="squish row-hover -mx-3 block px-3 py-3"
                        style={{ borderTop: i === 0 ? undefined : '1px solid var(--hair)' }}
                      >
                        <div className="flex items-baseline justify-between gap-3">
                          <span
                            style={{
                              fontFamily: 'var(--font-latin)',
                              fontSize: '1.0625rem',
                              color: 'var(--fg)',
                            }}
                          >
                            {sectionLabel(a.section)}
                          </span>
                          <span
                            className="tabular-nums shrink-0"
                            style={{
                              fontSize: '0.875rem',
                              color: late ? 'var(--accent)' : 'var(--fg-faint)',
                            }}
                          >
                            {a.dueDate ? dueLabel(a.dueDate) : 'no deadline'}
                          </span>
                        </div>
                        <div
                          className="mt-1.5 flex items-center gap-3"
                          style={{ color: 'var(--fg-faint)', fontSize: '0.8125rem' }}
                        >
                          <span className="shrink-0 tabular-nums">
                            {a.met}/{a.outOf} met
                          </span>
                          <span className="meter meter-thin min-w-0 flex-1">
                            <span
                              style={{
                                width: `${a.outOf > 0 ? Math.round((a.met / a.outOf) * 100) : 0}%`,
                              }}
                            />
                          </span>
                        </div>
                        <div style={{ color: 'var(--fg-faint)', fontSize: '0.8125rem' }}>
                          {a.classroom.name}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {quiet.length > 0 && (
            <div className="border-t pt-7" style={{ borderColor: 'var(--rule)' }}>
              <div className="mb-4 flex items-baseline justify-between gap-3">
                <span className="slab">Nothing this week</span>
                <span
                  className="tabular-nums"
                  style={{ fontFamily: 'var(--font-latin)', fontSize: '1.0625rem' }}
                >
                  {quiet.length}
                </span>
              </div>
              <ul className="flex flex-col pl-0" style={{ listStyle: 'none' }}>
                {quiet.slice(0, 8).map((s, i) => (
                  <li
                    key={`${s.classroom.id}-${s.id}`}
                    className="flex items-baseline justify-between gap-3 py-2"
                    style={{ borderTop: i === 0 ? undefined : '1px solid var(--hair)' }}
                  >
                    <span className="min-w-0">
                      <span
                        className="block truncate"
                        style={{ fontFamily: 'var(--font-latin)', fontSize: '1.0625rem' }}
                      >
                        {s.name}
                      </span>
                      <span style={{ color: 'var(--fg-faint)', fontSize: '0.8125rem' }}>
                        {s.classroom.name}
                      </span>
                    </span>
                    <span
                      className="shrink-0 tabular-nums"
                      style={{
                        fontFamily: 'var(--font-latin)',
                        fontSize: '0.9375rem',
                        color: s.totalSeconds === 0 ? 'var(--accent)' : 'var(--fg-muted)',
                      }}
                    >
                      {s.totalSeconds === 0 ? 'never started' : `${formatDuration(s.totalSeconds)} total`}
                    </span>
                  </li>
                ))}
              </ul>
              {quiet.length > 8 && (
                <p
                  className="mt-3"
                  style={{ margin: '0.75rem 0 0', color: 'var(--fg-faint)', fontSize: '0.875rem' }}
                >
                  and {quiet.length - 8} more.
                </p>
              )}
            </div>
          )}

          <div className="border-t pt-7" style={{ borderColor: 'var(--rule)' }}>
            <div className="slab mb-4">This week</div>
            <div className="flex flex-col gap-2.5">
              <RailRow label="Hours logged" value={formatHours(weekSeconds)} />
              <div className="hair" />
              <RailRow
                label="Studied today"
                value={`${activeToday} of ${students.length}`}
              />
              <div className="hair" />
              <RailRow
                label="Questions graded"
                value={answered > 0 ? answered.toLocaleString() : '—'}
              />
              <div className="hair" />
              <RailRow label="Class accuracy" value={accuracy === null ? '—' : `${accuracy}%`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* One classroom                                                      */
/* ------------------------------------------------------------------ */

function ClassroomBlock({ classroom: c }: { classroom: TeacherClassroom }) {
  const active = c.students.filter((s) => s.weekSeconds > 0).length;
  const answered = c.students.reduce((n, s) => n + s.answered, 0);
  const correct = c.students.reduce((n, s) => n + s.correct, 0);
  const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : null;

  return (
    <section className="border-t pt-9" style={{ borderColor: 'var(--rule)' }}>
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-5 gap-y-2">
        <div className="min-w-0">
          <h2
            style={{
              margin: 0,
              fontFamily: 'var(--font-serif)',
              fontSize: '1.5rem',
              lineHeight: 1.2,
            }}
          >
            <Link href={`/teach/${c.id}`} className="link-rule">
              {c.name}
            </Link>
            {c.archived && <span className="slab-sm ml-2.5">archived</span>}
          </h2>
          <div className="mt-1.5" style={{ color: 'var(--fg-muted)', fontSize: '0.9375rem' }}>
            {c.students.length} student{c.students.length === 1 ? '' : 's'} · {active} active this
            week
            {accuracy !== null && ` · ${accuracy}% accuracy`}
            {c.examDate &&
              ` · exam ${new Date(c.examDate + 'T00:00:00').toLocaleDateString(undefined, {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}`}
          </div>
        </div>
        <span
          className="chip shrink-0"
          title="Students enter this code once to join"
          style={{ letterSpacing: '0.1em' }}
        >
          {c.joinCode}
        </span>
      </div>

      {c.assignments.length > 0 && (
        <div className="mb-6 flex flex-col gap-4">
          {c.assignments.map((a) => {
            const pct = a.outOf > 0 ? Math.round((a.met / a.outOf) * 100) : 0;
            const late = Boolean(a.dueDate && daysUntil(a.dueDate) < 0 && a.met < a.outOf);
            return (
              <div key={a.id}>
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <span
                    style={{ fontFamily: 'var(--font-latin)', fontSize: '1.125rem', color: 'var(--fg)' }}
                  >
                    {sectionLabel(a.section)}
                    <span className="slab-sm ml-2.5">{a.targetMinutes} min</span>
                    {a.dueDate && (
                      <span
                        className="slab-sm ml-2"
                        style={{ color: late ? 'var(--accent)' : undefined }}
                      >
                        {dueLabel(a.dueDate)}
                      </span>
                    )}
                  </span>
                  <span
                    className="tabular-nums"
                    style={{
                      fontFamily: 'var(--font-latin)',
                      fontSize: '1.0625rem',
                      color: late ? 'var(--accent)' : 'var(--fg)',
                    }}
                  >
                    {a.met} / {a.outOf}
                  </span>
                </div>
                <div className={`meter ${late ? 'meter-red' : ''}`}>
                  <span style={{ width: `${pct}%` }} />
                </div>
                {a.note && (
                  <p
                    style={{
                      margin: '0.5rem 0 0',
                      fontFamily: 'var(--font-latin)',
                      fontSize: '1rem',
                      color: 'var(--fg-muted)',
                    }}
                  >
                    {a.note}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ClassroomRoster students={c.students} classroomId={c.id} />
    </section>
  );
}

function RailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span style={{ fontFamily: 'var(--font-latin)', fontSize: '1.0625rem', color: 'var(--ink2)' }}>
        {label}
      </span>
      <span
        className="tabular-nums"
        style={{ fontFamily: 'var(--font-latin)', fontSize: '1.0625rem', color: 'var(--fg)' }}
      >
        {value}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* First run                                                          */
/* ------------------------------------------------------------------ */

/** A teacher who has not made a classroom yet has nothing to show a
 *  dashboard of, so the home screen is the setup instead. */
function FirstRun({ name }: { name: string }) {
  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-10 sm:px-10 sm:py-14">
      <header className="mb-9 border-b pb-7" style={{ borderColor: 'var(--rule)' }}>
        <div className="rubric mb-4">Teacher</div>
        <h1 style={{ fontSize: 'clamp(1.75rem, 1.3rem + 2vw, 2.5rem)', lineHeight: 1.1 }}>
          Salvē, {name}
        </h1>
        <p
          className="measure mt-3"
          style={{
            fontFamily: 'var(--font-latin)',
            fontSize: '1.125rem',
            lineHeight: 1.55,
            color: 'var(--ink2)',
          }}
        >
          Name a classroom and you get a code to hand out. That is the whole setup — everything
          on this page fills in from there.
        </p>
      </header>

      <CalledOut rubric="Create your first classroom" className="mb-12">
        <CreateClassroomForm />
      </CalledOut>

      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="slab">Then what</h2>
      </div>
      <Steps
        items={[
          {
            title: 'Read out the join code',
            body: 'Six characters, no vowels and no 0/O or 1/I/L — so it survives being read off a whiteboard. Students enter it once.',
          },
          {
            title: 'Assign target minutes',
            body: 'Pick a section and a number of minutes, with a due date if you want one. Students see their own progress toward it; you see how many of the class have met it.',
          },
          {
            title: 'Watch this page',
            body: 'Who is still working, who has gone quiet, and how each assignment is going — all of it lands here, so you never have to collect anything.',
          },
        ]}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The one prompt                                                     */
/* ------------------------------------------------------------------ */

type Quiet = TeacherStudent & { classroom: TeacherClassroom };
type Due = { section: string; dueDate: string | null; met: number; outOf: number; classroom: TeacherClassroom };

/**
 * Picks the single most useful thing to say, the way the student dashboard's
 * `nextAction` does. Ordered by urgency: something overdue beats something
 * merely due, which beats a class that has gone quiet, which beats a class
 * that is simply doing fine.
 */
function pickAttention(s: {
  quiet: Quiet[];
  dueSoon: Due[];
  students: TeacherStudent[];
  activeThisWeek: number;
}): { title: string; body: string; cta: string; href: string | null } {
  if (s.students.length === 0) {
    return {
      title: 'Nobody has joined yet',
      body: 'Read the join code out to the class — it is on the classroom below. Students enter it once, and everything on this page starts filling in.',
      cta: 'Manage classrooms',
      href: '/teach',
    };
  }

  const overdue = s.dueSoon.find((a) => a.dueDate && daysUntil(a.dueDate) < 0);
  if (overdue) {
    const short = overdue.outOf - overdue.met;
    return {
      title: `${sectionLabel(overdue.section)} is overdue`,
      body: `${short} of ${overdue.outOf} in ${overdue.classroom.name} have not met it yet. Time spent on that section counts toward it whenever it was spent, so they can still clear it.`,
      cta: 'Open the classroom',
      href: `/teach/${overdue.classroom.id}`,
    };
  }

  const soon = s.dueSoon.find((a) => a.dueDate && daysUntil(a.dueDate) <= 3);
  if (soon) {
    const short = soon.outOf - soon.met;
    return {
      title: `${sectionLabel(soon.section)} ${dueLabel(soon.dueDate!)}`,
      body: `${short} of ${soon.outOf} in ${soon.classroom.name} have yet to meet it.`,
      cta: 'Open the classroom',
      href: `/teach/${soon.classroom.id}`,
    };
  }

  const neverStarted = s.quiet.filter((q) => q.totalSeconds === 0);
  if (neverStarted.length > 0) {
    return {
      title: `${neverStarted.length} ${
        neverStarted.length === 1 ? 'student has' : 'students have'
      } never started`,
      body: `${listNames(neverStarted.map((q) => q.name))} joined but have logged no study time at all. Worth checking they can sign in.`,
      cta: 'See the roster',
      href: `/teach/${neverStarted[0].classroom.id}`,
    };
  }

  if (s.quiet.length > 0) {
    return {
      title: `${s.quiet.length} ${s.quiet.length === 1 ? 'student has' : 'students have'} gone quiet`,
      body: `${listNames(s.quiet.map((q) => q.name))} logged nothing in the last seven days.`,
      cta: 'See the roster',
      href: `/teach/${s.quiet[0].classroom.id}`,
    };
  }

  if (s.dueSoon.length > 0) {
    const a = s.dueSoon[0];
    return {
      title: 'Everyone is working',
      body: `The whole class has been active this week. ${sectionLabel(a.section)} is the assignment furthest from done, at ${a.met} of ${a.outOf}.`,
      cta: 'Open the classroom',
      href: `/teach/${a.classroom.id}`,
    };
  }

  return {
    title: 'Everyone is working',
    body: 'Every student has been active this week and every assignment has been met. Set a new one when you are ready.',
    cta: 'Manage classrooms',
    href: '/teach',
  };
}

/** "Ana, Ben and Chi", or "Ana, Ben and 4 others" past three. */
function listNames(names: string[]): string {
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  if (names.length === 3) return `${names[0]}, ${names[1]} and ${names[2]}`;
  return `${names[0]}, ${names[1]} and ${names.length - 2} others`;
}
