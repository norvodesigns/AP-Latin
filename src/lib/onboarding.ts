/**
 * Whether to show the first run. Kept apart from the Onboarding component so
 * the app shell can decide without loading it (and the whole course with it)
 * for everyone who has already been through it.
 */

import { useStore } from '@/store/useStore';
import { SEEN_KEY as SPLASH_KEY } from '@/components/SplashScreen';

/** Set once the first-run questions are answered or skipped, in this browser. */
export const ONBOARDED_KEY = 'ap-latin-onboarded';

/**
 * Whether this visitor is new enough to be asked where they're starting:
 * nothing studied, no profile, never onboarded, not signed in (a signed-in
 * visitor on a new browser has cloud progress on its way).
 */
export function needsOnboarding(signedIn: boolean): boolean {
  if (signedIn) return false;
  try {
    if (localStorage.getItem(ONBOARDED_KEY)) return false;
    if (localStorage.getItem(SPLASH_KEY)) return false;
  } catch {
    return false;
  }
  const s = useStore.getState();
  const studied =
    Object.keys(s.lessons).length > 0 ||
    Object.keys(s.vocab).length > 0 ||
    s.quizAttempts.length > 0 ||
    Object.keys(s.passages).length > 0;
  return !s.learner && !studied;
}
