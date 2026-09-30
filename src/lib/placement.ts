/**
 * Where the placement check puts a student. The iPhone app ports this
 * exactly (LectioCore/Curriculum/Placement.swift).
 *
 * Questions come in course order, two per unit. The check stops early once
 * a student has missed three, since by then it has found their level. The
 * suggestion is the first unit with a miss; a student who misses nothing
 * has finished what the course teaches so far.
 */

export interface PlacementAnswer {
  unit: string;
  right: boolean;
}

export const PLACEMENT_STOP_AFTER_MISSES = 3;

/** Whether to ask another question, given the answers so far. */
export function placementContinues(answers: PlacementAnswer[], total: number): boolean {
  return answers.length < total && answers.filter((a) => !a.right).length < PLACEMENT_STOP_AFTER_MISSES;
}

/** The unit to start at, or null when every question was answered right. */
export function placementStart(answers: PlacementAnswer[]): string | null {
  return answers.find((a) => !a.right)?.unit ?? null;
}
