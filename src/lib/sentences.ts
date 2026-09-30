/**
 * Sentence builder: eight sentences from the course, built from tiles.
 * Where Forms Forge knows other forms of at least two of a sentence's words,
 * the student builds the Latin from its English, in any order (Latin allows
 * it), with those other forms as decoys, so the endings are what's tested.
 * Otherwise they build the English from the Latin. The app builds the same
 * round (LectioCore `Course.sentencesLesson`).
 */

import { ALL_LESSONS, type BuildStep, type Lesson } from '@/data/curriculum';
import { PARADIGMS, cellForms } from '@/data/forms';
import { foldLatin } from '@/lib/lessonCheck';

export const SENTENCES_PREFIX = 'sentences-';
export const SENTENCES_LENGTH = 8;

type Rng = () => number;

interface Source {
  lessonId: string;
  latin: string;
  english: string;
}

/** Every translate exercise in the course: a Latin sentence and its English. */
const SOURCES: Source[] = ALL_LESSONS.flatMap((p) =>
  p.lesson.steps.flatMap((s) => (s.kind === 'translate' ? [{ lessonId: p.lesson.id, latin: s.latin, english: s.answers[0] }] : [])),
);

/** Forms Forge's forms: each form (folded) -> the other one-word forms of its tables. */
const OTHER_FORMS: ReadonlyMap<string, string[]> = (() => {
  const out = new Map<string, Set<string>>();
  for (const p of PARADIGMS) {
    const forms = p.rows.flatMap((r) => r.cells.flatMap(cellForms)).filter((f) => !f.includes(' '));
    for (const f of forms) {
      const key = foldLatin(f);
      const set = out.get(key) ?? new Set<string>();
      for (const g of forms) if (foldLatin(g) !== key) set.add(g);
      out.set(key, set);
    }
  }
  return new Map([...out].map(([k, v]) => [k, [...v]]));
})();

/** A sentence's words, without punctuation. */
export function sentenceWords(text: string): string[] {
  return text
    .split(/\s+/)
    .map((w) => w.replace(/[.,;:!?“”"‘’()—–]/g, ''))
    .filter(Boolean);
}

/** Other forms Forms Forge knows for a word, capitalised like it. */
export function otherForms(word: string): string[] {
  const forms = OTHER_FORMS.get(foldLatin(word)) ?? [];
  const cap = word[0] !== word[0].toLowerCase();
  return forms.map((f) => (cap ? f[0].toUpperCase() + f.slice(1) : f));
}

const PLAIN = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'am', 'be', 'been', 'do', 'does', 'did', 'have', 'has', 'had', 'will', 'would',
  'can', 'could', 'and', 'or', 'of', 'to', 'in', 'on', 'at', 'by', 'with', 'from', 'not', 'but', 'i', 'you', 'we', 'he', 'she',
  'it', 'they', 'me', 'us', 'him', 'them', 'his', 'her', 'its', 'our', 'your', 'their', 'this', 'that', 'these', 'those',
]);
const foldEn = (w: string) => w.toLowerCase().replace(/[^a-z0-9']/g, '');

/** Every English word the course's translations use, to keep near misses real words. */
const ENGLISH_WORDS: ReadonlySet<string> = new Set(SOURCES.flatMap((s) => sentenceWords(s.english).map((w) => w.toLowerCase())));

/**
 * An English word one ending away, the way a Latin ending changes number or
 * person: sailors / sailor, sees / see, city / cities. Only a word the
 * course's own English uses, so never a non-word like "bigs".
 */
export function nearMiss(word: string): string | null {
  const w = word.toLowerCase();
  if (w !== word || w.length < 3 || PLAIN.has(w) || !/^[a-z]+$/.test(w)) return null;
  let m: string | null;
  if (/[^aeiou]ies$/.test(w)) m = w.slice(0, -3) + 'y';
  else if (/(ches|shes|xes|oes)$/.test(w)) m = w.slice(0, -2);
  else if (/(ss|us|is|os)$/.test(w)) m = null;
  else if (w.endsWith('s')) m = w.slice(0, -1);
  else if (/[^aeiou]y$/.test(w)) m = w.slice(0, -1) + 'ies';
  else if (/(ch|sh|x|o)$/.test(w)) m = w + 'es';
  else m = w + 's';
  return m && ENGLISH_WORDS.has(m) ? m : null;
}

/** Whether Forms Forge can supply wrong forms for at least two of a sentence's words. */
function latinTestable(s: Source): boolean {
  return sentenceWords(s.latin).filter((w) => otherForms(w).length > 0).length >= 2;
}

function shuffle<T>(list: T[], rng: Rng): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** One sentence as a build step: the Latin if its endings can be tested, else the English. */
export function sentenceStep(s: Source, rng: Rng): BuildStep {
  const latin = sentenceWords(s.latin);
  const english = sentenceWords(s.english);
  const taken = new Set(latin.map(foldLatin));
  const decoys: string[] = [];
  for (const w of shuffle(latin, rng)) {
    const options = otherForms(w).filter((f) => !taken.has(foldLatin(f)));
    if (options.length === 0) continue;
    const d = options[Math.floor(rng() * options.length)];
    taken.add(foldLatin(d));
    decoys.push(d);
    if (decoys.length === 3) break;
  }
  if (decoys.length >= 2) {
    return {
      kind: 'build',
      prompt: 'Build the Latin, in any order.',
      source: s.english,
      lang: 'la',
      answer: latin,
      extra: decoys,
      anyOrder: true,
      explain: `*${s.latin}* Any order is good Latin, so long as the endings are right.`,
    };
  }
  const have = new Set(english.map(foldEn));
  const extra: string[] = [];
  // Near misses first (sailor for sailors), then a word from elsewhere.
  for (const w of shuffle(english, rng)) {
    const m = nearMiss(w);
    if (!m || have.has(foldEn(m))) continue;
    have.add(foldEn(m));
    extra.push(m);
    if (extra.length === 2) break;
  }
  const pool = shuffle(
    SOURCES.flatMap((o) => (o === s ? [] : sentenceWords(o.english))).filter((w) => !PLAIN.has(foldEn(w))),
    rng,
  );
  for (const w of pool) {
    const k = foldEn(w);
    if (!k || have.has(k)) continue;
    have.add(k);
    extra.push(w.toLowerCase());
    if (extra.length === 3) break;
  }
  return {
    kind: 'build',
    prompt: 'Build the English.',
    source: s.latin,
    lang: 'en',
    answer: english,
    extra,
    explain: `*${s.latin}* ${s.english}`,
  };
}

/**
 * A round of sentences from finished lessons; with too few, the first
 * lessons of the course fill it up.
 */
export function sentencesLesson(done: Record<string, unknown>, rng: Rng = Math.random, length = SENTENCES_LENGTH): Lesson {
  const short = SOURCES.filter((s) => sentenceWords(s.latin).length <= 8);
  const known = short.filter((s) => done[s.lessonId]);
  const pool = known.length >= length ? known : [...known, ...short.filter((s) => !done[s.lessonId]).slice(0, 30)];
  // Half the round builds Latin where the sentences allow it.
  const mixed = shuffle(pool, rng);
  const latin = mixed.filter(latinTestable).slice(0, Math.floor(length / 2));
  const chosen = shuffle([...latin, ...mixed.filter((s) => !latin.includes(s))].slice(0, length), rng);
  const steps = chosen.map((s) => sentenceStep(s, rng));
  return {
    id: `${SENTENCES_PREFIX}${Math.floor(rng() * 1e9)}`,
    title: 'Sentence builder',
    summary: 'Eight sentences from the course, built from tiles: the Latin from its English, or the English from its Latin.',
    minutes: 5,
    objectives: ['Put endings to work: the right form of each word', 'Read a Latin sentence as a whole'],
    words: [],
    steps,
  };
}

export function isSentencesId(id: string): boolean {
  return id.startsWith(SENTENCES_PREFIX);
}
