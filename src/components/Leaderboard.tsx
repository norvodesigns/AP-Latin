import type { LeaderboardRow } from '@/lib/supabase/types';

/** "3h 24m" / "45m" / "0m" from a seconds count. */
function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

/**
 * Ranked by time studied, not accuracy. Accuracy on a handful of drills is
 * noisy — a student who has done three questions and gotten them all right
 * would otherwise outrank someone who has done three hundred — while minutes
 * spent is directly comparable and directly the thing a study app wants to
 * encourage. Accuracy is still shown, just not used to rank.
 *
 * No client interactivity here, so this stays a plain server-renderable
 * component — both the classroom and teach detail pages call it directly
 * from a Server Component.
 */
export function Leaderboard({
  rows,
  currentUserId,
}: {
  rows: LeaderboardRow[];
  currentUserId?: string;
}) {
  const sorted = [...rows].sort((a, b) => b.total_seconds - a.total_seconds);

  if (sorted.length === 0) {
    return (
      <p style={{ color: 'var(--fg-muted)', fontFamily: 'var(--font-latin)', fontSize: '1.0625rem' }}>
        Nobody has logged any study time yet.
      </p>
    );
  }

  return (
    <ol className="flex flex-col pl-0" style={{ listStyle: 'none' }}>
      {sorted.map((r, i) => {
        const isSelf = r.student_id === currentUserId;
        const pct = r.overall_total > 0 ? Math.round((r.overall_correct / r.overall_total) * 100) : null;
        return (
          <li
            key={r.student_id}
            className="row-hover flex items-center gap-4 rounded-[var(--r-sm)] border-t px-2 py-3"
            style={{
              borderColor: isSelf ? 'var(--accent)' : 'var(--hair)',
              borderTopWidth: isSelf ? 2 : 1,
              marginLeft: '-0.5rem',
              background: isSelf ? 'var(--redtint)' : undefined,
            }}
          >
            <span className="numeral tabular-nums shrink-0" style={{ color: 'var(--fg-faint)' }}>
              {i + 1}
            </span>
            <span
              className="min-w-0 flex-1 truncate"
              style={{
                fontFamily: 'var(--font-latin)',
                fontSize: '1.0625rem',
                fontWeight: isSelf ? 600 : 400,
                color: isSelf ? 'var(--accent)' : 'var(--fg)',
              }}
            >
              {r.display_name}
              {isSelf && ' (you)'}
            </span>
            <span className="tabular-nums shrink-0" style={{ fontFamily: 'var(--font-serif)', fontSize: '1rem' }}>
              {formatDuration(r.total_seconds)}
            </span>
            <span className="chip shrink-0" style={{ minWidth: '3.5rem', justifyContent: 'center' }}>
              {pct === null ? '—' : `${pct}%`}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
