import type { Passage } from '../types';

/*
 * How a passage is named and cited, kept apart from the passage data so a
 * client component can use it without shipping every passage's text.
 */

/** Whether a passage is cited by line (verse, and the Course Project's
 *  prose) or by section (Pliny, Caesar). */
export function citesByLine(p: Pick<Passage, 'genre' | 'project'>): boolean {
  return p.genre === 'poetry' || !!p.project;
}

const AUTHOR_NAMES: Record<string, string> = { vergil: 'Vergil', pliny: 'Pliny', caesar: 'Caesar', catullus: 'Catullus' };

/** The author's name as a reader would write it: "Vergil", "Augustine". */
export function authorLabel(p: Pick<Passage, 'author' | 'authorName'>): string {
  return p.authorName ?? AUTHOR_NAMES[p.author] ?? p.author;
}

/** "line" or "section", as the passage is cited. */
export function lineWord(p: Pick<Passage, 'genre' | 'project'>): 'line' | 'section' {
  return citesByLine(p) ? 'line' : 'section';
}
