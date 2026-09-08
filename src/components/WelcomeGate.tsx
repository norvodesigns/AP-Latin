'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const SEEN_KEY = 'ap-latin-welcome-seen';

/**
 * A one-time invitation to sign in or create an account, shown to a signed-
 * out visitor on a deployment that has accounts configured. It never blocks
 * the app — every study section already works without an account — so it
 * is dismissible three different ways (X, backdrop click, Escape) and, once
 * dismissed by any of them, never reappears in this browser again.
 */
export default function WelcomeGate() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(SEEN_KEY)) return;
    } catch {
      // Storage unavailable (private mode, disabled) — fall through and show
      // it; dismissing will just no-op on the write below, not on the read.
    }
    setOpen(true);
  }, []);

  function dismiss() {
    setOpen(false);
    try {
      localStorage.setItem(SEEN_KEY, '1');
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
      className="no-print fixed inset-0 z-50 flex items-center justify-center px-5"
      style={{ background: 'color-mix(in srgb, var(--bg-sunk) 70%, transparent)' }}
      onClick={dismiss}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Sign in or create an account"
        className="animate-in relative w-full max-w-md"
        style={{
          background: 'var(--bg-raised)',
          border: '1px solid var(--rule-strong)',
          borderRadius: 'var(--r-lg)',
          boxShadow: '0 24px 60px -24px var(--shadow), 0 2px 8px -4px var(--shadow2)',
        }}
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

        <div className="px-7 pb-8 pt-9 sm:px-9">
          <div className="rubric mb-3">Welcome</div>
          <h2 style={{ fontSize: '1.5rem', lineHeight: 1.3 }}>
            Studying with a classroom?
          </h2>
          <p
            className="mt-3"
            style={{
              fontFamily: 'var(--font-latin)',
              fontSize: '1.0625rem',
              lineHeight: 1.55,
              color: 'var(--ink2)',
            }}
          >
            An account is only for joining a classroom, seeing what&rsquo;s assigned, and appearing
            on its leaderboard. Everything else — every reading, drill and review — already works
            without one.
          </p>

          <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
            <Link href="/signup" onClick={dismiss} className="btn btn-primary flex-1 justify-center">
              Create account
            </Link>
            <Link href="/login" onClick={dismiss} className="btn flex-1 justify-center">
              Sign in
            </Link>
          </div>

          <button
            type="button"
            onClick={dismiss}
            className="btn btn-ghost mt-4 w-full justify-center"
          >
            Continue without one
          </button>
        </div>
      </div>
    </div>
  );
}
