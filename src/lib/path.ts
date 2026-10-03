/**
 * The adaptive part of the course: what to study next in the vocabulary
 * track, and what a passed unit test does. Pure functions over plain data,
 * ported line for line to the app (LectioCore `Path`) and checked against
 * fixtures this file's functions produce (scripts/export-merge-fixtures.ts).
 *
 * The grammar track is taken in order from where the placement check (or the
 * student) started it (`nextLesson`). The vocabulary track adapts to what the
 * student already knows:
 *
 *   - a lesson whose every word is already well known (a mature card in the
 *     deck, from the grammar lessons, the reading room or the flashcards) is
 *     passed over;
 *   - a unit the level check found probably known is offered as its unit
 *     test first, the quickest way past it;
 *   - a passed unit test counts the unit's lessons as done and puts their
 *     words in the deck as words already known, spread over three weeks so
 *     they come back a few at a time instead of all at once.
 */

/** A card at least this many days between reviews counts as well known
 *  (the dashboard's "mature"). */
export const KNOWN_INTERVAL = 21;

/** The share of a unit test to get right to pass it. */
export const UNIT_TEST_PASS = 0.85;

/** What `path` needs to know about a vocabulary lesson. */
export interface PathLesson {
  id: string;
  unitId: string;
  /** The AP-list words it teaches. */
  vocabIds: string[];
  /** A unit test. */
  test: boolean;
}

/** The part of a flashcard this file reads. */
export interface PathCard {
  interval: number;
}

/** Whether every word a lesson teaches is already well known. A lesson with
 *  no words (a unit test) never is. */
export function lessonKnown(vocabIds: string[], vocab: Record<string, PathCard | undefined>): boolean {
  return vocabIds.length > 0 && vocabIds.every((id) => (vocab[id]?.interval ?? 0) >= KNOWN_INTERVAL);
}

/**
 * The vocabulary lesson to do next, or null when there's nothing left:
 * the first lesson not done and not already known, except that in a unit
 * the level check found probably known (`knownUnits`), the unit test comes
 * first while it hasn't been taken. Unit tests are otherwise never next;
 * they're there on the course map for anyone who wants them.
 */
export function nextWords(
  lessons: PathLesson[],
  done: Record<string, unknown>,
  vocab: Record<string, PathCard | undefined>,
  knownUnits: string[] = [],
): PathLesson | null {
  for (const lesson of lessons) {
    if (done[lesson.id] || lesson.test) continue;
    if (knownUnits.includes(lesson.unitId)) {
      const test = lessons.find((l) => l.unitId === lesson.unitId && l.test);
      if (test && !done[test.id]) return test;
    }
    if (lessonKnown(lesson.vocabIds, vocab)) continue;
    return lesson;
  }
  return null;
}

/** Whether a unit-test score passes. */
export function testPassed(score: number, pass: number = UNIT_TEST_PASS): boolean {
  return score >= pass;
}

/**
 * What passing a unit test does: the unit's lessons not yet done, to count
 * as done, and its words not yet in the deck, to add as known (in order, so
 * their due dates spread the same way every time).
 */
export function testOut(
  unitLessons: PathLesson[],
  done: Record<string, unknown>,
  vocab: Record<string, unknown>,
): { lessonIds: string[]; vocabIds: string[] } {
  const lessonIds = unitLessons.filter((l) => !l.test && !done[l.id]).map((l) => l.id);
  const seen = new Set<string>();
  const vocabIds: string[] = [];
  for (const l of unitLessons) {
    for (const id of l.vocabIds) {
      if (vocab[id] || seen.has(id)) continue;
      seen.add(id);
      vocabIds.push(id);
    }
  }
  return { lessonIds, vocabIds };
}

/** The ISO day `n` days after `iso` (both YYYY-MM-DD, counted in UTC). */
export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** How many days a passed test's known words are spread over. */
export const KNOWN_SPREAD_DAYS = 21;

/**
 * A word shown to be known: a card ten days into its schedule, due on one
 * of the next three weeks' days, the `index`-th word of the batch landing on
 * day 1 + index mod 21, so a unit's words come back a few each day.
 */
export function knownCard(id: string, index: number, today: string) {
  return {
    id,
    ef: 2.5,
    interval: 10,
    repetitions: 2,
    due: addDays(today, 1 + (index % KNOWN_SPREAD_DAYS)),
    lapses: 0,
    reviews: 0,
  };
}

/**
 * The level check's vocabulary questions, answered: the units whose two
 * words were both known, to be offered as unit tests first.
 */
export function knownVocabUnits(answers: Array<{ unit: string; right: boolean }>): string[] {
  const byUnit = new Map<string, boolean[]>();
  for (const a of answers) byUnit.set(a.unit, [...(byUnit.get(a.unit) ?? []), a.right]);
  return [...byUnit].filter(([, rights]) => rights.length > 0 && rights.every(Boolean)).map(([unit]) => unit);
}

/** A unit's lessons as `path` reads them. */
export function pathLessons(unit: {
  id: string;
  lessons: Array<{ id: string; test?: boolean; words: Array<{ vocabId?: string }> }>;
}): PathLesson[] {
  return unit.lessons.map((l) => ({
    id: l.id,
    unitId: unit.id,
    vocabIds: l.words.flatMap((w) => (w.vocabId ? [w.vocabId] : [])),
    test: Boolean(l.test),
  }));
}
