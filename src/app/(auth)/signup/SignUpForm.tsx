'use client';

import { useActionState, useState } from 'react';
import { signUp, type AuthResult } from '../actions';
import { Panel } from '@/components/ui';
import type { Role } from '@/lib/supabase/types';

const initial: AuthResult = { error: null };

const ROLES: Array<{ value: Role; label: string; blurb: string }> = [
  {
    value: 'student',
    label: 'Student',
    blurb: 'Study, join a classroom with a code, and appear on its leaderboard.',
  },
  {
    value: 'teacher',
    label: 'Teacher',
    blurb: 'Create a classroom, set time targets per section, and see how your students are doing.',
  },
];

export default function SignUpForm() {
  const [state, action, pending] = useActionState(signUp, initial);
  const [role, setRole] = useState<Role>('student');

  // A successful signup with email confirmation on returns no error and no
  // redirect, so tell the student to go check their inbox.
  const awaitingConfirmation = !pending && state.error === null && state !== initial;

  if (awaitingConfirmation) {
    return (
      <Panel>
        <h2 style={{ fontSize: '1.0625rem' }}>Check your email</h2>
        <p className="measure mt-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
          We sent you a confirmation link. Click it to finish creating your account, then
          come back and sign in.
        </p>
      </Panel>
    );
  }

  return (
    <Panel>
      <form action={action} className="flex flex-col gap-4">
        <fieldset>
          <legend className="mb-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
            What kind of account is this?
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {ROLES.map((r) => (
              <label
                key={r.value}
                className="cursor-pointer border p-3 transition-colors"
                style={{
                  borderColor: role === r.value ? 'var(--accent)' : 'var(--rule)',
                  background: role === r.value ? 'var(--bg-sunk)' : 'transparent',
                }}
              >
                <span className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="role"
                    value={r.value}
                    checked={role === r.value}
                    onChange={() => setRole(r.value)}
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  <span style={{ fontWeight: 600 }}>{r.label}</span>
                </span>
                <span className="mt-1 block text-xs" style={{ color: 'var(--fg-muted)' }}>
                  {r.blurb}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <label>
          <span className="mb-1 block text-sm" style={{ color: 'var(--fg-muted)' }}>
            Name
            <span className="ml-1 text-xs" style={{ color: 'var(--fg-faint)' }}>
              — shown on your classroom leaderboard
            </span>
          </span>
          <input className="input" type="text" name="displayName" required maxLength={60} />
        </label>

        <label>
          <span className="mb-1 block text-sm" style={{ color: 'var(--fg-muted)' }}>
            Email
          </span>
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
          <span className="mb-1 block text-sm" style={{ color: 'var(--fg-muted)' }}>
            Password
            <span className="ml-1 text-xs" style={{ color: 'var(--fg-faint)' }}>
              — at least 8 characters
            </span>
          </span>
          <input
            className="input"
            type="password"
            name="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={200}
          />
        </label>

        {state.error && (
          <p
            role="alert"
            className="border px-3 py-2 text-sm"
            style={{
              background: 'var(--incorrect-bg)',
              borderColor: 'var(--incorrect)',
              color: 'var(--fg-muted)',
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
  );
}
