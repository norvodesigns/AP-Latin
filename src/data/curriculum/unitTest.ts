import type { CurriculumLevel, CurriculumUnit, Lesson, LessonStep } from './types';

/**
 * A test at the end of each grammar unit, built from the unit's own
 * exercises: passed at 85% (src/lib/path.ts, UNIT_TEST_PASS), it counts the
 * whole unit as done, the way a Verba unit test does, so a student who
 * already knows a unit's grammar can show it and move on. Never "next" on
 * the path; it's there for whoever wants to skip.
 *
 * Only exercises that stand on their own come along: no translations (graded
 * by the student, not checked), and from a lesson with a reading, only the
 * questions that quote their Latin.
 */

/** Questions in a grammar unit test, at most. */
export const GRAMMAR_TEST_LENGTH = 16;
/** A unit with fewer usable exercises than this gets no test. */
const GRAMMAR_TEST_MIN = 6;

function testable(lesson: Lesson): LessonStep[] {
  const reading = lesson.steps.some((s) => s.kind === 'read');
  return lesson.steps.filter(
    (s) => (s.kind === 'choice' && (!reading || Boolean(s.latin))) || s.kind === 'type' || s.kind === 'match' || s.kind === 'build',
  );
}

const NUMBERS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
  'thirteen', 'fourteen', 'fifteen', 'sixteen'];
const spell = (n: number) => NUMBERS[n] ?? String(n);

/**
 * A unit's test: up to GRAMMAR_TEST_LENGTH exercises drawn evenly from its
 * lessons, the last ones of each (a lesson's closing questions ask the most
 * of it), or null when the unit has too few that stand on their own.
 */
export function unitTestFor(unit: CurriculumUnit): Lesson | null {
  const pools = unit.lessons.filter((l) => !l.test).map(testable).filter((p) => p.length > 0);
  if (pools.length === 0) return null;
  const per = Math.max(1, Math.floor(GRAMMAR_TEST_LENGTH / pools.length));
  const taken = pools.map((p) => p.slice(-per));
  // Top up from earlier exercises, a lesson at a time, while there's room.
  let total = taken.reduce((n, t) => n + t.length, 0);
  for (let round = 1; total < GRAMMAR_TEST_LENGTH && round < 20; round++) {
    let added = false;
    pools.forEach((p, i) => {
      if (total >= GRAMMAR_TEST_LENGTH) return;
      const next = p[p.length - per - round];
      if (next) {
        taken[i] = [next, ...taken[i]];
        total += 1;
        added = true;
      }
    });
    if (!added) break;
  }
  const steps = taken.flat().slice(0, GRAMMAR_TEST_LENGTH);
  if (steps.length < GRAMMAR_TEST_MIN) return null;
  const n = steps.length;
  return {
    id: `${unit.id}-test`,
    title: `Unit test: ${unit.title}`,
    summary: `${spell(n).charAt(0).toUpperCase() + spell(n).slice(1)} questions from the whole unit. Pass it to skip what you already know.`,
    minutes: Math.max(5, Math.round(n / 2)),
    test: true,
    objectives: ['Show you know the unit’s grammar, and skip its lessons if you do'],
    words: [],
    steps: [
      {
        kind: 'teach',
        title: 'The unit test',
        body: [
          `${spell(n).charAt(0).toUpperCase() + spell(n).slice(1)} questions from across the unit, taken from its lessons.`,
          'Score 85% or better and every lesson in the unit counts as done, and its words join your flashcards as words you know.',
          'Fall short and nothing is lost: the lessons are waiting, and the test is here whenever you want it again.',
        ],
        tip: 'Taking it before the lessons is the quickest way past grammar you already know.',
      },
      ...steps,
    ],
  };
}

/** A grammar level with a test at the end of each unit that can have one. */
export function withUnitTests(level: CurriculumLevel): CurriculumLevel {
  return {
    ...level,
    units: level.units.map((unit) => {
      const test = unitTestFor(unit);
      return test ? { ...unit, lessons: [...unit.lessons, test] } : unit;
    }),
  };
}
