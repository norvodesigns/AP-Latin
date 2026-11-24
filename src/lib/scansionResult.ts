/**
 * A checked line, graded again from what the student did, so that a scan can
 * be shown long after it was made: the Scansion Lab's own rules (see
 * ScansionLab.tsx `check`), kept here without the UI so the history page and
 * the lab agree. The iPhone app's `ScansionWork` and the Android app's port
 * do the same.
 *
 * Three things count: every syllable's quantity, the five foot divisions, and
 * the elision judgment at every word junction where one is possible.
 */

import type { ScansionLine } from '@/data/types';
import type { ScansionAttempt, ScansionDraft } from '@/store/useStore';

export type Mark = 'long' | 'short' | null;

/** What the student had on the line when they checked it. */
export interface ScansionWork {
  /** One per syllable, elided ones included. */
  marks: Mark[];
  /** Raw syllable indices after which the student ruled a foot boundary. */
  divisions: number[];
  /** Syllable indices the student claimed elide into the next word. */
  elisions: number[];
}

/* ------------------------------------------------------------------ */
/* Storage                                                             */
/* ------------------------------------------------------------------ */

/**
 * Marks as they are kept on an attempt: one character a syllable, `L` long,
 * `S` short, `.` unmarked. An attempt is kept for every check, up to a
 * thousand, and synced; a short string costs a fraction of the array a draft
 * keeps.
 */
export function packMarks(marks: Mark[]): string {
  return marks.map((m) => (m === 'long' ? 'L' : m === 'short' ? 'S' : '.')).join('');
}

export function unpackMarks(packed: string): Mark[] {
  return [...packed].map((c) => (c === 'L' ? 'long' : c === 'S' ? 'short' : null));
}

/** The fields `recordScansion` adds to an attempt for the work behind it. */
export function workFields(work: ScansionWork): Pick<ScansionAttempt, 'marks' | 'divisions' | 'elisions'> {
  return {
    marks: packMarks(work.marks),
    divisions: [...work.divisions].sort((a, b) => a - b),
    elisions: [...work.elisions].sort((a, b) => a - b),
  };
}

/**
 * The work behind an attempt, if it can be known.
 *
 * Scans checked since the history was added carry their marks. Older ones
 * carry only a score, but the line's draft, once checked, holds the marks of
 * the latest check on that line — so it stands in for the latest attempt on
 * each line, as long as it grades to the very score that attempt recorded.
 * Anything that does not fit the line as the corpus now has it is dropped
 * rather than shown wrongly.
 */
export function workForAttempt(
  attempt: ScansionAttempt,
  line: ScansionLine,
  { latestOnLine, draft }: { latestOnLine: boolean; draft?: ScansionDraft },
): ScansionWork | null {
  const n = line.syllables.length;
  if (typeof attempt.marks === 'string') {
    if (attempt.marks.length !== n) return null;
    return {
      marks: unpackMarks(attempt.marks),
      divisions: attempt.divisions ?? [],
      elisions: attempt.elisions ?? [],
    };
  }
  if (!latestOnLine || !draft?.checked || draft.marks.length !== n) return null;
  const work: ScansionWork = {
    marks: draft.marks,
    divisions: draft.divisions,
    elisions: draft.elisions ?? [],
  };
  const { score } = gradeScansion(line, work);
  return score.correct === attempt.correct && score.total === attempt.total ? work : null;
}

/* ------------------------------------------------------------------ */
/* Grading                                                             */
/* ------------------------------------------------------------------ */

export type SyllableResult = 'ok' | 'wrong' | 'blank' | 'wrong-elision';

export interface ScansionScore {
  syllables: number;
  syllablesTotal: number;
  boundaries: number;
  boundariesTotal: number;
  elisions: number;
  elisionsTotal: number;
  correct: number;
  total: number;
}

export interface GradedScansion {
  /** Per syllable, against the real answer. A truly elided syllable is
   *  `ok` unmarked and `wrong-elision` if the student gave it a quantity. */
  syllables: SyllableResult[];
  /** Syllables that count metrically, per the real answer. */
  metrical: number[];
  /** Raw syllable indices after which the metre puts a foot boundary. */
  correctDivisions: number[];
  /** Whether the student's boundary after raw syllable `i` is a real one. */
  boundaryRight: (after: number) => boolean;
  /** Every word junction where elision was a question. */
  junctions: Array<{ at: number; claimed: boolean; elides: boolean }>;
  score: ScansionScore;
}

/** True when syllable `i` ends its word (the next one starts a new word, or there is none). */
function isWordFinal(line: ScansionLine, i: number): boolean {
  const next = line.syllables[i + 1];
  return !next || next.startsWord !== false;
}

/** The final syllable is anceps: either mark is right there. */
function quantityRight(line: ScansionLine, marks: Mark[], i: number): boolean {
  const m = marks[i];
  if (m === null || m === undefined) return false;
  if (line.syllables[i].anceps) return true;
  return m === line.syllables[i].quantity;
}

export function gradeScansion(line: ScansionLine, work: ScansionWork): GradedScansion {
  const { marks, divisions } = work;
  const claimed = new Set(work.elisions);

  const metrical = line.syllables.map((s, i) => (s.elides ? -1 : i)).filter((i) => i >= 0);

  // The metre's boundaries in metrical terms, then as raw syllable indices.
  const correctMetrical: number[] = [];
  let acc = -1;
  for (const f of line.feet.slice(0, -1)) {
    acc += f === 'dactyl' ? 3 : 2;
    correctMetrical.push(acc);
  }
  const correctDivisions = correctMetrical.map((m) => metrical[m]).filter((i) => i !== undefined);

  const boundaryRight = (after: number) => correctMetrical.includes(metrical.indexOf(after));

  const syllables: SyllableResult[] = line.syllables.map((s, i) => {
    if (s.elides) return marks[i] === null || marks[i] === undefined ? 'ok' : 'wrong-elision';
    if (quantityRight(line, marks, i)) return 'ok';
    return marks[i] === null || marks[i] === undefined ? 'blank' : 'wrong';
  });

  const junctions = line.syllables
    .map((_, i) => i)
    .filter((i) => i < line.syllables.length - 1 && isWordFinal(line, i))
    .map((i) => ({ at: i, claimed: claimed.has(i), elides: Boolean(line.syllables[i].elides) }));

  const syllablesRight = metrical.filter((i) => quantityRight(line, marks, i)).length;
  const boundariesRight = divisions.filter(boundaryRight).length;
  const elisionsRight = junctions.filter((j) => j.claimed === j.elides).length;

  const score: ScansionScore = {
    syllables: syllablesRight,
    syllablesTotal: metrical.length,
    boundaries: boundariesRight,
    boundariesTotal: correctMetrical.length,
    elisions: elisionsRight,
    elisionsTotal: junctions.length,
    correct: syllablesRight + boundariesRight + elisionsRight,
    total: metrical.length + correctMetrical.length + junctions.length,
  };

  return { syllables, metrical, correctDivisions, boundaryRight, junctions, score };
}

/** The line scanned correctly, as if a student had done it perfectly. */
export function answerFor(line: ScansionLine): ScansionWork {
  const graded = gradeScansion(line, { marks: [], divisions: [], elisions: [] });
  return {
    marks: line.syllables.map((s) => (s.elides ? null : s.quantity)),
    divisions: graded.correctDivisions,
    elisions: line.syllables.map((s, i) => (s.elides ? i : -1)).filter((i) => i >= 0),
  };
}

/**
 * Why a syllable has the quantity it has, in a sentence — shown wherever a
 * wrong mark is explained.
 */
export function explainQuantity(line: ScansionLine, i: number): string {
  const syl = line.syllables[i];
  if (syl.anceps) {
    return 'It closes the line, so it is anceps: it counts long whatever its real quantity is.';
  }
  const hasMacron = /[āēīōūȳĀĒĪŌŪȲ]/.test(syl.text);
  const isDiphthong = /ae|au|oe/i.test(syl.text);

  if (syl.quantity === 'long') {
    if (isDiphthong) return 'It contains a diphthong, which is always long by nature.';
    if (hasMacron) return 'The text marks the vowel long with a macron, so it is long by nature.';
    const next = line.syllables.slice(i + 1).find((s) => s.text)?.text ?? '';
    if (/^[bcdfgjklmnpqrstvxz]{2}/i.test(next) || /[bcdfgjklmnpqrstvxz]{2}$/i.test(syl.text)) {
      return 'The vowel is followed by two or more consonants, so it is long by position.';
    }
    return 'Nothing in the spelling shows it, but no other foot division fits the line — so this syllable has to be long by nature.';
  }
  return 'It sits in a short position, and nothing closes it or makes it long by nature.';
}

/* ------------------------------------------------------------------ */
/* History                                                             */
/* ------------------------------------------------------------------ */

/** Accuracy of an attempt, 0 to 1. */
export function accuracy(a: Pick<ScansionAttempt, 'correct' | 'total'>): number {
  return a.total > 0 ? a.correct / a.total : 0;
}

/** For each attempt id, which try at its line it was (1 for the first). */
export function tryNumbers(attempts: ScansionAttempt[]): Map<string, number> {
  const seen = new Map<string, number>();
  const out = new Map<string, number>();
  for (const a of attempts) {
    const n = (seen.get(a.lineId) ?? 0) + 1;
    seen.set(a.lineId, n);
    out.set(a.id, n);
  }
  return out;
}

/** The id of the most recent attempt on each line. */
export function latestAttemptIds(attempts: ScansionAttempt[]): Set<string> {
  const byLine = new Map<string, string>();
  for (const a of attempts) byLine.set(a.lineId, a.id);
  return new Set(byLine.values());
}
