/**
 * What the reader has selected on a passage, and how a selection turns into
 * the one-line anchors highlights and marks are stored as.
 *
 * A selection runs from one word to another anywhere in the passage, across
 * line breaks if need be — a Vergilian phrase very often runs on. It is
 * stored as one piece per line (see `Annotation.group`), each an ordinary
 * line number plus token range that `tokenize()` reproduces on every
 * platform.
 */
import type { Passage } from '@/data/types';
import { tokenize, type Token } from './tokenize';

export interface Point {
  lineN: number;
  tok: number;
}

/** Start and end, inclusive, start never after end in reading order. */
export interface Range {
  start: Point;
  end: Point;
}

/** One line's share of a selection: what gets stored. */
export interface Piece {
  lineN: number;
  startTok: number;
  endTok: number;
  text: string;
}

const tokenCache = new WeakMap<Passage, Map<number, Token[]>>();

/** The passage's tokens for one line, split once. */
export function lineTokens(passage: Passage, lineN: number): Token[] {
  let byLine = tokenCache.get(passage);
  if (!byLine) {
    byLine = new Map();
    tokenCache.set(passage, byLine);
  }
  let toks = byLine.get(lineN);
  if (!toks) {
    const line = passage.lines.find((l) => l.n === lineN);
    toks = line ? tokenize(line.latin) : [];
    byLine.set(lineN, toks);
  }
  return toks;
}

function lineIndex(passage: Passage, lineN: number): number {
  return passage.lines.findIndex((l) => l.n === lineN);
}

function before(passage: Passage, a: Point, b: Point): boolean {
  const ia = lineIndex(passage, a.lineN);
  const ib = lineIndex(passage, b.lineN);
  return ia < ib || (ia === ib && a.tok < b.tok);
}

/** The range between two points, whichever order they were picked in. */
export function rangeBetween(passage: Passage, a: Point, b: Point): Range {
  return before(passage, b, a) ? { start: b, end: a } : { start: a, end: b };
}

export function samePoint(a: Point, b: Point): boolean {
  return a.lineN === b.lineN && a.tok === b.tok;
}

export function sameRange(a: Range | null, b: Range | null): boolean {
  return Boolean(a && b && samePoint(a.start, b.start) && samePoint(a.end, b.end));
}

/** The selection's pieces, one per line, each trimmed to start and end on a
 *  word, so a stray space or comma at either end is never part of a mark. */
export function piecesOf(passage: Passage, range: Range): Piece[] {
  const from = lineIndex(passage, range.start.lineN);
  const to = lineIndex(passage, range.end.lineN);
  if (from < 0 || to < 0) return [];
  const out: Piece[] = [];
  for (let i = from; i <= to; i++) {
    const lineN = passage.lines[i].n;
    const toks = lineTokens(passage, lineN);
    let s = i === from ? range.start.tok : 0;
    let e = i === to ? range.end.tok : toks.length - 1;
    while (s <= e && !toks[s]?.isWord) s++;
    while (e >= s && !toks[e]?.isWord) e--;
    if (s > e) continue;
    out.push({
      lineN,
      startTok: s,
      endTok: e,
      text: toks.slice(s, e + 1).map((t) => t.text).join(''),
    });
  }
  return out;
}

/** The selected words as one string, lines joined by a space. */
export function piecesText(pieces: Piece[]): string {
  return pieces.map((p) => p.text).join(' ');
}

/** Is token `tok` of line `lineN` inside the range? */
export function inRange(passage: Passage, range: Range, lineN: number, tok: number): boolean {
  const p = { lineN, tok };
  return !before(passage, p, range.start) && !before(passage, range.end, p);
}

/** The token range a selection covers on one line, or null if it misses it. */
export function rangeOnLine(passage: Passage, range: Range, lineN: number): [number, number] | null {
  const piece = piecesOf(passage, range).find((p) => p.lineN === lineN);
  return piece ? [piece.startTok, piece.endTok] : null;
}

type Anchored = { lineN: number; startTok: number; endTok: number; group?: string };

/** For each piece, the stored record on exactly that span, if any. */
export function matchPieces<T extends Anchored>(pieces: Piece[], items: T[]): (T | undefined)[] {
  return pieces.map((p) =>
    items.find((x) => x.lineN === p.lineN && x.startTok === p.startTok && x.endTok === p.endTok),
  );
}

/** Every record in the same group as `x` (just `x` when it has none),
 *  in reading order. */
export function groupOf<T extends Anchored>(x: T, items: T[]): T[] {
  if (!x.group) return [x];
  return items
    .filter((y) => y.group === x.group)
    .sort((a, b) => a.lineN - b.lineN || a.startTok - b.startTok);
}

/** The range that selects `x` and the rest of its group. */
export function rangeOfGroup<T extends Anchored>(passage: Passage, x: T, items: T[]): Range {
  const all = groupOf(x, items).sort(
    (a, b) => lineIndex(passage, a.lineN) - lineIndex(passage, b.lineN) || a.startTok - b.startTok,
  );
  const first = all[0];
  const last = all[all.length - 1];
  return { start: { lineN: first.lineN, tok: first.startTok }, end: { lineN: last.lineN, tok: last.endTok } };
}

/** Records covering token `tok` on line `lineN`. */
export function covering<T extends Anchored>(items: T[], lineN: number, tok: number): T[] {
  return items.filter((x) => x.lineN === lineN && tok >= x.startTok && tok <= x.endTok);
}

/** The full text of a group: every piece's text, in order. */
export function groupText<T extends Anchored & { text: string }>(x: T, items: T[]): string {
  return groupOf(x, items)
    .map((y) => y.text)
    .join(' ');
}

/** A fresh id for a group of pieces. */
export function newGroupId(): string {
  return 'g' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
