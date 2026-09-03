'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { signUp, type AuthResult } from '../actions';
import { Panel, Steps } from '@/components/ui';
import type { Role } from '@/lib/supabase/types';

const initial: AuthResult = { error: null };

const ROLES: Array<{ value: Role; label: string; blurb: string }> = [
  {
    value: 'student',
    label: 'Student',
    blurb: 'Join your teacher’s classroom with a code, see what’s assigned, and appear on its leaderboard.',
  },
  {
    value: 'teacher',
    label: 'Teacher',
    blurb: 'Create a classroom, hand out its join code, set time targets, and see how everyone is doing.',
  },
];

/** What actually happens after the account exists, in the order it happens.
 *  Different for each role, so it updates as the choice above changes —
 *  the point is that nobody submits this form without knowing what is on
 *  the other side of it. */
const NEXT_STEPS: Record<Role, Array<{ title: string; body: string }>> = {
  student: [
    { title: 'Confirm your email', body: 'We send a link. Click it, then sign in.' },
    { title: 'Enter your join code', body: 'Six characters from your teacher. That puts you in the classroom.' },
    { title: 'Just study', body: 'Time and accuracy sync on their own while you work. Nothing to press.' },
  ],
  teacher: [
    { title: 'Confirm your email', body: 'We send a link. Click it, then sign in.' },
    { title: 'Create a classroom', body: 'Name it, and you get a six-character join code to read out.' },
    { title: 'Assign and watch', body: 'Set target minutes on any section, then see the roster fill in.' },
  ],
};

export default function SignUpForm() {
  const [state, action, pending] = useActionState(signUp, initial);
  const [role, setRole] = useState<Role>('student');

  // A successful signup with email confirmation on returns no error and no
  // redirect, so tell the student to go check their inbox.
  const awaitingConfirmation = !pending && state.error === null && state !== initial;

  if (awaitingConfirmation) {
    return (
      <Panel className="animate-in">
        <div className="rubric mb-3">Almost there</div>
        <h2 style={{ fontSize: '1.5rem', lineHeight: 1.25, margin: 0 }}>Check your email</h2>
        <p
          className="measure"
          style={{
            margin: '0.75rem 0 0',
            fontFamily: 'var(--font-latin)',
            fontSize: '1.0625rem',
            lineHeight: 1.6,
            color: 'var(--ink2)',
          }}
        >
          We sent a confirmation link to finish creating your account. Click it, then come back and
          sign in. If it does not arrive in a minute or two, check the spam folder.
        </p>
        <div className="mt-6 flex flex-wrap gap-2.5">
          <Link href="/login" className="btn btn-primary">
            Go to sign in
          </Link>
          <Link href="/" className="btn btn-ghost">
            Keep studying meanwhile
          </Link>
        </div>
      </Panel>
    );
  }

  return (
    <div className="flex flex-col gap-12">
      <Panel>
        <form action={action} className="flex flex-col gap-7">
          <fieldset className="border-0 p-0" style={{ margin: 0 }}>
            <legend className="slab mb-3.5" style={{ padding: 0 }}>
              What kind of account is this?
            </legend>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {ROLES.map((r) => {
                const on = role === r.value;
                return (
                  <label
                    key={r.value}
                    className="squish cursor-pointer rounded-[var(--r-md)] border p-4"
                    style={{
                      borderColor: on ? 'var(--accent)' : 'var(--rule-strong)',
                      borderWidth: on ? 2 : 1,
                      background: on ? 'var(--redtint)' : 'transparent',
                      transition: 'border-color var(--dur-2) var(--ease-io), background-color var(--dur-2) var(--ease-io)',
                    }}
                  >
                    <span className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="role"
                        value={r.value}
                        checked={on}
                        onChange={() => setRole(r.value)}
                        style={{ accentColor: 'var(--accent)', width: '1rem', height: '1rem' }}
                      />
                      <span
                        style={{
                          fontFamily: 'var(--font-serif)',
                          fontSize: '1.1875rem',
                          fontWeight: 600,
                          color: on ? 'var(--accent)' : 'var(--fg)',
                        }}
                      >
                        {r.label}
                      </span>
                    </span>
                    <span
                      className="mt-2 block"
                      style={{
                        fontFamily: 'var(--font-latin)',
                        fontSize: '1rem',
                        lineHeight: 1.5,
                        color: 'var(--ink2)',
                      }}
                    >
                      {r.blurb}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <label>
            <span className="slab-sm mb-2 block">Name</span>
            <input className="input" type="text" name="displayName" required maxLength={60} />
            <span className="mt-1.5 block" style={{ color: 'var(--fg-faint)', fontSize: '0.9375rem' }}>
              Shown to your classroom on the leaderboard — a first name is plenty.
            </span>
          </label>

          <label>
            <span className="slab-sm mb-2 block">Email</span>
            <input
              className="input"
              type="email"
              name="email"
              autoComplete="email"
              required
              maxLength={254}
            />
          </label>

          <label>
            <span className="slab-sm mb-2 block">Password</span>
            <input
              className="input"
              type="password"
              name="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={200}
            />
            <span className="mt-1.5 block" style={{ color: 'var(--fg-faint)', fontSize: '0.9375rem' }}>
              At least 8 characters.
            </span>
          </label>

          {state.error && (
            <p
              role="alert"
              className="animate-in rounded-[var(--r-md)] border px-4 py-3"
              style={{
                margin: 0,
                borderColor: 'var(--accent)',
                background: 'var(--redtint)',
                fontFamily: 'var(--font-latin)',
                fontSize: '1.0625rem',
                color: 'var(--accent)',
              }}
            >
              {state.error}
            </p>
          )}

          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? 'Creating account…' : 'Create account'}
          </button>
        </form>
      </Panel>

      <section>
        <div className="rubric mb-4">What happens next</div>
        <Steps items={NEXT_STEPS[role]} />
      </section>
    </div>
  );
}
