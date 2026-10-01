'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { dailyLesson, dailyStreak, localDay, sententiaFor } from '@/lib/daily';
import { SENTENTIAE } from '@/data/daily';
import LessonPlayer from '../learn/[id]/LessonPlayer';

/** Today's line as a short lesson. The day is the reader's own, so it is worked out after mount. */
export default function DailySession() {
  const [day, setDay] = useState<string | null>(null);
  useEffect(() => setDay(localDay()), []);
  if (!day) return null;

  const line = sententiaFor(day, SENTENTIAE);
  const date = new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  return (
    <LessonPlayer
      session={{
        lesson: dailyLesson(line, day),
        eyebrow: `Sententia · ${date}`,
        aimsLabel: 'In three minutes',
        doneLabel: 'Today’s line, done',
        back: { href: '/', label: 'Home', button: 'Back home' },
        onFinish: (score) => useStore.getState().completeDaily(day, line.id, score),
        after: <Streak day={day} />,
      }}
    />
  );
}

function Streak({ day }: { day: string }) {
  const daily = useStore((s) => s.daily);
  const n = dailyStreak(daily ?? {}, day);
  return (
    <p className="measure mt-7" style={{ fontFamily: 'var(--font-latin)', fontSize: '1.0625rem', color: 'var(--ink2)' }}>
      {n > 1 ? `${n} days in a row. ` : ''}A new line tomorrow.
    </p>
  );
}
