'use client';

import { useActionState } from 'react';
import { signIn, type AuthResult } from '../actions';
import { Panel } from '@/components/ui';

const initial: AuthResult = { error: null };

export default function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signIn, initial);

  return (
    <Panel>
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />

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
          </span>
          <input
            className="input"
            type="password"
            name="password"
            autoComplete="current-password"
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
          {pending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </Panel>
  );
}
