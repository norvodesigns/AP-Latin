/**
 * Speed round: a minute of matching Latin words to their meanings, five
 * pairs to a board. A wrong pair costs two seconds and puts the word on the
 * list to look at afterwards. The app plays the same game (LectioCore
 * `SpeedRound`), with the same short glosses.
 */

import type { VocabEntry } from '@/data/types';

export const SPEED_SECONDS = 60;
export const BOARD_SIZE = 5;
export const MISS_PENALTY_SECONDS = 2;

export interface SpeedWord {
  id: string;
  latin: string;
  english: string;
}

/**
 * A dictionary definition cut down to fit a tile: the first group of senses
 * (before any semicolon), without notes in brackets, at most two senses, and
 * one if two would be long.
 */
export function shortGloss(definition: string): string {
  const first = definition.split(';')[0].replace(/\[[^\]]*\]|\([^)]*\)/g, '');
  const senses = first
    .split(',')
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  if (senses.length === 0) return definition.trim();
  const two = senses.slice(0, 2).join(', ');
  return two.length <= 26 || senses.length === 1 ? two : senses[0];
}

/**
 * The words a round can use: no proper names, none whose meaning just
 * repeats the Latin (gladiator, "gladiator"), and no two with the same short
 * gloss (so every board has exactly one right answer per word).
 */
export function speedWords(entries: VocabEntry[]): SpeedWord[] {
  const seen = new Set<string>();
  const out: SpeedWord[] = [];
  for (const e of entries) {
    if (/^[A-Z]/.test(e.headword)) continue;
    const english = shortGloss(e.definition);
    const key = english.toLowerCase();
    if (!english || seen.has(key) || key.includes(e.headword.toLowerCase())) continue;
    seen.add(key);
    out.push({ id: e.id, latin: e.headword, english });
  }
  return out;
}

/** A board: `size` words from the pool, and their meanings in another order. */
export function dealBoard(
  pool: SpeedWord[],
  size = BOARD_SIZE,
  rng: () => number = Math.random,
): { left: SpeedWord[]; right: SpeedWord[] } {
  const bag = [...pool];
  const left: SpeedWord[] = [];
  const latin = new Set<string>();
  while (left.length < size && bag.length > 0) {
    const w = bag.splice(Math.floor(rng() * bag.length), 1)[0];
    if (latin.has(w.latin)) continue;
    latin.add(w.latin);
    left.push(w);
  }
  const right = [...left];
  for (let i = right.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [right[i], right[j]] = [right[j], right[i]];
  }
  // Never leave every meaning beside its own word.
  if (right.length > 1 && right.every((w, i) => w.id === left[i].id)) right.push(right.shift()!);
  return { left, right };
}
