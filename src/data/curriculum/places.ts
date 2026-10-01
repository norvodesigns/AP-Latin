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
  units: { lessons: { id: string }[] }[];
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
      const start = (startLessonId && byId.get(startLessonId)?.index) || 0;
      return all.slice(start).find((p) => !done[p.lesson.id]) ?? all.find((p) => !done[p.lesson.id]) ?? null;
    },
    /** The lesson after this one in the course, if any. */
    after(id: string): Place<L, U, V> | null {
      const p = byId.get(id);
      return p ? (all[p.index + 1] ?? null) : null;
    },
  };
}

/** Share of a unit's lessons finished, 0–1. */
export function unitProgress(unit: { lessons: { id: string }[] }, done: Record<string, unknown>): number {
  if (unit.lessons.length === 0) return 0;
  return unit.lessons.filter((l) => done[l.id]).length / unit.lessons.length;
}
