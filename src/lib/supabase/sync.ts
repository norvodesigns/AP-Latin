import { getSupabaseBrowser } from './client';
import type { GradingSource } from './types';

/**
 * Best-effort sync to the server. Every function here is fire-and-forget by
 * design: a student's local progress (Zustand + localStorage) is always the
 * source of truth for the UI, and a dropped network call must never surface
 * as a broken feature. Failures are logged, not thrown.
 */

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Add `deltaSeconds` of active time on `section` to today's running total. */
export async function bumpStudySeconds(section: string, deltaSeconds: number): Promise<void> {
  if (deltaSeconds <= 0) return;
  const supabase = getSupabaseBrowser();
  if (!supabase) return;

  const { error } = await supabase.rpc('bump_study_seconds', {
    p_section: section,
    p_day: today(),
    p_delta: Math.round(deltaSeconds),
  });
  if (error) console.warn('[sync] bump_study_seconds failed:', error.message);
}

/** Add a graded-work result (correct/total, from `source`) to today's tally. */
export async function bumpActivityStats(
  source: GradingSource,
  correct: number,
  total: number,
): Promise<void> {
  if (total <= 0) return;
  const supabase = getSupabaseBrowser();
  if (!supabase) return;

  const { error } = await supabase.rpc('bump_activity_stats', {
    p_day: today(),
    p_source: source,
    p_correct: correct,
    p_total: total,
  });
  if (error) console.warn('[sync] bump_activity_stats failed:', error.message);
}
