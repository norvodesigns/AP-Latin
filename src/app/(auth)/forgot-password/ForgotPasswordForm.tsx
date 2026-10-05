'use client';

import { useActionState } from 'react';
import { requestPasswordReset, type ResetRequestResult } from '../actions';
import { Panel } from '@/components/ui';

const initial: ResetRequestResult = { sent: false, error: null };

const prose = {
  margin: 0,
  fontFamily: 'var(--font-latin)',
  fontSize: '1.0625rem',
  lineHeight: 1.6,
  color: 'var(--ink2)',
} as const;

export default function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, initial);

  if (state.sent) {
    return (
      <Panel>
        <p role="status" className="measure" style={prose}>
          If that address has a Lectio account, a reset link is on its way. Open it on the device you
          want to use, within the hour, and choose a new password. Nothing arrived? Check your spam
          folder, or ask again in a few minutes.
        </p>
      </Panel>
    );
  }

  return (
    <Panel>
      <form action={action} className="flex flex-col gap-6">
        <label>
          <span className="slab-sm mb-2 block">Email</span>
          <input className="input" type="email" name="email" autoComplete="email" required maxLength={254} />
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
          {pending ? 'Sending…' : 'Send the reset link'}
        </button>
      </form>
    </Panel>
  );
}
