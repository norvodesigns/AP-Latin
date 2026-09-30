/**
 * English words from Latin ones: the derivatives the course lists with its
 * words, shown on vocabulary cards and drilled in a ten-question round
 * ("Which English word comes from pugnō?" and "Pugnacious comes from which
 * Latin word?"). The app builds the same round (LectioCore
 * `Course.derivativesLesson`).
 */

import { ALL_LESSONS, type ChoiceStep, type Lesson } from '@/data/curriculum';

export const DERIVATIVES_PREFIX = 'roots-';
export const DERIVATIVES_LENGTH = 10;

export interface RootWord {
  /** The dictionary form's first word, e.g. "pugnō". */
  head: string;
  english: string;
  derivatives: string[];
  vocabId?: string;
  lessonId: string;
}

/** Letters only, no macrons, lower case: for telling look-alike roots apart. */
function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
}

/** Every course word with English derivatives, first appearance only. */
export const ROOT_WORDS: RootWord[] = (() => {
  const seen = new Set<string>();
  const out: RootWord[] = [];
  for (const p of ALL_LESSONS) {
    for (const w of p.lesson.words) {
      if (!w.derivatives?.length) continue;
      const head = w.latin.split(',')[0].replace(/\s*\(.*\)/, '').trim();
      if (seen.has(fold(head))) continue;
      seen.add(fold(head));
      out.push({ head, english: w.english, derivatives: w.derivatives, vocabId: w.vocabId, lessonId: p.lesson.id });
    }
  }
  return out;
})();

/** AP vocabulary id -> its English derivatives, for the flashcards. */
export const DERIVATIVES_BY_VOCAB: ReadonlyMap<string, string[]> = new Map(
  ROOT_WORDS.filter((w) => w.vocabId).map((w) => [w.vocabId!, w.derivatives]),
);

type Rng = () => number;

function pick<T>(list: T[], rng: Rng): T {
  return list[Math.floor(rng() * list.length)];
}

function shuffle<T>(list: T[], rng: Rng): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Two words too alike to set against each other (regō, rēx; unit, unanimous). */
function alike(a: string, b: string): boolean {
  return fold(a).slice(0, 3) === fold(b).slice(0, 3);
}

/**
 * Whether an English word could also be traced to this Latin word: it holds
 * the root's stem or the start of one of its derivatives (manuscript holds
 * scrīb-, so scrībō can't be a wrong answer beside manus).
 */
function traces(english: string, w: RootWord): boolean {
  const e = fold(english);
  return [w.head, ...w.derivatives].some((x) => {
    const stem = fold(x).slice(0, 4);
    return stem.length === 4 && e.includes(stem);
  });
}

/**
 * A round of derivatives questions, from the words of finished lessons when
 * there are enough of them, otherwise from the whole course.
 */
export function derivativesLesson(done: Record<string, unknown>, rng: Rng = Math.random, length = DERIVATIVES_LENGTH): Lesson {
  const known = ROOT_WORDS.filter((w) => done[w.lessonId]);
  const pool = known.length >= 8 ? known : ROOT_WORDS;
  const words = shuffle(pool, rng).slice(0, Math.min(length, pool.length));
  const steps: ChoiceStep[] = words.map((w, i) => {
    const derivative = pick(w.derivatives, rng);
    const others = w.derivatives.filter((d) => d !== derivative);
    const Derivative = derivative.charAt(0).toUpperCase() + derivative.slice(1);
    const explain =
      `*${Derivative}* comes from *${w.head}*, “${w.english}”.` +
      (others.length ? ` So ${others.length === 1 ? 'does' : 'do'} ${others.join(' and ')}.` : '');
    const rest = shuffle(
      ROOT_WORDS.filter((o) => o !== w && !alike(o.head, w.head)),
      rng,
    );
    if (i % 2 === 0) {
      // Latin to English.
      const wrong: string[] = [];
      for (const o of rest) {
        const d = pick(o.derivatives, rng);
        if (alike(d, derivative) || alike(d, w.head) || traces(d, w) || wrong.some((x) => alike(x, d))) continue;
        wrong.push(d);
        if (wrong.length === 3) break;
      }
      return place(`Which English word comes from *${w.head}*, “${w.english}”?`, derivative, wrong, explain, rng);
    }
    // English to Latin.
    const wrong: string[] = [];
    for (const o of rest) {
      if (alike(o.head, derivative) || traces(derivative, o) || wrong.some((x) => alike(x, o.head))) continue;
      wrong.push(o.head);
      if (wrong.length === 3) break;
    }
    return place(`*${Derivative}* comes from which Latin word?`, w.head, wrong, explain, rng);
  });
  return {
    id: `${DERIVATIVES_PREFIX}${Math.floor(rng() * 1e9)}`,
    title: 'Derivatives',
    summary: 'Ten questions on the English words that come from Latin ones.',
    minutes: 4,
    objectives: ['See the Latin inside English words', 'Use English you know to remember Latin, and the other way round'],
    words: [],
    steps,
  };
}

function place(prompt: string, right: string, wrong: string[], explain: string, rng: Rng): ChoiceStep {
  const at = Math.floor(rng() * (wrong.length + 1));
  const options = [...wrong];
  options.splice(at, 0, right);
  return { kind: 'choice', prompt, options, answer: at, explain };
}

export function isDerivativesId(id: string): boolean {
  return id.startsWith(DERIVATIVES_PREFIX);
}
