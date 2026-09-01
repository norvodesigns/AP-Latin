import type { Passage, UnitId } from '../types';
import { vergilPassages } from './vergil';
import { plinyPassages } from './pliny';
import { coreVocabulary } from '../vocabulary';
import { normalizeWord } from '../../lib/latin';

export const allPassages: Passage[] = [...plinyPassages, ...vergilPassages].sort((a, b) => {
  // Required first, then by unit, then by book/line so the list reads like the syllabus.
  if (a.required !== b.required) return a.required ? -1 : 1;
  if (a.unit !== b.unit) return a.unit < b.unit ? -1 : 1;
  if (a.book !== b.book) return a.book - b.book;
  const an = a.lines[0]?.n ?? 0;
  const bn = b.lines[0]?.n ?? 0;
  return an - bn;
});

export const requiredPassages = allPassages.filter((p) => p.required);
export const supplementaryPassages = allPassages.filter((p) => !p.required);

export { vergilPassages, plinyPassages };

export function getPassage(id: string): Passage | undefined {
  return allPassages.find((p) => p.id === id);
}

export function passagesByUnit(unit: UnitId): Passage[] {
  return allPassages.filter((p) => p.unit === unit);
}

/** Full Latin of a passage as a single string, lines joined by newline. */
export function passageText(p: Passage): string {
  return p.lines.map((l) => l.latin).join('\n');
}

/** Lines within an inclusive citation range. */
export function linesInRange(p: Passage, from: number, to: number) {
  return p.lines.filter((l) => l.n >= from && l.n <= to);
}

/**
 * Core-vocabulary ids relevant to a passage: the CED tags a word with the
 * reading it is introduced in, so for a passage with a `cedReading` this is
 * exact. Supplementary passages carry no reading tag, so their vocabulary is
 * derived from which core headwords actually occur in the text — the same
 * fallback the Vocabulary page uses, kept here so both stay consistent.
 *
 * Powers the Reading Room's per-passage coverage meter (antiq.ai-style:
 * vocabulary tracked from what you read, not a static list) and the
 * Vocabulary page's passage filter.
 */
const vocabIdCache = new Map<string, string[]>();

export function passageVocabIds(p: Passage): string[] {
  const cached = vocabIdCache.get(p.id);
  if (cached) return cached;

  let ids: string[];
  if (p.cedReading) {
    ids = coreVocabulary.filter((e) => e.readings.includes(p.cedReading!)).map((e) => e.id);
  } else {
    const words = new Set(
      p.lines.flatMap((l) => l.latin.split(/[^A-Za-zÀ-ÿĀ-ſ]+/).map(normalizeWord)).filter(Boolean),
    );
    ids = coreVocabulary.filter((e) => words.has(normalizeWord(e.headword))).map((e) => e.id);
  }
  vocabIdCache.set(p.id, ids);
  return ids;
}

export const UNIT_TITLES: Record<UnitId, string> = {
  '1': 'Teacher’s Choice — Latin Prose',
  '2': 'Pliny’s Letters: Eruption of Mt. Vesuvius',
  '3': 'Pliny’s Letters: Ghosts, Trajan, and Calpurnia',
  '4': 'Teacher’s Choice Poetry and Aeneid 1–2',
  '5': 'Aeneid, Books 4, 6, 7, 11, and 12',
  '6': 'Course Project and Teacher’s Choice Poetry',
};
