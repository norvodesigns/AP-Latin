'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { formatDuration } from '@/lib/format';
import type { TeacherStudent } from '@/lib/supabase/dashboard';

type Sort = 'quiet' | 'time' | 'accuracy' | 'name';

const SORTS: Array<{ id: Sort; label: string }> = [
  { id: 'quiet', label: 'Quietest' },
  { id: 'time', label: 'Most time' },
  { id: 'accuracy', label: 'Weakest' },
  { id: 'name', label: 'Name' },
];

/** How many rows show before the list collapses behind a "show all". */
const PREVIEW = 6;

/**
 * The roster on the teacher's dashboard.
 *
 * Sorted quietest-first by default, which is the opposite of the classroom
 * leaderboard on purpose: a leaderboard exists to reward the student at the
 * top, but a teacher scanning their homepage needs the student who has
 * stopped, and that student is the one a leaderboard buries at the bottom.
 *
 * The other sorts are there because "weakest" and "quietest" genuinely
 * disagree — a student can be putting the hours in and still getting half of
 * it wrong — and a teacher needs to be able to ask either question.
 *
 * Accuracy on a handful of answers is noise, so a student below
 * `MIN_FOR_ACCURACY` graded answers is shown a dash rather than a percentage
 * and never sorts to the top of "weakest" on the strength of getting two out
 * of three wrong.
 */
const MIN_FOR_ACCURACY = 10;

export default function ClassroomRoster({
  students,
  classroomId,
}: {
  students: TeacherStudent[];
  classroomId: string;
}) {
  const [sort, setSort] = useState<Sort>('quiet');
  const [expanded, setExpanded] = useState(false);

  const sorted = useMemo(() => {
    const rows = [...students];
    switch (sort) {
      case 'time':
        return rows.sort((a, b) => b.totalSeconds - a.totalSeconds);
      case 'accuracy':
        return rows.sort((a, b) => {
          const ra = rate(a);
          const rb = rate(b);
          // Students without enough graded work to judge sort last rather
          // than first — an unknown is not the same as a bad score.
          if (ra === null && rb === null) return a.name.localeCompare(b.name);
          if (ra === null) return 1;
          if (rb === null) return -1;
          return ra - rb;
        });
      case 'name':
        return rows.sort((a, b) => a.name.localeCompare(b.name));
      case 'quiet':
      default:
        return rows.sort(
          (a, b) => a.weekSeconds - b.weekSeconds || a.totalSeconds - b.totalSeconds,
        );
    }
  }, [students, sort]);

  if (students.length === 0) {
    return (
      <p
        style={{
          margin: 0,
          fontFamily: 'var(--font-latin)',
          fontSize: '1.0625rem',
          color: 'var(--fg-muted)',
        }}
      >
        Nobody has joined yet. Read out the join code above.
      </p>
    );
  }

  const shown = expanded ? sorted : sorted.slice(0, PREVIEW);
  const hidden = sorted.length - shown.length;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <span className="slab">Roster</span>
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Sort roster">
          {SORTS.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={sort === s.id}
              onClick={() => setSort(s.id)}
              className={sort === s.id ? 'chip chip-on squish' : 'chip squish'}
              style={{ fontSize: '0.875rem', padding: '0.25rem 0.6875rem' }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* A ruled table, not a card grid — the same treatment paradigms get in
          the Grammar section. Scrolls on its own if the viewport is narrower
          than the four columns need; the page itself never scrolls sideways. */}
      <div className="overflow-x-auto">
        <table className="w-full" style={{ borderCollapse: 'collapse', minWidth: '25rem' }}>
          <caption className="sr-only">
            Students in this classroom, with study time and accuracy
          </caption>
          <thead>
            <tr>
              <Th>Student</Th>
              <Th align="right">This week</Th>
              <Th align="right">Total</Th>
              <Th align="right">Accuracy</Th>
            </tr>
          </thead>
          <tbody>
            {shown.map((s) => {
              const pct = rate(s);
              const idle = s.weekSeconds === 0;
              return (
                <tr key={s.id}>
                  <Td>
                    <span
                      className="block truncate"
                      style={{
                        fontFamily: 'var(--font-latin)',
                        fontSize: '1.0625rem',
                        color: idle ? 'var(--fg-muted)' : 'var(--fg)',
                        maxWidth: '16rem',
                      }}
                    >
                      {s.name}
                    </span>
                    {s.totalSeconds === 0 && (
                      <span className="slab-sm" style={{ color: 'var(--accent)' }}>
                        never started
                      </span>
                    )}
                  </Td>
                  <Td align="right">
                    <span
                      className="tabular-nums"
                      style={{ color: idle ? 'var(--accent)' : 'var(--fg)' }}
                    >
                      {idle ? '—' : formatDuration(s.weekSeconds)}
                    </span>
                  </Td>
                  <Td align="right">
                    <span className="tabular-nums" style={{ color: 'var(--fg-muted)' }}>
                      {formatDuration(s.totalSeconds)}
                    </span>
                  </Td>
                  <Td align="right">
                    <span
                      className="tabular-nums"
                      style={{
                        color:
                          pct !== null && pct < 60 ? 'var(--accent)' : 'var(--fg-muted)',
                      }}
                      title={
                        pct === null
                          ? `Only ${s.answered} graded answer${s.answered === 1 ? '' : 's'} so far — too few to read anything into`
                          : `${s.correct} of ${s.answered} graded answers`
                      }
                    >
                      {pct === null ? '—' : `${pct}%`}
                    </span>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        {hidden > 0 && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setExpanded(true)}>
            Show all {sorted.length}
          </button>
        )}
        {expanded && sorted.length > PREVIEW && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setExpanded(false)}>
            Show fewer
          </button>
        )}
        <Link href={`/teach/${classroomId}`} className="btn btn-ghost btn-sm">
          Assignments &amp; settings
        </Link>
      </div>
    </div>
  );
}

/** Accuracy as a percentage, or null when there is too little to judge. */
function rate(s: TeacherStudent): number | null {
  if (s.answered < MIN_FOR_ACCURACY) return null;
  return Math.round((s.correct / s.answered) * 100);
}

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th
      scope="col"
      className="slab-sm"
      style={{
        textAlign: align,
        padding: '0 0 0.5rem',
        borderBottom: '1px solid var(--rule)',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </th>
  );
}

function Td({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <td
      style={{
        textAlign: align,
        padding: '0.5625rem 0',
        borderBottom: '1px solid var(--hair)',
        fontFamily: 'var(--font-latin)',
        fontSize: '1rem',
        whiteSpace: align === 'right' ? 'nowrap' : undefined,
      }}
    >
      {children}
    </td>
  );
}
