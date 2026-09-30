'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { buildReview } from '@/lib/review';
import type { Lesson } from '@/data/curriculum';
import { Page, PageHeader } from '@/components/ui';
import LessonPlayer from '../[id]/LessonPlayer';

/** A fresh review from the student's finished lessons; "Another review" makes a new one. */
export default function ReviewSession() {
  const [round, setRound] = useState(0);
  const [review, setReview] = useState<Lesson | null | undefined>(undefined);

  useEffect(() => {
    // Read the store once per round, so progress saved mid-review doesn't reshuffle it.
    setReview(buildReview(useStore.getState().lessons ?? {}));
  }, [round]);

  if (review === undefined) return null;
  if (review === null) {
    return (
      <Page>
        <PageHeader eyebrow="Review" title="Nothing to review yet" lede="Review mixes exercises from lessons you have finished. Finish a lesson first, and it will be here." />
        <Link href="/learn" className="btn btn-primary">
          Go to the course
        </Link>
      </Page>
    );
  }
  return <LessonPlayer key={round} review={review} onAgain={() => setRound((r) => r + 1)} />;
}
