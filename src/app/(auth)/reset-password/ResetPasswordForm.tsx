'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { setNewPassword, type NewPasswordResult } from '../actions';
import { Panel } from '@/components/ui';

const initial: NewPasswordResult = { done: false, error: null };

const prose = {
  margin: 0,
  fontFamily: 'var(--font-latin)',
  fontSize: '1.0625rem',
  lineHeight: 1.6,
  color: 'var(--ink2)',
} as const;

export default function ResetPasswordForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(setNewPassword, initial);

  if (state.done) {
    return (
      <Panel>
        <p role="status" className="measure" style={prose}>
          Your password is changed, and you&rsquo;re signed in here. On your other devices, sign in with
          the new password.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/" className="btn btn-primary">
            Back to studying
          </Link>
        </div>
        <p className="measure" style={{ ...prose, marginTop: '1.75rem', fontSize: '1rem', color: 'var(--fg-muted)' }}>
          Using the iPhone or iPad app? <a href="lectio://auth-callback?reset=1">Open Lectio</a> and sign
          in there with the new password.
        </p>
      </Panel>
    );
  }

  return (
    <Panel>
      <form action={action} className="flex flex-col gap-6">
        {email && (
          <p style={prose}>
            For <strong>{email}</strong>.
          </p>
        )}
        {/* Lets a password manager file the new password under the right account. */}
        <input type="email" name="username" value={email} autoComplete="username" readOnly hidden />

        <label>
          <span className="slab-sm mb-2 block">New password</span>
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

        <label>
          <span className="slab-sm mb-2 block">The same again</span>
          <input
            className="input"
            type="password"
            name="confirm"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={200}
          />
        </label>

        {state.error && (
          <p
            role="alert"
            className="animate-in rounded-[var(--r-md)] border px-4 py-3"
            style={{ ...prose, borderColor: 'var(--accent)', background: 'var(--redtint)', color: 'var(--accent)' }}
          >
            {state.error}
          </p>
        )}

        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? 'Saving…' : 'Save the new password'}
        </button>
      </form>
    </Panel>
  );
}
