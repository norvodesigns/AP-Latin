'use client';

import { useEffect, useRef } from 'react';
import {
  useStore,
  getSyncableData,
  blankSyncableData,
  type SyncableData,
} from '@/store/useStore';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { pullProgress, pushProgress } from '@/lib/supabase/progressSync';
import { mergeSyncable } from '@/lib/mergeProgress';

/** How often an open, signed-in tab re-pulls the cloud on its own, to
 *  notice a change pushed from another device without waiting for this
 *  one's own next edit. Realtime (below) usually beats this by a lot;
 *  this is the fallback for a project without it enabled. */
const PERIODIC_PULL_MS = 90_000;

/** How long a burst of local edits is allowed to settle before it's pushed
 *  — long enough that answering a dozen quiz questions in a row costs one
 *  network round trip, not a dozen. */
const PUSH_DEBOUNCE_MS = 2_500;

/** Shallow compare on the known `SyncableData` keys. Each field is only
 *  ever replaced (never mutated) by the reducers that touch it, so
 *  reference equality per field is exactly as precise as a deep compare
 *  here, at a fraction of the cost — and it's what lets the selector
 *  subscription below fire only on an actual change to *this* slice, not
 *  on every store update (in particular, not on the sync hook's own
 *  `lastSyncedUserId`/`lastSyncedAt` bookkeeping writes, which live outside
 *  `SyncableData` entirely). */
function syncableEqual(a: SyncableData, b: SyncableData): boolean {
  return (Object.keys(a) as (keyof SyncableData)[]).every((k) => Object.is(a[k], b[k]));
}

/**
 * Cross-device sync for a signed-in student.
 *
 * Local data (Zustand + localStorage) stays the source of truth for the UI
 * at every instant — nothing here blocks a render or an action waiting on
 * the network. What this hook adds is a `user_progress` row that this
 * device's local data is kept in step with:
 *
 *   - On sign-in (and on switching accounts on a shared device), it
 *     reconciles once — see `reconcile` below for the three cases that
 *     branches on.
 *   - After that, a debounced push follows every local change, and a
 *     periodic pull (backed by Realtime where available, falling back to
 *     polling and a focus listener otherwise) picks up whatever another
 *     device pushed meanwhile.
 *
 * A no-op in solo mode and while signed out: every effect below bails out
 * immediately if there is no configured Supabase project or no
 * `authUserId`, the same guard `bumpStudySeconds`/`bumpActivityStats` use.
 */
export function useCloudSync() {
  const authUserId = useStore((s) => s.authUserId);

  /* Reconcile once per sign-in / account switch. */
  useEffect(() => {
    if (!authUserId || !getSupabaseBrowser()) return;
    let cancelled = false;
    void reconcile(authUserId, () => cancelled);
    return () => {
      cancelled = true;
    };
  }, [authUserId]);

  /* Debounced push on local change. */
  const pushTimer = useRef<number | null>(null);
  useEffect(() => {
    if (!authUserId || !getSupabaseBrowser()) return;

    const flush = () => {
      pushTimer.current = null;
      const s = useStore.getState();
      // Reconciliation hasn't landed yet (or a different account has taken
      // over since this timer was set) — never push data that hasn't been
      // confirmed to belong to this account's cloud row.
      if (s.lastSyncedUserId !== authUserId) return;
      void pushProgress(getSyncableData(s)).then((updatedAt) => {
        if (updatedAt) useStore.getState().setLastSynced(authUserId, updatedAt);
      });
    };

    const unsub = useStore.subscribe(
      getSyncableData,
      () => {
        if (useStore.getState().lastSyncedUserId !== authUserId) return;
        if (pushTimer.current !== null) window.clearTimeout(pushTimer.current);
        pushTimer.current = window.setTimeout(flush, PUSH_DEBOUNCE_MS);
      },
      { equalityFn: syncableEqual },
    );

    return () => {
      unsub();
      if (pushTimer.current !== null) window.clearTimeout(pushTimer.current);
    };
  }, [authUserId]);

  /* Periodic + focus-triggered + realtime pull, to catch another device's
     push without waiting on this one's own next local edit. */
  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!authUserId || !supabase) return;

    const pullAndMerge = () => {
      const before = useStore.getState();
      if (before.lastSyncedUserId !== authUserId) return;
      void pullProgress().then((cloud) => {
        if (!cloud) return;
        const s = useStore.getState();
        if (s.lastSyncedUserId !== authUserId) return;
        // Already have this version (we pushed it, or already merged it on
        // a previous pull) — nothing new to fold in.
        if (s.lastSyncedAt && cloud.updatedAt <= s.lastSyncedAt) return;
        const merged = mergeSyncable(getSyncableData(s), cloud.data, true);
        s.applySyncedData(merged);
        s.setLastSynced(authUserId, cloud.updatedAt);
      });
    };

    const interval = window.setInterval(pullAndMerge, PERIODIC_PULL_MS);
    const onFocus = () => pullAndMerge();
    const onVisible = () => {
      if (document.visibilityState === 'visible') pullAndMerge();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);

    // Best-effort: fires the moment another device's push lands, on a
    // project with Realtime enabled for this table (see the migration).
    // Never required for correctness — the interval and focus listener
    // above cover the same ground on a slower cadence either way.
    const channel = supabase
      .channel(`user_progress:${authUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_progress',
          filter: `user_id=eq.${authUserId}`,
        },
        pullAndMerge,
      )
      .subscribe();

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
      void supabase.removeChannel(channel);
    };
  }, [authUserId]);
}

/**
 * Runs once per sign-in or account switch, branching on how the device's
 * *local* data relates to the account that just signed in — see the doc on
 * `StoreState.lastSyncedUserId` for what each case means. `stale()` lets
 * the effect that started this cancel its after-await work if the
 * component unmounts (or `authUserId` changes again) before it resolves.
 */
async function reconcile(authUserId: string, stale: () => boolean): Promise<void> {
  const before = useStore.getState();
  const cloud = await pullProgress();
  if (stale()) return;

  if (before.lastSyncedUserId !== null && before.lastSyncedUserId !== authUserId) {
    // A different account just took over this device. This device's local
    // data belongs to whoever was signed in before — it must never be
    // merged into (or overwrite) this account's cloud progress.
    if (cloud) {
      useStore.getState().applySyncedData(cloud.data);
      useStore.getState().setLastSynced(authUserId, cloud.updatedAt);
    } else {
      const blank = blankSyncableData();
      useStore.getState().applySyncedData(blank);
      const updatedAt = await pushProgress(blank);
      if (stale()) return;
      useStore.getState().setLastSynced(authUserId, updatedAt);
    }
    return;
  }

  // Continuing the same account, or adopting this device's local data into
  // an account for the first time (`lastSyncedUserId` is still null — solo
  // use before signing up, or the first-ever sign-in for this account on
  // any device).
  if (!cloud) {
    const updatedAt = await pushProgress(getSyncableData(useStore.getState()));
    if (stale()) return;
    useStore.getState().setLastSynced(authUserId, updatedAt);
    return;
  }

  // No prior sync on this device (`lastSyncedAt` null) means there is no
  // baseline to judge "newer" against, so the cloud — the one copy that
  // might already reflect another device's work — wins any singleton
  // settings conflict outright.
  const cloudIsNewer = !before.lastSyncedAt || cloud.updatedAt > before.lastSyncedAt;
  const merged = mergeSyncable(getSyncableData(useStore.getState()), cloud.data, cloudIsNewer);
  useStore.getState().applySyncedData(merged);
  const updatedAt = await pushProgress(merged);
  if (stale()) return;
  useStore.getState().setLastSynced(authUserId, updatedAt ?? cloud.updatedAt);
}
