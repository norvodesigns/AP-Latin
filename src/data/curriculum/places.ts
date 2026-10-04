/**
 * Finding your way around a course: every lesson in order, where one sits,
 * what comes next. Shared by the full course (`index.ts`) and its outline
 * (`outline.ts`), which have the same shape minus the steps.
 */

export interface Place<L, U, V> {
  lesson: L;
  unit: U;
  level: V;
  /** 0-based position in the whole course. */
  index: number;
}

type UnitOf<V extends CourseLevel> = V['units'][number];
type LessonOf<V extends CourseLevel> = UnitOf<V>['lessons'][number];
interface CourseLevel {
  units: { lessons: { id: string; test?: boolean }[] }[];
}

export function indexCourse<V extends CourseLevel>(levels: V[]) {
  type L = LessonOf<V>;
  type U = UnitOf<V>;
  const all: Place<L, U, V>[] = levels
    .flatMap((level) => level.units.flatMap((unit) => unit.lessons.map((lesson) => ({ lesson, unit, level }))))
    .map((p, index) => ({ ...p, index }));
  const byId = new Map(all.map((p) => [p.lesson.id, p]));
  return {
    all,
    place: (id: string): Place<L, U, V> | undefined => byId.get(id),
    /**
     * The lesson to do next: the first one not yet finished, starting from
     * the student's chosen starting point if they have one. Null when the
     * course (as written so far) is done.
     */
    next(done: Record<string, unknown>, startLessonId?: string | null): Place<L, U, V> | null {
      // A unit test is never "next": it's there for whoever wants to skip.
      const open = (p: Place<L, U, V>) => !done[p.lesson.id] && !p.lesson.test;
      const start = (startLessonId && byId.get(startLessonId)?.index) || 0;
      return all.slice(start).find(open) ?? all.find(open) ?? null;
    },
    /** The lesson after this one in the course, if any, unit tests aside. */
    after(id: string): Place<L, U, V> | null {
      const p = byId.get(id);
      return p ? (all.slice(p.index + 1).find((q) => !q.lesson.test) ?? null) : null;
    },
  };
}

/** Share of a unit's lessons finished, 0–1. */
export function unitProgress(unit: { lessons: { id: string; test?: boolean }[] }, done: Record<string, unknown>): number {
  // A unit test is a way past the lessons, not one of them.
  const lessons = unit.lessons.filter((l) => !l.test);
  if (lessons.length === 0) return 0;
  return lessons.filter((l) => done[l.id]).length / lessons.length;
}
