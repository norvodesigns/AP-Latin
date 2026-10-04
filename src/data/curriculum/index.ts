import type { CurriculumLevel, Lesson, CurriculumUnit } from './types';
import { prima } from './prima';
import { secunda } from './secunda';
import { tertia } from './tertia';
import { quarta } from './quarta';
import { verba } from './verba';
import { withUnitTests } from './unitTest';
import { indexCourse, type Place } from './places';

export * from './types';
export { PLACEMENT, VOCAB_PLACEMENT, type PlacementQuestion } from './placement';
export { VERBA_TEST_PASS } from './verba/build.ts';
export { unitProgress } from './places';

/** The whole course: the grammar levels in order, then the vocabulary track. */
export const COURSE: CurriculumLevel[] = [...[prima, secunda, tertia, quarta].map(withUnitTests), verba];

/** The grammar levels, taken in order. */
export const GRAMMAR_LEVELS: CurriculumLevel[] = COURSE.filter((l) => (l.track ?? 'grammar') === 'grammar');
/** The vocabulary track (Verba), taken alongside the grammar. */
export const VOCAB_LEVEL: CurriculumLevel = verba;

export type LessonPlace = Place<Lesson, CurriculumUnit, CurriculumLevel>;

const course = indexCourse(COURSE);
const grammar = indexCourse(GRAMMAR_LEVELS);
const vocabulary = indexCourse([verba]);

/** Every lesson, both tracks, with where it sits. */
export const ALL_LESSONS: LessonPlace[] = course.all;
/** The grammar lessons in order. */
export const GRAMMAR_LESSONS: LessonPlace[] = grammar.all;
/** The vocabulary lessons in order, unit tests included. */
export const VOCAB_LESSONS: LessonPlace[] = vocabulary.all;

export const lessonPlace = course.place;

/**
 * The grammar lesson to do next: the first one not yet finished, starting
 * from the student's chosen starting point if they have one. Null when the
 * grammar course (as written so far) is done. The vocabulary track has its
 * own next lesson (`nextWords`, src/lib/path.ts).
 */
export const nextLesson = grammar.next;

/** The lesson after this one in its own track, if any. */
export const lessonAfter = (id: string): LessonPlace | null =>
  grammar.place(id) ? grammar.after(id) : vocabulary.after(id);
