'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { sentencesLesson } from '@/lib/sentences';
import type { Lesson } from '@/data/curriculum';
import LessonPlayer from '../[id]/LessonPlayer';

/** A fresh round of sentences; "Another round" deals a new one. */
export default function SentencesSession() {
  const [round, setRound] = useState(0);
  const [lesson, setLesson] = useState<Lesson | null>(null);

  useEffect(() => {
    // Read the store once per round, so progress saved mid-round doesn't reshuffle it.
    setLesson(sentencesLesson(useStore.getState().lessons ?? {}));
  }, [round]);

  if (!lesson) return null;
  return (
    <LessonPlayer
      key={round}
      session={{
        lesson,
        eyebrow: 'Sentence builder · from the course',
        aimsLabel: 'What it’s for',
        doneLabel: 'Round complete',
        back: { href: '/learn', label: 'Course', button: 'Back to the course' },
        onFinish: () => useStore.getState().markStudied(),
        again: { label: 'Another round', onClick: () => setRound((r) => r + 1) },
      }}
    />
  );
}
