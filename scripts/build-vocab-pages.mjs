#!/usr/bin/env node
/**
 * Fill src/data/vocabPages.ts with the printed CED page of every core word.
 *
 *   node scripts/build-vocab-pages.mjs ~/Downloads/ap-latin-course-and-exam-description.pdf
 *
 * Needs poppler's `pdftotext` and `pdfinfo` on PATH (brew install poppler).
 *
 * How it works: every PDF page is extracted on its own, its printed page number
 * is read from the footer, and the pages of Appendix 2 are found by their
 * heading. The core list in vocabulary.ts was parsed from that same appendix in
 * the same alphabetical order, so each lemma is looked up on the pages in turn,
 * never earlier than the page the previous word was found on. Anything it
 * can't place is listed at the end instead of guessed.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pdf = process.argv[2];
if (!pdf) {
  console.error('usage: node scripts/build-vocab-pages.mjs <CED.pdf>');
  process.exit(1);
}

/* ---- core list, in file order ---- */
const src = readFileSync(path.join(root, 'src/data/vocabulary.ts'), 'utf8');
const entries = [...src.matchAll(/id: '([^']+)',\s*lemma: `([^`]*)`,\s*headword: `([^`]*)`/g)].map(
  (m) => ({ id: m[1], lemma: m[2], headword: m[3] }),
);
if (entries.length < 900) throw new Error(`only parsed ${entries.length} entries from vocabulary.ts`);

/* ---- pages ---- */
const info = execFileSync('pdfinfo', [pdf], { encoding: 'utf8' });
const pageCount = Number(/Pages:\s+(\d+)/.exec(info)?.[1]);
const norm = (s) =>
  s
    .replace(/[\u0000-\u001f]/g, ' ')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[‐-―−]/g, '-')
    .replace(/[‘’]/g, "'")
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/** Printed number from the footer: "... | 296" or "296 | ..." near the bottom. */
function printedNumber(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean).slice(-6).reverse();
  for (const l of lines) {
    const m = /\|\s*(\d{1,3})$/.exec(l) || /^(\d{1,3})\s*\|/.exec(l) || /^(\d{1,3})$/.exec(l);
    if (m) return Number(m[1]);
  }
  return null;
}

const pages = [];
for (let i = 1; i <= pageCount; i++) {
  const text = execFileSync('pdftotext', ['-f', String(i), '-l', String(i), '-layout', pdf, '-'], {
    encoding: 'utf8',
  });
  pages.push({ index: i, printed: printedNumber(text), raw: text, text: norm(text) });
}

// Fill gaps in footer numbering from neighbours (some pages have no footer).
for (let i = 0; i < pages.length; i++) {
  if (pages[i].printed != null) continue;
  const prev = pages.slice(0, i).reverse().find((p) => p.printed != null);
  if (prev) pages[i].printed = prev.printed + (i - pages.indexOf(prev));
}

/* ---- Appendix 2 span ---- */
// pdftotext drops many spaces in this PDF ("abeo,-ire" for "abeo, -ire"), so
// every comparison is made with whitespace removed.
const squash = (s) => norm(s).replace(/\s+/g, '');
const startIdx = pages.findIndex(
  (p) => squash(p.raw).includes('appendix2:fullrequiredlatinvocabularylist') && squash(p.raw).includes('partofspeech'),
);
if (startIdx < 0) throw new Error('could not find the Appendix 2 heading');
// Appendix 2's table is the only one with a "Suggested Reading" column; the
// span ends at the first page without it (Appendix 3 starts there).
let endIdx = startIdx + 1;
while (endIdx < pages.length && squash(pages[endIdx].raw).includes('suggestedreading')) endIdx++;
const span = pages.slice(startIdx, endIdx);
console.log(
  `Appendix 2: PDF pages ${span[0].index}–${span.at(-1).index}, printed ${span[0].printed}–${span.at(-1).printed}`,
);

/* ---- first-column cells, in reading order ---- */
// Each table row starts with the Latin entry in the first column, followed by
// a run of spaces (or none, when the entry fills the column) and the part of
// speech. A wrapped entry's second line starts with "-", so it is skipped.
const POS = /(preposition|verb|noun|adjective|adverb|conjunction|pronoun|interjection|numeral|participle|enclitic)/;
const cells = [];
for (const pg of span) {
  for (const line of pg.raw.split('\n')) {
    const t = line.replace(/^\s+/, '');
    if (!t || /^-/.test(t) || /^Vocabulary\s+Part of Speech/.test(t)) continue;
    const m = POS.exec(t);
    if (!m || m.index === 0) continue;
    cells.push({ key: squash(t.slice(0, m.index)), page: pg.printed });
  }
}

/* ---- place each lemma ---- */
const out = {};
const missing = [];
let cursor = 0;
for (const e of entries) {
  const lemma = squash(e.lemma);
  const head = squash(e.headword);
  let found = -1;
  for (let k = cursor; k < Math.min(cells.length, cursor + 8); k++) {
    const c = cells[k].key;
    if (!c) continue;
    const a = c.slice(0, 12);
    // A bare cell that is only a prefix of a longer lemma ("eo" the adverb vs
    // "eo, ire, ivi" the verb) is a different word, not a match.
    const full = c.length >= Math.min(lemma.length, 12) || c === lemma;
    if ((lemma.startsWith(a) && full) || (c.startsWith(head) && c.length > head.length && lemma.startsWith(c.slice(0, head.length + 1)))) {
      found = k;
      break;
    }
  }
  if (found < 0) {
    missing.push(e.id);
    continue;
  }
  cursor = found + 1;
  out[e.id] = cells[found].page;
}

// Words that couldn't be matched but sit between two placed neighbours on the
// same page are on that page too (alphabetical list, no gaps).
for (let i = 0; i < entries.length; i++) {
  const id = entries[i].id;
  if (out[id] != null) continue;
  const before = entries.slice(0, i).reverse().find((x) => out[x.id] != null);
  const after = entries.slice(i + 1).find((x) => out[x.id] != null);
  if (before && after && out[before.id] === out[after.id]) {
    out[id] = out[before.id];
    missing.splice(missing.indexOf(id), 1);
  }
}

// vocabulary.ts has two entries that are really the wrapped second line of
// the row above them in the CED ("quicumque, quaecumque, / quodcumque" and
// "quisque, quaeque, / quidque ..."). They sit on their parent's page.
const CONTINUATIONS = { quodcumque: 'quicumque', quidque: 'quisque' };
for (const [child, parent] of Object.entries(CONTINUATIONS)) {
  if (out[parent] != null) out[child] = out[parent];
}

/* ---- report + write ---- */
const counts = {};
for (const p of Object.values(out)) counts[p] = (counts[p] ?? 0) + 1;
for (const [p, n] of Object.entries(counts)) console.log(`  p. ${p}: ${n} words`);
console.log(`placed ${Object.keys(out).length} of ${entries.length}`);
if (missing.length) console.log(`unplaced (${missing.length}): ${missing.join(', ')}`);

const file = path.join(root, 'src/data/vocabPages.ts');
const header = readFileSync(file, 'utf8').split('export const')[0].replace(
  /\/\/\n\/\/ Empty until[\s\S]*?\n\n/,
  '\n',
);
const body = Object.entries(out)
  .map(([id, p]) => `  ${/^[a-z_][a-z0-9_]*$/i.test(id) ? id : `'${id}'`}: ${p},`)
  .join('\n');
writeFileSync(
  file,
  `${header}export const handbookPageById: Readonly<Record<string, number>> = {\n${body}\n};\n`,
);
console.log(`wrote ${path.relative(root, file)}`);
