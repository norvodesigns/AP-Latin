/**
 * Verba: the whole AP vocabulary list (src/data/vocabulary.ts, the College
 * Board's Appendix 2), taught by letter. Seven units, A–C to T–V; each one
 * lessons of about twelve words in the list's own order, then a unit test.
 *
 * Nothing here is written by hand: every lesson is built from the list, the
 * same way every time (the questions' wrong answers come from a generator
 * seeded with the lesson's id), so the website and the app, which reads the
 * exported course, always show the same lessons. `scripts/verify-content.mjs`
 * checks them like any other unit, and that every word on the list is taught
 * exactly once.
 *
 * A unit test (`test: true`) passed at VERBA_TEST_PASS or better counts every
 * lesson of its unit as done and puts the unit's words in the deck as words
 * already known (src/lib/path.ts, and LectioCore `Path`).
 */

import type { ChoiceStep, CurriculumUnit, Lesson, LessonStep, LessonWord, MatchStep, TypeStep } from '../types.ts';
import type { VocabEntry } from '../../types.ts';
import { coreVocabulary } from '../../vocabulary.ts';
import { UNIT_TEST_PASS } from '../../../lib/path.ts';

/** The letters of each unit, in order. The list has no J, K, X, Y or Z. */
export const VERBA_UNITS: Array<{ n: number; letters: string; title: string }> = [
  { n: 1, letters: 'abc', title: 'A, B and C' },
  { n: 2, letters: 'def', title: 'D, E and F' },
  { n: 3, letters: 'ghi', title: 'G, H and I' },
  { n: 4, letters: 'lmn', title: 'L, M and N' },
  { n: 5, letters: 'opq', title: 'O, P and Q' },
  { n: 6, letters: 'rs', title: 'R and S' },
  { n: 7, letters: 'tuv', title: 'T, U and V' },
];

/** The share of a unit test to get right to pass it (src/lib/path.ts). */
export const VERBA_TEST_PASS = UNIT_TEST_PASS;

/** About this many words to a lesson. */
const PER_LESSON = 12;
/** Questions in a unit test. */
const TEST_LENGTH = 20;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** The letter a word files under: "-ne" under N. */
function initial(v: VocabEntry): string {
  return v.headword.replace(/^[^a-zA-Z]+/, '').charAt(0).toLowerCase();
}

/** Text safe for the lesson markup: no stray emphasis or ending markers. */
function plain(s: string): string {
  return s.replace(/[*|]/g, '').replace(/\s+/g, ' ').trim();
}

/** The meaning, short enough for a tile: leading "(with abl.)" and other
 *  asides dropped, then the first sense or two. */
export function gloss(definition: string, senses = 2): string {
  const d = plain(definition).replace(/\s*\([^)]*\)/g, '').trim();
  const parts = d.split(/[;,]/).map((s) => s.trim()).filter(Boolean);
  if (!parts.length) return plain(definition);
  let out = parts[0];
  for (let i = 1; i < Math.min(senses, parts.length); i++) {
    if ((out + ', ' + parts[i]).length > 28) break;
    out += ', ' + parts[i];
  }
  return out;
}

/** A small, fast generator seeded from a string, so a lesson's wrong answers
 *  are the same on every build. */
function rng(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(list: T[], random: () => number): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Splits `items` into `k` runs whose lengths differ by at most one. */
function chunks<T>(items: T[], k: number): T[][] {
  const out: T[][] = [];
  const base = Math.floor(items.length / k);
  const extra = items.length % k;
  let at = 0;
  for (let i = 0; i < k; i++) {
    const n = base + (i < extra ? 1 : 0);
    out.push(items.slice(at, at + n));
    at += n;
  }
  return out;
}

/** Hands out answer positions so no option slot gets more than its share. */
function slots(seed: string, size = 4): () => number {
  const random = rng(seed + ':slots');
  let bag: number[] = [];
  return () => {
    if (!bag.length) bag = shuffle([...Array(size).keys()], random);
    return bag.pop()!;
  };
}

/* ------------------------------------------------------------------ */
/* Questions                                                           */
/* ------------------------------------------------------------------ */

const posRank = (a: VocabEntry, b: VocabEntry) => (a.pos === b.pos ? 0 : 1);

/** Up to `n` other words from `pool` to stand beside `word` as wrong
 *  answers: the same part of speech where there are enough, and none whose
 *  `key` (its tile text) matches the right answer's or one another's. */
function distractors(word: VocabEntry, pool: VocabEntry[], n: number, key: (v: VocabEntry) => string, random: () => number): VocabEntry[] {
  const taken = new Set([key(word).toLowerCase()]);
  const candidates = shuffle(pool.filter((v) => v.id !== word.id), random).sort((a, b) => posRank(word, a) - posRank(word, b));
  const out: VocabEntry[] = [];
  for (const v of candidates) {
    const k = key(v).toLowerCase();
    if (taken.has(k)) continue;
    taken.add(k);
    out.push(v);
    if (out.length === n) break;
  }
  return out;
}

function place(answer: string, wrong: string[], slot: number): { options: string[]; answer: number } {
  const at = Math.min(slot, wrong.length);
  const options = [...wrong];
  options.splice(at, 0, answer);
  return { options, answer: at };
}

const explainWord = (v: VocabEntry) => `*${plain(v.headword)}* (${plain(v.lemma)}): ${plain(v.definition)}.`;

/** "What does it mean?", the Latin above and four meanings below. */
function meaningOf(word: VocabEntry, pool: VocabEntry[], random: () => number, slot: number): ChoiceStep {
  const wrong = distractors(word, pool, 3, (v) => gloss(v.definition), random).map((v) => gloss(v.definition));
  return {
    kind: 'choice',
    prompt: 'What does it mean?',
    latin: plain(word.lemma),
    ...place(gloss(word.definition), wrong, slot),
    explain: explainWord(word),
  };
}

/** "Which word means …?", four Latin words to choose from. */
function wordFor(word: VocabEntry, pool: VocabEntry[], random: () => number, slot: number): ChoiceStep {
  const wrong = distractors(word, pool, 3, (v) => plain(v.headword), random).map((v) => plain(v.headword));
  return {
    kind: 'choice',
    prompt: `Which word means “${gloss(word.definition)}”?`,
    ...place(plain(word.headword), wrong, slot),
    explain: explainWord(word),
  };
}

/** Tap each word to its meaning; meanings that would read alike are told
 *  apart by giving more of the definition. */
function matchOf(words: VocabEntry[]): MatchStep {
  const rights = words.map((w) => gloss(w.definition));
  for (let senses = 3; senses <= 6 && new Set(rights).size < rights.length; senses++) {
    words.forEach((w, i) => {
      if (rights.filter((r) => r === rights[i]).length > 1) rights[i] = gloss(w.definition, senses);
    });
  }
  words.forEach((w, i) => {
    if (rights.filter((r) => r === rights[i]).length > 1) rights[i] = `${rights[i]} (${w.pos})`;
  });
  // Two entries can share a headword (liber, a book; liber, free): those
  // show their whole dictionary form.
  const heads = words.map((w) => plain(w.headword));
  const lefts = words.map((w, i) => (heads.filter((h) => h === heads[i]).length > 1 ? plain(w.lemma) : heads[i]));
  return {
    kind: 'match',
    prompt: 'Match each word to its meaning.',
    pairs: words.map((_, i) => [lefts[i], rights[i]] as [string, string]),
  };
}

/** Whether a word can fairly be asked for by typing it: one short word,
 *  with a meaning nothing else in the unit shares. */
function typable(word: VocabEntry, unitWords: VocabEntry[]): boolean {
  const head = plain(word.headword);
  if (!/^[a-z]{3,10}$/i.test(head)) return false;
  const g = gloss(word.definition).toLowerCase();
  return !unitWords.some((v) => v.id !== word.id && gloss(v.definition).toLowerCase() === g);
}

function typeIt(word: VocabEntry): TypeStep {
  const head = plain(word.headword);
  return {
    kind: 'type',
    prompt: `Type the Latin for “${gloss(word.definition)}”.`,
    answers: [head],
    hint: `It begins *${head.slice(0, 2)}*…`,
    explain: explainWord(word),
  };
}

/* ------------------------------------------------------------------ */
/* Lessons                                                             */
/* ------------------------------------------------------------------ */

const lessonWord = (v: VocabEntry): LessonWord => ({ latin: plain(v.lemma), english: plain(v.definition), vocabId: v.id });

function teach(title: string, body: string, words: VocabEntry[]): LessonStep {
  return {
    kind: 'teach',
    title,
    body: [body],
    examples: words.map((v) => ({ la: plain(v.lemma), en: plain(v.definition), note: v.pos })),
  };
}

function lesson(id: string, words: VocabEntry[], unitWords: VocabEntry[]): Lesson {
  const random = rng(id);
  const slot = slots(id);
  const half = Math.ceil(words.length / 2);
  const first = words.slice(0, half);
  const second = words.slice(half);

  // Each half: the words, a match, then the meaning of most of them. The
  // words not asked that way come back at the end the other way round, so
  // every word is asked once on its own; two are typed from memory.
  const askedMeaning = (ws: VocabEntry[]) => ws.slice(0, Math.max(1, ws.length - 2));
  const steps: LessonStep[] = [];
  const halfSteps = (ws: VocabEntry[], title: string, body: string) => {
    steps.push(teach(title, body, ws));
    if (ws.length >= 3) steps.push(matchOf(ws));
    for (const w of shuffle(askedMeaning(ws), random)) steps.push(meaningOf(w, unitWords, random, slot()));
  };
  halfSteps(first, 'New words', `${first.length === 1 ? 'One word' : `${spell(first.length)} words`} from the AP list, in its order. Say each one aloud, the Latin and then its meaning, before the questions begin.`);
  if (second.length) {
    halfSteps(second, 'And these', `${spell(second.length)} more. The last questions mix them with the first ${spell(first.length).toLowerCase()}.`);
  }
  const rest = [...first, ...second].filter((w) => !askedMeaning(first).includes(w) && !askedMeaning(second).includes(w));
  for (const w of shuffle(rest, random)) steps.push(wordFor(w, unitWords, random, slot()));
  const typed = shuffle(words.filter((w) => typable(w, unitWords)), random).slice(0, 2);
  for (const w of typed) steps.push(typeIt(w));

  const heads = words.map((w) => plain(w.headword));
  return {
    id,
    title: `${heads[0]} to ${heads[heads.length - 1]}`,
    summary: `${spell(words.length)} words: ${heads.slice(0, 4).join(', ')}…`,
    minutes: 8,
    objectives: [
      `Know ${spell(words.length).toLowerCase()} words of the AP list, from *${heads[0]}* to *${heads[heads.length - 1]}*`,
      'Give the meaning of each, and recall most of them from their meaning',
    ],
    words: words.map(lessonWord),
    steps,
  };
}

function unitTest(id: string, title: string, groups: VocabEntry[][], unitWords: VocabEntry[]): Lesson {
  const random = rng(id);
  const slot = slots(id);
  // The same share from every lesson, so the test covers the whole unit.
  const each = Math.ceil(TEST_LENGTH / groups.length);
  const picked = groups.flatMap((g) => shuffle(g, random).slice(0, each)).slice(0, TEST_LENGTH);
  const steps: LessonStep[] = [
    {
      kind: 'teach',
      title: `The ${title} test`,
      body: [
        `${spell(picked.length)} words from the whole unit, some asked one way and some the other.`,
        `Score ${Math.round(VERBA_TEST_PASS * 100)}% or better and every lesson in the unit counts as done, and its words join your flashcards as words you know, spread over the next three weeks so they come back a few at a time.`,
        'Fall short and nothing is lost: the lessons are waiting, and the test is here whenever you want it again.',
      ],
      tip: 'Taking it before the lessons is the quickest way past words you already know.',
    },
  ];
  shuffle(picked, random).forEach((w, i) => {
    steps.push(i % 2 === 0 ? meaningOf(w, unitWords, random, slot()) : wordFor(w, unitWords, random, slot()));
  });
  return {
    id,
    title: `Unit test: ${title}`,
    summary: `${spell(picked.length)} words from the whole unit. Pass it to skip what you already know.`,
    minutes: 7,
    test: true,
    objectives: ['Show which of the unit’s words you know, and skip its lessons if you know them all'],
    words: [],
    steps,
  };
}

const NUMBERS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve',
  'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen', 'Twenty'];
function spell(n: number): string {
  return NUMBERS[n] ?? String(n);
}

/** The words a unit teaches, in the list's order. */
export function verbaWords(n: number): VocabEntry[] {
  const spec = VERBA_UNITS.find((u) => u.n === n);
  if (!spec) return [];
  return coreVocabulary.filter((v) => spec.letters.includes(initial(v)));
}

/** Unit `n` of Verba: its lessons, then its test. */
export function verbaUnit(n: number): CurriculumUnit {
  const spec = VERBA_UNITS.find((u) => u.n === n)!;
  const words = verbaWords(n);
  const groups = chunks(words, Math.ceil(words.length / PER_LESSON));
  const unitId = `verba-${n}`;
  const lessons = groups.map((g, i) => lesson(`${unitId}-${i + 1}`, g, words));
  lessons.push(unitTest(`${unitId}-${groups.length + 1}`, spec.title, groups, words));
  const first = plain(words[0].headword);
  const last = plain(words[words.length - 1].headword);
  return {
    id: unitId,
    n,
    title: spec.title,
    blurb: `${words.length} words from the AP list, *${first}* to *${last}*, in ${groups.length} lessons of about twelve, then a unit test. Know them already? Take the test first.`,
    lessons,
  };
}

/**
 * The level check's vocabulary questions: two typical words from each unit
 * (not the commonest, not the rarest), asked for their meaning. A unit whose
 * two words are both known is offered as its unit test first.
 */
export function verbaPlacement(): Array<{ unit: string; step: ChoiceStep }> {
  return VERBA_UNITS.flatMap((spec) => {
    const words = verbaWords(spec.n);
    const byUse = [...words].sort((a, b) => b.readings.length - a.readings.length || a.id.localeCompare(b.id));
    const picks = [byUse[Math.floor(byUse.length * 0.3)], byUse[Math.floor(byUse.length * 0.55)]];
    const seed = `placement-verba-${spec.n}`;
    const random = rng(seed);
    const slot = slots(seed);
    return picks.map((w) => ({ unit: `verba-${spec.n}`, step: meaningOf(w, words, random, slot()) }));
  });
}
