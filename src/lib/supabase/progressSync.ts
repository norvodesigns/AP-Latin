import { getSupabaseBrowser } from './client';
import type { Json } from './types';
import type { SyncableData } from '@/store/useStore';

/**
 * The mechanical half of cloud sync: reading and writing the `user_progress`
 * row. No merge logic lives here — see `mergeProgress.ts` for that — this
 * file only ever moves a `SyncableData` blob to and from Supabase.
 *
 * Every function is best-effort, matching the rest of `lib/supabase/sync.ts`:
 * a dropped network call or an unconfigured backend returns null/false
 * rather than throwing, because a student's local progress (still the
 * source of truth for the UI at all times) must keep working regardless of
 * whether the cloud copy succeeds. Callers decide what "no result" means —
 * `useCloudSync` treats it as "nothing to merge this time", not an error to
 * surface to the reader.
 */

export interface CloudProgress {
  data: SyncableData;
  /** ISO timestamp — compared against the store's `lastSyncedAt` to tell a
   *  genuinely new cloud write (from another device) from the same row a
   *  session already merged. */
  updatedAt: string;
}

/** Fetches the signed-in user's cloud progress row. Null means either there
 *  is not one yet (first sign-in for this account, on any device) or the
 *  request failed — RLS scopes this to the caller's own row, so there is
 *  nothing to disambiguate a "not found" from a "not allowed" here. */
export async function pullProgress(): Promise<CloudProgress | null> {
  const supabase = getSupabaseBrowser();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('user_progress')
    .select('data, updated_at')
    .maybeSingle();

  if (error) {
    console.warn('[cloud-sync] pull failed:', error.message);
    return null;
  }
  if (!data) return null;
  return { data: data.data as unknown as SyncableData, updatedAt: data.updated_at };
}

/** Upserts `data` as the signed-in user's cloud progress and returns the
 *  row's new `updated_at`, or null on failure. `user_id` is never sent —
 *  the column defaults to `auth.uid()` and RLS enforces it, so there is
 *  nothing for the client to get wrong here. */
export async function pushProgress(data: SyncableData): Promise<string | null> {
  const supabase = getSupabaseBrowser();
  if (!supabase) return null;

  const updated_at = new Date().toISOString();
  const { error } = await supabase
    .from('user_progress')
    .upsert({ data: data as unknown as Json, updated_at }, { onConflict: 'user_id' });

  if (error) {
    console.warn('[cloud-sync] push failed:', error.message);
    return null;
  }
  return updated_at;
}
