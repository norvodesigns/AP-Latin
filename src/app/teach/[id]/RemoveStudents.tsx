'use client';

import { useTransition } from 'react';
import { removeStudent } from './actions';

/** A teacher's way to take someone off the roster: a student who left the
 *  class, or a name that shouldn't be on the leaderboard. */
export default function RemoveStudents({
  classroomId,
  students,
}: {
  classroomId: string;
  students: Array<{ id: string; name: string }>;
}) {
  const [pending, start] = useTransition();
  if (students.length === 0) return null;

  return (
    <details className="mt-6">
      <summary className="slab-sm" style={{ cursor: 'pointer' }}>
        Remove a student
      </summary>
      <ul className="mt-3 flex flex-col gap-2 pl-0" style={{ listStyle: 'none' }}>
        {students.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-4">
            <span className="truncate" style={{ fontFamily: 'var(--font-latin)', fontSize: '1.0625rem' }}>
              {s.name}
            </span>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={pending}
              onClick={() => {
                if (!window.confirm(`Remove ${s.name} from this classroom? Their account and history stay; they can rejoin only with the code.`)) return;
                start(() => removeStudent(classroomId, s.id));
              }}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}
