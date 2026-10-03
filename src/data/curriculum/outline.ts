/**
 * The course without its steps, for the pages that list lessons rather than
 * play them (the dashboard, the course map, laurels). The data is generated
 * from the course (npm run export:outline) and checked by the verifier.
 */

import type { OutlineLesson, OutlineLevel, OutlineUnit } from './types';
import { indexCourse, type Place } from './places';
import { OUTLINE } from './outline.generated.ts';

export { OUTLINE };
export { unitProgress } from './places';
export type { OutlineLesson, OutlineLevel, OutlineUnit } from './types';

export type OutlinePlace = Place<OutlineLesson, OutlineUnit, OutlineLevel>;

const outline = indexCourse(OUTLINE);
const grammar = indexCourse(OUTLINE.filter((l) => (l.track ?? 'grammar') === 'grammar'));
const vocabulary = indexCourse(OUTLINE.filter((l) => l.track === 'vocabulary'));

/** Every lesson of both tracks, with where it sits. */
export const OUTLINE_LESSONS: OutlinePlace[] = outline.all;
/** The grammar lessons in order. */
export const OUTLINE_GRAMMAR_LESSONS: OutlinePlace[] = grammar.all;
/** The vocabulary lessons in order, unit tests included. */
export const OUTLINE_VOCAB_LESSONS: OutlinePlace[] = vocabulary.all;
export const outlinePlace = outline.place;
/** The next grammar lesson (the vocabulary track has `nextWords`). */
export const nextOutlineLesson = grammar.next;
