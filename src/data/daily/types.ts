import type { ChoiceStep, ExerciseStep } from '../curriculum/types';

/**
 * Sententia of the day: one famous line of Latin, the words you may not
 * know, and three quick questions (what it says, a point of grammar, an
 * English word descended from it). Everyone gets the same line on the same
 * day; see `src/lib/daily.ts`.
 *
 * Markup as in lessons: `*italic*` in the source, note and questions. The
 * Latin, the English and the glosses are plain text.
 */
export interface Sententia {
  id: string;
  latin: string;
  english: string;
  /** Who wrote or said it, and where. */
  source: string;
  /** Two or three sentences of context, shown once the questions are done. */
  note: string;
  gloss: Array<{ word: string; meaning: string }>;
  steps: ExerciseStep[];
}

/** A stable, spread-out position for the right answer, from the prompt's text. */
function slot(text: string, n: number): number {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.codePointAt(0)!) >>> 0;
  return h % n;
}

/**
 * A multiple-choice question, written right answer first; the right answer
 * is moved to a fixed but unpredictable place among the others.
 */
export function ask(prompt: string, right: string, wrong: string[], explain: string, latin?: string): ChoiceStep {
  const at = slot(prompt + right, wrong.length + 1);
  const options = [...wrong];
  options.splice(at, 0, right);
  return { kind: 'choice', prompt, ...(latin ? { latin } : {}), options, answer: at, explain };
}
