'use client';

import { useActionState } from 'react';
import { joinClassroom, type JoinResult } from './actions';

const initial: JoinResult = { error: null };

export default function JoinClassroomForm() {
  const [state, action, pending] = useActionState(joinClassroom, initial);

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <label className="flex-1" style={{ minWidth: '10rem' }}>
        <span className="slab-sm mb-2 block">Join code</span>
        <input
          className="input"
          type="text"
          name="code"
          placeholder="ABC123"
          autoComplete="off"
          autoCapitalize="characters"
          maxLength={6}
          required
          style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}
        />
      </label>
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? 'Joining…' : 'Join classroom'}
      </button>
      {state.error && (
        <p role="alert" style={{ width: '100%', margin: 0, color: 'var(--accent)', fontSize: '0.9375rem' }}>
          {state.error}
        </p>
      )}
    </form>
  );
}
