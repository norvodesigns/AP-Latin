'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const SEEN_KEY = 'ap-latin-splash-seen';

/**
 * Bump this when there's a "what's new" worth telling a returning visitor
 * about. The seen-key below stores whichever version a browser last
 * dismissed, so raising this number is what makes the splash reappear —
 * once, framed as an update rather than a first welcome — for everyone who
 * already saw an earlier version. A visitor who has genuinely never seen the
 * splash at all is distinguished by having no stored value whatsoever.
 */
const CURRENT_VERSION = '1.2';

const WHATS_NEW: string[] = [
  'Select any word or phrase while reading to highlight it in color or attach a note.',
  'A far more complete and accurate vocabulary — thousands of real dictionary words beyond the required list are now glossed correctly in context.',
  'The Grammar reference is organized by topic instead of one long list, and the glossary popup no longer runs off the bottom of the screen.',
];

/** How long the dissolve-out plays before the dialog actually unmounts —
 *  must match `--dur-2` in globals.css, since the CSS can't be read from
 *  here and a mismatch would either cut the animation short or leave a dead
 *  click-through gap after it finishes. */
const CLOSE_MS = 240;

/**
 * A one-time welcome, shown as a small rectangular dialog over a blurred
 * home screen on a visitor's very first load of the app in this browser,
 * and shown again — briefly, as a "what's new" — the first time they
 * return after `CURRENT_VERSION` changes. Tracked in localStorage rather
 * than an account, since it needs to appear before anyone has signed in
 * (or for a visitor who never does). Sits above `WelcomeGate` and
 * `FirstLoginWelcome`'s own z-index so it is always the first of the three
 * a brand-new, freshly-signed-up visitor sees, not stacked underneath one
 * of them.
 */
export default function SplashScreen() {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [returning, setReturning] = useState(false);
  const closeTimer = useRef<number | null>(null);

  useEffect(() => {
    let seen: string | null = null;
    try {
      seen = localStorage.getItem(SEEN_KEY);
    } catch {
      // Storage unavailable (private mode, disabled) — fall through and show
      // it; dismissing will just no-op on the write below, not on the read.
    }
    if (seen === CURRENT_VERSION) return;
    setReturning(Boolean(seen));
    setOpen(true);
  }, []);

  useEffect(() => () => {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
  }, []);

  /** Plays the dissolve, then unmounts and records the version seen — skipped
   *  in favor of an instant close for a reader who has asked for reduced
   *  motion, so nothing waits out an animation that isn't playing. */
  const dismiss = useCallback(() => {
    const finish = () => {
      setOpen(false);
      setClosing(false);
      try {
        localStorage.setItem(SEEN_KEY, CURRENT_VERSION);
      } catch {
        // Nothing to do — worst case it asks again next visit.
      }
    };
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      finish();
      return;
    }
    setClosing(true);
    closeTimer.current = window.setTimeout(finish, CLOSE_MS);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, dismiss]);

  if (!open) return null;

  return (
    <div
      className="no-print splash-scrim fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto px-5 py-10"
      data-closing={closing}
      onClick={dismiss}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={returning ? `What's new in Lectio ${CURRENT_VERSION}` : 'Welcome to Lectio'}
        className="splash-card relative w-full max-w-lg overflow-y-auto"
        data-closing={closing}
        style={{ maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close"
          className="squish absolute right-4 top-4"
          style={{ color: 'var(--fg-faint)' }}
        >
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M3 3l10 10M13 3L3 13"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <div className="flex flex-col items-center px-7 pb-8 pt-9 text-center sm:px-9">
          <Rosette />

          <span className="wordmark mt-5" style={{ fontSize: '2.5rem' }}>
            Lectio
          </span>

          <p
            className="mt-2"
            style={{
              fontFamily: 'var(--font-latin)',
              fontSize: '1.0625rem',
              fontStyle: 'italic',
              color: 'var(--fg-muted)',
            }}
          >
            lege, mārca, meminī — read, mark, remember
          </p>

          {!returning && (
            <p
              className="measure mt-5"
              style={{
                fontFamily: 'var(--font-latin)',
                fontSize: '1.0625rem',
                lineHeight: 1.6,
                color: 'var(--ink2)',
              }}
            >
              Every required passage with a click-to-gloss vocabulary, highlighting and notes as
              you read, spaced-repetition review, and an AP-style quiz and scansion lab — all
              built around the College Board&rsquo;s own AP Latin exam.
            </p>
          )}

          <div className="mt-6 w-full text-left">
            <div className="rubric mb-3.5 text-center">
              What&rsquo;s new in version {CURRENT_VERSION}
            </div>
            <ul className="flex flex-col gap-2.5 pl-0" style={{ listStyle: 'none' }}>
              {WHATS_NEW.map((item) => (
                <li
                  key={item}
                  className="flex gap-2.5"
                  style={{
                    fontFamily: 'var(--font-latin)',
                    fontSize: '1.0625rem',
                    lineHeight: 1.5,
                    color: 'var(--ink2)',
                  }}
                >
                  <span aria-hidden="true" style={{ color: 'var(--accent)' }}>
                    ·
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            onClick={dismiss}
            className="btn btn-primary mt-7 px-8"
            style={{ fontSize: '0.9375rem' }}
          >
            {returning ? 'Continue' : 'Begin reading'}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * A manuscript rubrication mark — the kind of small illuminated rosette a
 * scribe used to flag a new section — standing in for a logo. Every petal
 * is the same path, placed by rotating around the circle's own center, so
 * the whole ornament is exactly as symmetrical as SVG's own `rotate()` is,
 * not hand-plotted trigonometry.
 */
function Rosette() {
  const petals = 12;
  return (
    <svg width="96" height="96" viewBox="0 0 200 200" aria-hidden="true">
      <circle cx="100" cy="100" r="90" fill="none" stroke="var(--rule-strong)" strokeWidth="1" />
      {Array.from({ length: petals }).map((_, i) => (
        <path
          key={i}
          d="M100,100 C93,76 93,50 100,24 C107,50 107,76 100,100 Z"
          fill="var(--gilt)"
          fillOpacity="0.5"
          stroke="var(--gilt)"
          strokeWidth="0.75"
          transform={`rotate(${(i * 360) / petals} 100 100)`}
        />
      ))}
      <circle cx="100" cy="100" r="11" fill="var(--accent)" />
      <circle cx="100" cy="100" r="11" fill="none" stroke="var(--bg)" strokeWidth="2" />
    </svg>
  );
}
