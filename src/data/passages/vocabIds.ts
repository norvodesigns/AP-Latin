import type { Passage } from '../types';
import { coreVocabulary } from '../vocabulary';
import { normalizeWord } from '../../lib/latin';

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
