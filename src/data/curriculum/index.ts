import type { CurriculumLevel, Lesson, CurriculumUnit } from './types';
import { prima } from './prima';
import { secunda } from './secunda';
import { tertia } from './tertia';
import { quarta } from './quarta';
import { indexCourse, type Place } from './places';

export * from './types';
export { PLACEMENT, type PlacementQuestion } from './placement';
export { unitProgress } from './places';

/** The whole course, in order. Units are added to a level as they're written. */
export const COURSE: CurriculumLevel[] = [prima, secunda, tertia, quarta];

export type LessonPlace = Place<Lesson, CurriculumUnit, CurriculumLevel>;

const course = indexCourse(COURSE);

/** Every lesson in course order, with where it sits. */
export const ALL_LESSONS: LessonPlace[] = course.all;

export const lessonPlace = course.place;

/**
 * The lesson to do next: the first one not yet finished, starting from the
 * student's chosen starting point if they have one. Null when the course
 * (as written so far) is done.
 */
export const nextLesson = course.next;

/** The lesson after this one in the course, if any. */
export const lessonAfter = course.after;
