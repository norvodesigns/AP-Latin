/**
 * The Reader's marks on the text: highlight pigments, sentence-part marks,
 * and the small helpers the store, the merge and the print sheet share.
 * Pure data and functions, so the merge (and its parity fixtures) can use it
 * without loading the store.
 */
import type { Annotation, HighlightColor, Pigment, SyntaxMark, SyntaxRole } from '@/store/useStore';

/** The original colour each pigment falls back to on a 1.0 or 1.1 app. */
export const LEGACY_COLOR: Record<Pigment, HighlightColor> = {
  gilt: 'gilt',
  verdigris: 'verdigris',
  woad: 'woad',
  rubric: 'rubric',
  minium: 'gilt',
  madder: 'rubric',
  murex: 'rubric',
  azurite: 'woad',
};

/** The highlighter's pigments in the order the toolbar offers them, each with
 *  its everyday colour name, since few readers know what minium is. */
export const PIGMENTS: { id: Pigment; label: string; plain: string }[] = [
  { id: 'gilt', label: 'Gilt', plain: 'gold' },
  { id: 'minium', label: 'Minium', plain: 'orange' },
  { id: 'rubric', label: 'Rubric', plain: 'red' },
  { id: 'madder', label: 'Madder', plain: 'pink' },
  { id: 'murex', label: 'Murex', plain: 'purple' },
  { id: 'woad', label: 'Woad', plain: 'blue' },
  { id: 'azurite', label: 'Azurite', plain: 'sky blue' },
  { id: 'verdigris', label: 'Verdigris', plain: 'green' },
];

/** The pigment a highlight shows, or null when it is a note with no colour. */
export function pigmentOf(a: Pick<Annotation, 'color' | 'pigment'>): Pigment | null {
  if (!a.color) return null;
  return a.pigment ?? a.color;
}

/**
 * How many things of the reader's own a passage carries: each highlight or
 * note, each sentence mark (a phrase marked across lines counts once), and
 * the notes on the passage as a whole. A cold read hides them all and says
 * how many it is keeping. The same count as `PassageState.markupCount` in
 * LectioCore and on Android.
 */
export function markupCount(
  annotations: Pick<Annotation, 'id' | 'group' | 'color' | 'note'>[],
  marks: Pick<SyntaxMark, 'id' | 'group'>[],
  passageNotes = '',
): number {
  const groups = (xs: { id: string; group?: string }[]) => new Set(xs.map((x) => x.group ?? x.id)).size;
  return groups(annotations.filter((a) => a.color || a.note.trim())) + groups(marks) + (passageNotes.trim() ? 1 : 0);
}

/** Newest edit of an annotation or mark: `updatedAt`, else `createdAt`. */
export const stampOf = (x: { createdAt: string; updatedAt?: string }) => x.updatedAt ?? x.createdAt;

/** The `removed` key for an annotation (`a`) or a mark (`m`). */
export const removedKey = (kind: 'a' | 'm', x: { lineN: number; startTok: number; endTok: number }) =>
  `${kind}:${x.lineN}:${x.startTok}:${x.endTok}`;

/** Removal records kept per passage: the oldest go first. */
export const REMOVED_CAP = 300;

export type RoleGroup = 'sentence' | 'case' | 'construction';

export interface RoleInfo {
  id: SyntaxRole;
  /** What prints under the words: S, V, DO, abl… */
  short: string;
  label: string;
  group: RoleGroup;
  /** A one-line reminder of how to spot it, shown in the picker. */
  hint: string;
}

/**
 * The sentence parts a reader can mark, in the order the picker shows them:
 * the core of the sentence first, then the cases, then the constructions the
 * exam asks about by name.
 */
export const SYNTAX_ROLES: RoleInfo[] = [
  { id: 'subject', short: 'S', label: 'Subject', group: 'sentence', hint: 'Who or what does the action; nominative' },
  { id: 'verb', short: 'V', label: 'Verb', group: 'sentence', hint: 'The main verb of the clause' },
  { id: 'object', short: 'DO', label: 'Direct object', group: 'sentence', hint: 'Receives the action; accusative' },
  { id: 'indirect', short: 'IO', label: 'Indirect object', group: 'sentence', hint: 'To or for whom; dative' },
  { id: 'nominative', short: 'nom', label: 'Nominative', group: 'case', hint: 'Subject, or predicate after sum' },
  { id: 'genitive', short: 'gen', label: 'Genitive', group: 'case', hint: 'of; possession, part of a whole' },
  { id: 'dative', short: 'dat', label: 'Dative', group: 'case', hint: 'to, for; also with compounds and special verbs' },
  { id: 'accusative', short: 'acc', label: 'Accusative', group: 'case', hint: 'Object, extent, place to which, subject of an infinitive' },
  { id: 'ablative', short: 'abl', label: 'Ablative', group: 'case', hint: 'by, with, from, in, on; means, manner, place where' },
  { id: 'vocative', short: 'voc', label: 'Vocative', group: 'case', hint: 'Someone addressed directly' },
  { id: 'participle', short: 'ptc', label: 'Participle', group: 'construction', hint: 'A verbal adjective; find the noun it agrees with' },
  { id: 'infinitive', short: 'inf', label: 'Infinitive', group: 'construction', hint: 'Complementary, or indirect statement' },
  { id: 'ablAbs', short: 'abl abs', label: 'Ablative absolute', group: 'construction', hint: 'Noun and participle in the ablative, apart from the sentence' },
  { id: 'prep', short: 'prep', label: 'Prepositional phrase', group: 'construction', hint: 'A preposition and its object' },
  { id: 'clause', short: '[ ]', label: 'Subordinate clause', group: 'construction', hint: 'cum, ut, quī, sī, dum… to its verb' },
];

export const ROLE_INFO: Record<SyntaxRole, RoleInfo> = Object.fromEntries(
  SYNTAX_ROLES.map((r) => [r.id, r]),
) as Record<SyntaxRole, RoleInfo>;
