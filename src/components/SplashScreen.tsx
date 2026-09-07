'use client';

import { useEffect, useState } from 'react';

const SEEN_KEY = 'ap-latin-splash-seen';

/**
 * Bump this when there's a "what's new" worth telling a returning visitor
 * about. The seen-key below stores whichever version a browser last
 * dismissed, so raising this number is what makes the splash reappear —
 * once, framed as an update rather than a first welcome — for everyone who
 * already saw an earlier version. A visitor who has genuinely never seen the
 * splash at all is distinguished by having no stored value whatsoever.
 */
const CURRENT_VERSION = '1.1';

const WHATS_NEW: string[] = [
  'Select any word or phrase while reading to highlight it in color or attach a note.',
  'A far more complete and accurate vocabulary — thousands of real dictionary words beyond the required list are now glossed correctly in context.',
  'The Grammar reference is organized by topic instead of one long list, and the glossary popup no longer runs off the bottom of the screen.',
];

/**
 * A one-time full-screen welcome, shown on a visitor's very first load of
 * the app in this browser, and shown again — briefly, as a "what's new" —
 * the first time they return after `CURRENT_VERSION` changes. Tracked in
 * localStorage rather than an account, since it needs to appear before
 * anyone has signed in (or for a visitor who never does). Sits above
 * `WelcomeGate` and `FirstLoginWelcome`'s own z-index so it is always the
 * first of the three a brand-new, freshly-signed-up visitor sees, not
 * stacked underneath one of them.
 */
export default function SplashScreen() {
  const [open, setOpen] = useState(false);
  const [returning, setReturning] = useState(false);

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

  function dismiss() {
    setOpen(false);
    try {
      localStorage.setItem(SEEN_KEY, CURRENT_VERSION);
    } catch {
      // Nothing to do — worst case it asks again next visit.
    }
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="no-print fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto px-5 py-10"
      style={{ background: 'var(--bg)' }}
      role="dialog"
      aria-modal="true"
      aria-label={returning ? `What's new in Lectio ${CURRENT_VERSION}` : 'Welcome to Lectio'}
    >
      <div className="animate-in flex w-full max-w-md flex-col items-center text-center">
        <Rosette />

        <span
          className="wordmark mt-6"
          style={{ fontSize: 'clamp(2.75rem, 2rem + 3vw, 3.75rem)' }}
        >
          Lectio
        </span>

        <p
          className="mt-3"
          style={{
            fontFamily: 'var(--font-latin)',
            fontSize: '1.1875rem',
            fontStyle: 'italic',
            color: 'var(--fg-muted)',
          }}
        >
          lege, mārca, meminī — read, mark, remember
        </p>

        {!returning && (
          <p
            className="measure mt-6"
            style={{
              fontFamily: 'var(--font-latin)',
              fontSize: '1.0625rem',
              lineHeight: 1.6,
              color: 'var(--ink2)',
            }}
          >
            Every required passage with a click-to-gloss vocabulary, highlighting and notes as
            you read, spaced-repetition review, and an AP-style quiz and scansion lab — all built
            around the College Board&rsquo;s own AP Latin exam.
          </p>
        )}

        <div className="mt-8 w-full text-left">
          <div className="rubric mb-3.5 text-center">What&rsquo;s new in version {CURRENT_VERSION}</div>
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
          className="btn btn-primary mt-8 px-8"
          style={{ fontSize: '0.9375rem' }}
        >
          {returning ? 'Continue' : 'Begin reading'}
        </button>
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
    <svg width="128" height="128" viewBox="0 0 200 200" aria-hidden="true">
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
