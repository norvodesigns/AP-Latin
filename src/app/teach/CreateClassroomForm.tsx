'use client';

import { useActionState } from 'react';
import { createClassroom, type CreateClassroomResult } from './actions';

const initial: CreateClassroomResult = { error: null };

export default function CreateClassroomForm() {
  const [state, action, pending] = useActionState(createClassroom, initial);

  return (
    <form action={action} className="flex flex-wrap items-end gap-4">
      <label className="flex-1" style={{ minWidth: '12rem' }}>
        <span className="slab-sm mb-2 block">Classroom name</span>
        <input className="input" type="text" name="name" placeholder="Period 3 Latin IV" required maxLength={80} />
      </label>
      <label>
        <span className="slab-sm mb-2 block">Exam date (optional)</span>
        <input className="input" type="date" name="examDate" />
      </label>
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? 'Creating…' : 'Create classroom'}
      </button>
      {state.error && (
        <p role="alert" style={{ width: '100%', margin: 0, color: 'var(--accent)', fontSize: '0.9375rem' }}>
          {state.error}
        </p>
      )}
    </form>
  );
}
