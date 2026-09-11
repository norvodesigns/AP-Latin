/**
 * Formatting shared between the roster, the teacher dashboard and the
 * student's own ledger. Durations in particular were being spelled three
 * slightly different ways in three files, which is how "3h 24m" here ends up
 * as "3.4 hours" there.
 */

/** "3h 24m" / "45m" / "—" from a seconds count. */
export function formatDuration(seconds: number): string {
  if (seconds <= 0) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h === 0) return `${Math.max(1, m)}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** Whole hours, one decimal below ten — for totals across a whole class. */
export function formatHours(seconds: number): string {
  const hours = seconds / 3600;
  if (hours === 0) return '0';
  if (hours < 10) return hours.toFixed(1).replace(/\.0$/, '');
  return String(Math.round(hours));
}

/** "12 Mar" from an ISO date, read as a plain local date rather than UTC. */
export function formatDay(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  });
}

/**
 * How a due date reads relative to today: "overdue", "due today",
 * "due tomorrow", or "due 14 Mar". Comparison is on ISO date strings, which
 * sort chronologically, so no timezone arithmetic is involved.
 */
export function dueLabel(iso: string, today = new Date().toISOString().slice(0, 10)): string {
  if (iso < today) return 'overdue';
  if (iso === today) return 'due today';
  const t = new Date(today + 'T00:00:00');
  t.setDate(t.getDate() + 1);
  if (iso === t.toISOString().slice(0, 10)) return 'due tomorrow';
  return `due ${formatDay(iso)}`;
}

/** Days from today to an ISO date; negative once it is in the past. */
export function daysUntil(iso: string, from = new Date()): number {
  const target = new Date(iso + 'T00:00:00');
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  return Math.round((target.getTime() - start.getTime()) / 86_400_000);
}
