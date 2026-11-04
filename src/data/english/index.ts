import type { Passage } from '../types';
import { caesarEnglish } from './caesar';
import { catullusEnglish } from './catullus';
import { plinyEnglish } from './pliny';
import { vergilEnglish } from './vergil';

/**
 * Line-numbered literal translations, by passage id and then by the
 * passage's own line (verse) or section (prose) numbers. Server-side only:
 * a passage page passes its own translation to the Reader as a prop, so the
 * whole set never ships to the browser.
 */
export const englishByPassage: Record<string, Record<number, string>> = {
  ...vergilEnglish,
  ...plinyEnglish,
  ...caesarEnglish,
  ...catullusEnglish,
};

/** The translation of one passage, keyed by line number, or undefined if it
 *  has none yet. */
export function englishFor(passage: Pick<Passage, 'id'>): Record<number, string> | undefined {
  return englishByPassage[passage.id];
}
