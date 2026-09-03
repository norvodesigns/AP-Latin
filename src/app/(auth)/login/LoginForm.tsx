'use client';

import { useActionState } from 'react';
import { signIn, type AuthResult } from '../actions';
import { Panel } from '@/components/ui';

const initial: AuthResult = { error: null };

export default function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signIn, initial);

  return (
    <Panel>
      <form action={action} className="flex flex-col gap-6">
        <input type="hidden" name="next" value={next} />

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
            autoComplete="current-password"
            required
            minLength={8}
            maxLength={200}
          />
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
          {pending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </Panel>
  );
}
