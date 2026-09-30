'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { derivativesLesson } from '@/lib/derivatives';
import type { Lesson } from '@/data/curriculum';
import LessonPlayer from '../../learn/[id]/LessonPlayer';

/** A fresh round of derivatives questions; "Another round" deals a new one. */
export default function DerivativesSession() {
  const [round, setRound] = useState(0);
  const [lesson, setLesson] = useState<Lesson | null>(null);

  useEffect(() => {
    // Read the store once per round, so progress saved mid-round doesn't reshuffle it.
    setLesson(derivativesLesson(useStore.getState().lessons ?? {}));
  }, [round]);

  if (!lesson) return null;
  return (
    <LessonPlayer
      key={round}
      session={{
        lesson,
        eyebrow: 'Vocabulary · Latin inside English',
        aimsLabel: 'What it’s for',
        doneLabel: 'Round complete',
        back: { href: '/vocab', label: 'Vocabulary', button: 'Back to vocabulary' },
        onFinish: () => useStore.getState().markStudied(),
        again: { label: 'Another round', onClick: () => setRound((r) => r + 1) },
      }}
    />
  );
}
