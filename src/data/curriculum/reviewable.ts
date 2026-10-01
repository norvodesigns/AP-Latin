import { isExercise, type Lesson, type LessonStep } from './types';

/**
 * The exercises of a finished lesson that a review can use. A reading
 * lesson's questions mostly point back at its passage, so only those that
 * carry their own Latin come along: translations, and choices that quote
 * their line. The app does the same (LectioCore `Lesson.reviewExercises`).
 */
export function reviewExercises(lesson: Lesson): LessonStep[] {
  const reading = lesson.steps.some((s) => s.kind === 'read');
  return lesson.steps.filter(isExercise).filter((s) => !reading || s.kind !== 'choice' || Boolean(s.latin));
}
