import type { CurriculumLevel, OutlineLevel } from './types';
import { reviewExercises } from './reviewable';

/** The course without its steps (see outline.ts). */
export function outlineOf(course: CurriculumLevel[]): OutlineLevel[] {
  return course.map((level) => ({
    id: level.id,
    numeral: level.numeral,
    title: level.title,
    subtitle: level.subtitle,
    blurb: level.blurb,
    units: level.units.map((unit) => ({
      id: unit.id,
      n: unit.n,
      title: unit.title,
      blurb: unit.blurb,
      lessons: unit.lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        summary: lesson.summary,
        minutes: lesson.minutes,
        reviewable: reviewExercises(lesson).length > 0,
      })),
    })),
  }));
}
