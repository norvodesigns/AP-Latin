'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';

const AUTO_DISMISS_MS = 6000;
const CLOSE_MS = 240;
const RAYS = 10;

/**
 * The moment today's study-plan minutes are actually reached — tracked in
 * useStudyTimeSync regardless of whether accounts are on — this drops down
 * to say so: a small firework (the same rubrication-and-gilt palette as the
 * rest of the app, not a generic rainbow burst) next to a one-line note,
 * gone on its own after a few seconds or on a click.
 *
 * `open` (does this exist in the DOM at all) is tracked separately from the
 * store's `goalJustReached` (did a goal just get crossed) so the close
 * animation has time to finish before the store's dismiss actually unmounts
 * it — the same reasoning SplashScreen's own `closing` state follows.
 */
export default function DailyGoalToast() {
  const goalJustReached = useStore((s) => s.goalJustReached);
  const dismissGoalCelebration = useStore((s) => s.dismissGoalCelebration);
  const minutesPerDay = useStore((s) => s.studyPlan.minutesPerDay);
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (!goalJustReached) return;
    setOpen(true);
    setClosing(false);
  }, [goalJustReached]);

  useEffect(() => {
    if (!open || closing) return;
    const t = window.setTimeout(close, AUTO_DISMISS_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, closing]);

  function close() {
    setClosing(true);
    window.setTimeout(() => {
      setOpen(false);
      dismissGoalCelebration();
    }, CLOSE_MS);
  }

  if (!open) return null;

  return (
    <div
      className="goal-toast panel"
      data-closing={closing}
      role="status"
      aria-live="polite"
    >
      <Firework />
      <div className="min-w-0 flex-1">
        <div className="rubric" style={{ color: 'var(--accent)' }}>
          Daily goal reached
        </div>
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--ink2)' }}>
          {minutesPerDay} minutes of study, done for today.
        </p>
      </div>
      <button type="button" onClick={close} aria-label="Dismiss" className="goal-toast-close">
        <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

/** A small radial burst — a center spark plus a ring of flying ones,
 *  alternating gilt and rubrication red so it reads as this app's own
 *  firework rather than a stock celebration icon. */
function Firework() {
  return (
    <div className="goal-firework" aria-hidden="true">
      <span className="goal-firework-center" />
      {Array.from({ length: RAYS }).map((_, i) => (
        <span
          key={i}
          className="goal-spark"
          style={{
            ['--goal-spark-angle' as string]: `${(360 / RAYS) * i}deg`,
            background: i % 2 === 0 ? 'var(--gilt)' : 'var(--accent)',
            animationDelay: `${70 + i * 14}ms`,
          }}
        />
      ))}
    </div>
  );
}
