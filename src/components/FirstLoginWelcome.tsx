'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Steps } from '@/components/ui';
import type { Role } from '@/lib/supabase/types';

const KEY_PREFIX = 'ap-latin-onboarded-';

const TEACHER_STEPS = [
  {
    title: 'Create a classroom',
    body: 'Give it a name and you get a join code — six characters, easy to read off a whiteboard.',
  },
  {
    title: 'Hand out the code',
    body: 'Students enter it once, from their own account, and they are in. Nothing for you to approve.',
  },
  {
    title: 'Assign and watch',
    body: 'Pick a section and a target — minutes or a due date — then watch the roster fill in as students work. Nothing to collect by hand.',
  },
];

const STUDENT_STEPS = [
  {
    title: 'Reading Room',
    body: 'Every syllabus passage, with a click-to-gloss vocabulary and an AI line-by-line explainer.',
  },
  {
    title: 'Vocabulary, Quiz, Scansion',
    body: 'Spaced repetition over the 990-word core list, AP-style multiple choice, and a scansion lab that grades your own foot-marking.',
  },
  {
    title: 'The Dashboard',
    body: 'The wordmark always brings you back here — a countdown, your weakest skill, and what to study next.',
  },
];

/**
 * Shown once per account, the first time it is seen signed in — a brief,
 * role-specific orientation rather than a generic tour, since a teacher and
 * a student land on completely different work. Tracked in localStorage
 * rather than a database column: this is a one-time UI nicety, not data
 * worth a migration, and it degrades harmlessly (asks again) if storage is
 * unavailable.
 */
export default function FirstLoginWelcome({
  userId,
  displayName,
  role,
}: {
  userId: string;
  displayName: string;
  role: Role;
}) {
  const [open, setOpen] = useState(false);
  const key = KEY_PREFIX + userId;

  useEffect(() => {
    try {
      if (localStorage.getItem(key)) return;
    } catch {
      // Fall through and show it.
    }
    setOpen(true);
  }, [key]);

  function dismiss() {
    setOpen(false);
    try {
      localStorage.setItem(key, '1');
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const teacher = role === 'teacher';

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center px-5 py-10"
      style={{ background: 'color-mix(in srgb, var(--bg-sunk) 70%, transparent)' }}
      onClick={dismiss}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Welcome to Lectio"
        className="animate-in relative w-full max-w-lg overflow-y-auto"
        style={{
          maxHeight: '90vh',
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
          <div className="rubric mb-3">Welcome to Lectio</div>
          <h2 style={{ fontSize: '1.5rem', lineHeight: 1.3 }}>
            {displayName}, {teacher ? "here's how to set up a classroom" : "here's what's here"}
          </h2>

          <div className="mt-6">
            <Steps items={teacher ? TEACHER_STEPS : STUDENT_STEPS} />
          </div>

          <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
            {teacher ? (
              <Link href="/teach" onClick={dismiss} className="btn btn-primary flex-1 justify-center">
                Set up your classroom
              </Link>
            ) : (
              <Link
                href="/read/aen-1-1-33"
                onClick={dismiss}
                className="btn btn-primary flex-1 justify-center"
              >
                Start with the proem
              </Link>
            )}
            <button type="button" onClick={dismiss} className="btn flex-1 justify-center">
              Explore on my own
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
