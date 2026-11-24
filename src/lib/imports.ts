/**
 * Latin the reader brings in themselves — typed, pasted, or read off a photo
 * of a page — kept with their progress and opened in the Reading Room like
 * any syllabus passage, every word glossed.
 *
 * The glossing is done once, when the text comes in, by the website's
 * /api/ai/gloss-text route: Lectio's own dictionary first (the same
 * `lookup()` every Reader uses), then the AI for each word the dictionary
 * has no exact entry for. What it found is stored with the text, keyed by
 * the word exactly as `tokenize()` splits it, so the iPhone and Android
 * apps (which have no dictionary engine of their own) show the same glosses
 * offline.
 *
 * Nothing in here touches the store, so the route handlers can use it too.
 */
import type { Genre, Passage } from '@/data/types';
import { tokenize } from './tokenize';

/** A dictionary candidate for a word, as the export gives the apps one:
 *  a vocabulary id, and "e" for an exact match or "s" for a stem guess. */
export interface ImportedMatch {
  id: string;
  m: 'e' | 's';
}

/** The AI's gloss for a word the dictionary has no exact entry for, written
 *  for the place it has in this text. */
export interface AiGloss {
  /** The dictionary entry: "Cicero, Ciceronis m.", "fallo, fallere, fefelli, falsum". */
  lemma: string;
  pos: string;
  /** A short English meaning that fits this text. */
  meaning: string;
  /** What this form is: "abl. sg. fem.", "3rd pl. perf. act. ind.". */
  form?: string;
}

/** Everything known about one word of an imported text. */
export interface ImportedWord {
  /** Lectio's dictionary, best first; absent when it found nothing. */
  g?: ImportedMatch[];
  /** The AI's gloss, for a word with no exact dictionary match. */
  ai?: AiGloss;
}

export interface ImportedText {
  /** `mine-` and a random id. Its highlights, notes and flags are kept under
   *  this id in `passages`, exactly as a syllabus passage's are. */
  id: string;
  title: string;
  /** Who wrote it, if the reader said; may be empty. */
  author: string;
  /** Where it is from ("In Catilinam 1.1", "Wheelock ch. 12"); may be empty. */
  source: string;
  genre: Genre;
  /** "lines": one line of the text per row, numbered (verse, or prose kept
   *  as printed). "sentences": prose, a sentence per numbered row. */
  layout: 'lines' | 'sentences';
  lines: Array<{ n: number; latin: string }>;
  /** Word (as `tokenize()` splits it, case and macrons kept) -> its gloss. */
  words: Record<string, ImportedWord>;
  createdAt: string;
  /** The last change. On a merge, the copy with the later one wins. */
  at: string;
  /** Deleted on some device. Kept as a stub, with no text, so another
   *  device's copy doesn't bring it back; `at` is when it was deleted. */
  deleted?: boolean;
}

export const IMPORT_LIMITS = {
  /** The whole text, in characters: about a thousand words, a long sight
   *  passage or two pages of a handout. The AI routes' own cap. */
  chars: 6_000,
  lines: 300,
  title: 120,
  author: 80,
  source: 160,
  /** Words the AI glosses in one request. */
  aiWords: 320,
  /** A photo, as the base64 data URL the browser sends. */
  imageChars: 3_500_000,
} as const;

/** Ids of imported texts start with this, so a Reader can tell one apart. */
export const IMPORTED_PREFIX = 'mine-';

export function isImportedId(id: string): boolean {
  return id.startsWith(IMPORTED_PREFIX);
}

/** Where an imported text opens. */
export function importedHref(id: string): string {
  return `/read/mine/${encodeURIComponent(id)}`;
}

/* ------------------------------------------------------------------ */
/* Cleaning and splitting                                              */
/* ------------------------------------------------------------------ */

/**
 * The text tidied for reading: one Unicode form (so a macron typed as a
 * combining mark and one typed as a single letter are the same word, and
 * every app splits it the same way), ordinary spaces, no soft hyphens, no
 * runs of blank lines.
 */
export function cleanImportText(raw: string): string {
  return raw
    .normalize('NFC')
    .replace(/\r\n?/g, '\n')
    .replace(/[­​-‍﻿]/g, '')
    .replace(/[\t  -   　]/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .split('\n')
    .map((l) => l.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const LEADING_NUMBER = /^\[?(\d{1,4})[\].)]?\s+(?=\S)/;
const TRAILING_NUMBER = /\s+\[?\d{1,4}\]?$/;

/**
 * Takes the line numbers a printed text carries off its lines, and says what
 * the first one was, so the reader's numbering can start there. A number
 * counts only where most lines are numbered or the first one is, since
 * Latin itself almost never has Arabic numerals in it.
 */
export function stripLineNumbers(text: string): { text: string; firstNumber: number | null } {
  const lines = text.split('\n');
  const content = lines.filter((l) => l.trim());
  if (content.length === 0) return { text, firstNumber: null };
  const leading = content.filter((l) => LEADING_NUMBER.test(l)).length;
  const trailing = content.filter((l) => TRAILING_NUMBER.test(l)).length;
  const firstLead = LEADING_NUMBER.exec(content[0]);
  let firstNumber: number | null = null;
  let out = lines;
  if (firstLead || leading >= Math.max(2, content.length / 3)) {
    out = out.map((l) => l.replace(LEADING_NUMBER, ''));
    if (firstLead) firstNumber = Number(firstLead[1]);
  }
  if (trailing >= Math.max(2, content.length / 3)) {
    out = out.map((l) => l.replace(TRAILING_NUMBER, ''));
  }
  return { text: out.join('\n'), firstNumber };
}

/** Prose with the printed line breaks taken out: a word hyphenated across
 *  a break is joined, and each paragraph becomes one run of text. */
function proseParagraphs(text: string): string[] {
  return text
    .replace(/([A-Za-zÀ-ÿĀ-ſ])-\n(?=[a-zà-ÿā-ſ])/g, '$1')
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean);
}

/** A paragraph cut into sentences, at a full stop, question or exclamation
 *  mark followed by a capital or an opening quote. A sentence of a word or
 *  two (an "Ita." or a heading) stays with the one before it. */
function sentences(paragraph: string): string[] {
  const parts = paragraph.split(/(?<=[.?!]["'”’)]?)\s+(?=["'“‘(]?[A-ZÀ-ÞĀ-Ž])/);
  const out: string[] = [];
  for (const p of parts) {
    const words = p.split(/\s+/).filter(Boolean).length;
    if (out.length > 0 && words <= 2) out[out.length - 1] += ` ${p}`;
    else out.push(p);
  }
  return out;
}

/**
 * The reader's text as numbered rows: a line each for verse (or prose kept
 * as printed), a sentence each for prose otherwise.
 */
export function splitImport(
  text: string,
  layout: ImportedText['layout'],
  startAt = 1,
): Array<{ n: number; latin: string }> {
  const clean = cleanImportText(text);
  const rows =
    layout === 'lines'
      ? clean.split('\n').map((l) => l.trim()).filter(Boolean)
      : proseParagraphs(clean).flatMap(sentences);
  const first = Number.isFinite(startAt) && startAt >= 0 ? Math.floor(startAt) : 1;
  return rows.map((latin, i) => ({ n: first + i, latin }));
}

/** Words in a text, as `tokenize()` counts them. */
export function countWords(lines: Array<{ latin: string }>): number {
  let n = 0;
  for (const l of lines) for (const t of tokenize(l.latin)) if (t.isWord) n++;
  return n;
}

/** Every distinct word in the text, in the order it first appears. */
export function distinctWords(lines: Array<{ latin: string }>): string[] {
  const seen = new Set<string>();
  for (const l of lines) for (const t of tokenize(l.latin)) if (t.isWord) seen.add(t.text);
  return [...seen];
}

/** True when the word has a gloss a reader can trust at a glance: an exact
 *  dictionary match, or the AI's. */
export function isGlossed(w: ImportedWord | undefined): boolean {
  return Boolean(w?.ai || w?.g?.some((x) => x.m === 'e'));
}

/** The distinct words still without a gloss. */
export function unglossedWords(t: Pick<ImportedText, 'lines' | 'words'>): string[] {
  return distinctWords(t.lines).filter((w) => !isGlossed(t.words[w]));
}

/** How many of the text's words (counting repeats) have a gloss. */
export function glossCoverage(t: Pick<ImportedText, 'lines' | 'words'>): { glossed: number; total: number } {
  let glossed = 0;
  let total = 0;
  for (const l of t.lines) {
    for (const tok of tokenize(l.latin)) {
      if (!tok.isWord) continue;
      total++;
      if (isGlossed(t.words[tok.text])) glossed++;
    }
  }
  return { glossed, total };
}

const MACRON = /[āēīōūȳĀĒĪŌŪȲ]/;

/** The first few words, for a text the reader didn't name. */
export function defaultTitle(lines: Array<{ latin: string }>): string {
  const words = (lines[0]?.latin ?? '').split(/\s+/).filter(Boolean);
  const head = words.slice(0, 5).join(' ').replace(/[,;:.?!]+$/, '');
  return words.length > 5 ? `${head}…` : head || 'Untitled text';
}

/**
 * An imported text as a `Passage`, so the Reading Room's own Reader (and the
 * notes page) can open it like any other.
 */
export function importedToPassage(t: ImportedText): Passage {
  const text = t.lines.map((l) => l.latin).join('\n');
  return {
    id: t.id,
    author: 'other',
    authorName: t.author.trim() || undefined,
    genre: t.genre,
    work: 'Your texts',
    book: 0,
    citation: t.source.trim() || t.title,
    title: t.title,
    required: false,
    cedReading: null,
    unit: '1',
    macronized: MACRON.test(text),
    wordCount: countWords(t.lines),
    themes: [],
    summary: '',
    context: '',
    lines: t.lines,
    imported: true,
    lineLayout: t.layout === 'lines',
  };
}

/* ------------------------------------------------------------------ */
/* Merging two devices' copies                                         */
/* ------------------------------------------------------------------ */

/**
 * Two devices' imported texts, together: every text on either side, and for
 * one on both, the copy changed last (a deletion included, which is why a
 * deleted text is kept as a stub). Idempotent, like the rest of the merge.
 */
export function mergeImportedTexts(
  a: Record<string, ImportedText>,
  b: Record<string, ImportedText>,
): Record<string, ImportedText> {
  const out: Record<string, ImportedText> = { ...a };
  for (const [id, tb] of Object.entries(b)) {
    const ta = out[id];
    if (!ta || (tb.at ?? '') > (ta.at ?? '')) out[id] = tb;
  }
  return out;
}

/** The texts a reader should see, newest first. */
export function liveImports(all: Record<string, ImportedText> | undefined): ImportedText[] {
  return Object.values(all ?? {})
    .filter((t) => !t.deleted && Array.isArray(t.lines) && t.lines.length > 0)
    .sort((x, y) => (y.createdAt ?? '').localeCompare(x.createdAt ?? ''));
}
