'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { bumpStudySeconds } from '@/lib/supabase/sync';
import { ASSIGNABLE_SECTIONS, type AssignableSection } from '@/lib/supabase/types';

const SECTION_SET: ReadonlySet<string> = new Set(ASSIGNABLE_SECTIONS);

/** The assignable section a pathname belongs to, or null for chrome routes
 *  (dashboard, settings, classroom/teach, auth) that carry no assignment. */
function sectionFor(pathname: string): AssignableSection | null {
  const first = pathname.split('/')[1] ?? '';
  return SECTION_SET.has(first) ? (first as AssignableSection) : null;
}

const FLUSH_MS = 30_000;

/**
 * Tracks active time on assignable sections and syncs it to Supabase.
 *
 * "Active" means the tab is visible and focused — a browser left open on a
 * background tab must not count as studying. Time accrues locally in a ref
 * (no re-renders) and flushes on an interval, on route change, on the page
 * being hidden, and on unmount, so nothing is lost to a closed tab between
 * flushes.
 *
 * A no-op in solo mode: `bumpStudySeconds` itself checks for a configured
 * Supabase client and for `authUserId`, so mounting this unconditionally in
 * AppShell is safe regardless of whether accounts are enabled.
 */
export function useStudyTimeSync() {
  const pathname = usePathname();
  const authUserId = useStore((s) => s.authUserId);

  const section = sectionFor(pathname);
  const sectionRef = useRef(section);
  const pendingRef = useRef(0);
  const lastTickRef = useRef(0);
  const authedRef = useRef(Boolean(authUserId));
  authedRef.current = Boolean(authUserId);

  const flush = (nextSection: AssignableSection | null) => {
    const toSend = sectionRef.current;
    const seconds = pendingRef.current;
    pendingRef.current = 0;
    sectionRef.current = nextSection;
    if (toSend && seconds > 0 && authedRef.current) void bumpStudySeconds(toSend, seconds);
  };

  // Section changed: flush whatever accrued on the old one under its own
  // key before starting to accrue against the new one.
  useEffect(() => {
    if (sectionRef.current !== section) flush(section);
  }, [section]);

  useEffect(() => {
    const isCounting = () =>
      sectionRef.current !== null && document.visibilityState === 'visible' && document.hasFocus();

    lastTickRef.current = Date.now();
    const tick = () => {
      const now = Date.now();
      const elapsed = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;
      // A large gap (laptop asleep, tab frozen) is not active study time.
      if (isCounting() && elapsed > 0 && elapsed < 5) pendingRef.current += elapsed;
    };
    const interval = window.setInterval(tick, 1000);
    const flushTimer = window.setInterval(() => flush(sectionRef.current), FLUSH_MS);

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush(sectionRef.current);
      else lastTickRef.current = Date.now();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onVisibility);

    return () => {
      window.clearInterval(interval);
      window.clearInterval(flushTimer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onVisibility);
      flush(null);
    };
  }, []);
}
