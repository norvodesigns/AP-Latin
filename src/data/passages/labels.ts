import type { Passage } from '../types';

/*
 * How a passage is named and cited, kept apart from the passage data so a
 * client component can use it without shipping every passage's text.
 */

/** Whether a passage is cited by line (verse, the Course Project's prose,
 *  and a text the reader imported) or by section (Pliny, Caesar). */
export function citesByLine(p: Pick<Passage, 'genre' | 'project' | 'imported'>): boolean {
  return p.genre === 'poetry' || !!p.project || !!p.imported;
}

const AUTHOR_NAMES: Record<string, string> = { vergil: 'Vergil', pliny: 'Pliny', caesar: 'Caesar', catullus: 'Catullus' };

/** The author's name as a reader would write it: "Vergil", "Augustine". */
export function authorLabel(p: Pick<Passage, 'author' | 'authorName'>): string {
  return p.authorName ?? AUTHOR_NAMES[p.author] ?? p.author;
}

/** "line" or "section", as the passage is cited. */
export function lineWord(p: Pick<Passage, 'genre' | 'project' | 'imported'>): 'line' | 'section' {
  return citesByLine(p) ? 'line' : 'section';
}
