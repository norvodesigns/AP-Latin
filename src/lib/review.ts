/**
 * Course review: a short lesson made of exercises from lessons the student
 * has finished, weighted toward the ones they found hardest and haven't
 * done for a while. It plays in the ordinary lesson player; finishing it
 * counts the day as studied but records no lesson.
 *
 * Reading lessons are left out: their questions only make sense with the
 * passage in front of you. The app builds the same kind of review
 * (LectioCore `Course.review`).
 */

import { ALL_LESSONS, isExercise, type Lesson, type LessonStep } from '@/data/curriculum';
import type { LessonProgress } from '@/store/useStore';

export const REVIEW_ID = 'review';
export const REVIEW_LENGTH = 10;

type Rng = () => number;

/** How much a finished lesson needs review: weak scores and old dates weigh more. */
export function reviewWeight(p: LessonProgress, now: number): number {
  const days = Math.max(0, (now - Date.parse(p.lastAt)) / 86_400_000);
  return (1.2 - Math.min(1, Math.max(0, p.best))) * (1 + Math.min(days, 30) / 10);
}

export function buildReview(
  done: Record<string, LessonProgress>,
  length = REVIEW_LENGTH,
  rng: Rng = Math.random,
  now = Date.now(),
): Lesson | null {
  const pool = ALL_LESSONS.filter((p) => done[p.lesson.id] && !p.lesson.steps.some((s) => s.kind === 'read')).map((p) => ({
    exercises: p.lesson.steps.filter(isExercise) as LessonStep[],
    weight: reviewWeight(done[p.lesson.id], now),
  }));
  const available = pool.reduce((n, p) => n + p.exercises.length, 0);
  if (available === 0) return null;

  const steps: LessonStep[] = [];
  const used = new Set<LessonStep>();
  const target = Math.min(length, available);
  while (steps.length < target) {
    const open = pool.filter((p) => p.exercises.some((e) => !used.has(e)));
    const total = open.reduce((n, p) => n + p.weight, 0);
    let r = rng() * total;
    const lesson = open.find((p) => (r -= p.weight) < 0) ?? open[open.length - 1];
    const fresh = lesson.exercises.filter((e) => !used.has(e));
    const step = fresh[Math.floor(rng() * fresh.length)];
    used.add(step);
    steps.push(step);
  }

  return {
    id: REVIEW_ID,
    title: 'Review',
    summary: 'Exercises from lessons you have finished, weighted toward the ones you found hardest.',
    minutes: Math.max(3, Math.round(target * 0.6)),
    objectives: ['Bring back what is fading before it is gone', 'Find out which lessons are worth doing again'],
    words: [],
    steps,
  };
}
