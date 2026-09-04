'use client';

import { useActionState } from 'react';
import { createAssignment, deleteAssignment, type AssignmentResult } from './actions';
import { ASSIGNABLE_SECTIONS, type Assignment } from '@/lib/supabase/types';
import { sectionLabel } from '@/lib/nav';
import { Panel } from '@/components/ui';

const initial: AssignmentResult = { error: null };

export default function AssignmentManager({
  classroomId,
  assignments,
}: {
  classroomId: string;
  assignments: Assignment[];
}) {
  const createWithId = createAssignment.bind(null, classroomId);
  const [state, action, pending] = useActionState(createWithId, initial);

  return (
    <div className="flex flex-col gap-6">
      {assignments.length > 0 && (
        <ul className="flex flex-col pl-0" style={{ listStyle: 'none' }}>
          {assignments.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-3 border-t px-2 py-3"
              style={{ borderColor: 'var(--hair)', marginLeft: '-0.5rem' }}
            >
              <div>
                <span style={{ fontFamily: 'var(--font-latin)', fontSize: '1.0625rem' }}>
                  {sectionLabel(a.section)}
                </span>
                <span className="slab-sm ml-2.5">{a.target_minutes} min</span>
                {a.due_date && (
                  <span className="slab-sm ml-2.5">
                    due{' '}
                    {new Date(a.due_date + 'T00:00:00').toLocaleDateString(undefined, {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                )}
                {a.note && (
                  <div style={{ marginTop: '0.25rem', color: 'var(--fg-muted)', fontSize: '0.875rem' }}>
                    {a.note}
                  </div>
                )}
              </div>
              <form action={deleteAssignment.bind(null, a.id, classroomId)}>
                <button type="submit" className="btn btn-ghost" style={{ color: 'var(--accent)' }}>
                  Remove
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <Panel>
        <form action={action} className="flex flex-wrap items-end gap-4">
          <label>
            <span className="slab-sm mb-2 block">Section</span>
            <select className="input" name="section" required defaultValue="">
              <option value="" disabled>
                Choose one
              </option>
              {ASSIGNABLE_SECTIONS.map((s) => (
                <option key={s} value={s}>
                  {sectionLabel(s)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="slab-sm mb-2 block">Target minutes</span>
            <input className="input" type="number" name="targetMinutes" min={1} max={10000} required style={{ width: '7rem' }} />
          </label>
          <label>
            <span className="slab-sm mb-2 block">Due (optional)</span>
            <input className="input" type="date" name="dueDate" />
          </label>
          <label className="flex-1" style={{ minWidth: '10rem' }}>
            <span className="slab-sm mb-2 block">Note (optional)</span>
            <input className="input" type="text" name="note" maxLength={500} placeholder="e.g. focus on the ablative absolute" />
          </label>
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? 'Adding…' : 'Add assignment'}
          </button>
          {state.error && (
            <p role="alert" style={{ width: '100%', margin: 0, color: 'var(--accent)', fontSize: '0.9375rem' }}>
              {state.error}
            </p>
          )}
        </form>
      </Panel>
    </div>
  );
}
