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

/** Every lesson in course order, with where it sits. */
export const OUTLINE_LESSONS: OutlinePlace[] = outline.all;
export const outlinePlace = outline.place;
export const nextOutlineLesson = outline.next;
