import type { CurriculumLevel, Lesson, CurriculumUnit } from './types';
import { prima } from './prima';
import { secunda } from './secunda';
import { tertia } from './tertia';

export * from './types';
export { PLACEMENT, type PlacementQuestion } from './placement';

/** The whole course, in order. Units are added to a level as they're written. */
export const COURSE: CurriculumLevel[] = [prima, secunda, tertia];

export interface LessonPlace {
  lesson: Lesson;
  unit: CurriculumUnit;
  level: CurriculumLevel;
  /** 0-based position in the whole course. */
  index: number;
}

/** Every lesson in course order, with where it sits. */
export const ALL_LESSONS: LessonPlace[] = COURSE.flatMap((level) =>
  level.units.flatMap((unit) => unit.lessons.map((lesson) => ({ lesson, unit, level }))),
).map((p, index) => ({ ...p, index }));

const BY_ID = new Map(ALL_LESSONS.map((p) => [p.lesson.id, p]));

export function lessonPlace(id: string): LessonPlace | undefined {
  return BY_ID.get(id);
}

/**
 * The lesson to do next: the first one not yet finished, starting from the
 * student's chosen starting point if they have one. Null when the course
 * (as written so far) is done.
 */
export function nextLesson(done: Record<string, unknown>, startLessonId?: string | null): LessonPlace | null {
  const start = (startLessonId && BY_ID.get(startLessonId)?.index) || 0;
  return ALL_LESSONS.slice(start).find((p) => !done[p.lesson.id]) ?? ALL_LESSONS.find((p) => !done[p.lesson.id]) ?? null;
}

/** The lesson after this one in the course, if any. */
export function lessonAfter(id: string): LessonPlace | null {
  const place = BY_ID.get(id);
  return place ? (ALL_LESSONS[place.index + 1] ?? null) : null;
}

/** Share of a unit's lessons finished, 0–1. */
export function unitProgress(unit: CurriculumUnit, done: Record<string, unknown>): number {
  if (unit.lessons.length === 0) return 0;
  return unit.lessons.filter((l) => done[l.id]).length / unit.lessons.length;
}
