import type { Passage, UnitId } from '../types';
import { vergilPassages } from './vergil';
import { plinyPassages } from './pliny';

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

export const UNIT_TITLES: Record<UnitId, string> = {
  '1': 'Teacher’s Choice — Latin Prose',
  '2': 'Pliny’s Letters: Eruption of Mt. Vesuvius',
  '3': 'Pliny’s Letters: Ghosts, Trajan, and Calpurnia',
  '4': 'Teacher’s Choice Poetry and Aeneid 1–2',
  '5': 'Aeneid, Books 4, 6, 7, 11, and 12',
  '6': 'Course Project and Teacher’s Choice Poetry',
};
