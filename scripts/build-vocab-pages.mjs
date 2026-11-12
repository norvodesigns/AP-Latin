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
const startIdx = pages.findIndex(
  (p) => /appendix 2/.test(p.text) && /full required latin vocabulary list/.test(p.text) && !/contents/.test(p.text),
);
if (startIdx < 0) throw new Error('could not find the Appendix 2 heading');
let endIdx = pages.findIndex(
  (p, i) => i > startIdx && /appendix 3/.test(p.text) && /vocabulary list by reading/.test(p.text),
);
if (endIdx < 0) endIdx = pages.length;
const span = pages.slice(startIdx, endIdx);
console.log(
  `Appendix 2: PDF pages ${span[0].index}–${span.at(-1).index}, printed ${span[0].printed}–${span.at(-1).printed}`,
);

/* ---- place each lemma ---- */
const out = {};
const missing = [];
let cursor = 0;
for (const e of entries) {
  const needles = [norm(e.lemma), norm(e.lemma).split(/[,(]/)[0].trim() + ',', norm(e.headword) + ','];
  let found = -1;
  for (const needle of needles) {
    for (let k = cursor; k < span.length; k++) {
      if (span[k].text.includes(needle)) {
        found = k;
        break;
      }
    }
    if (found >= 0) break;
  }
  if (found < 0) {
    missing.push(e.id);
    continue;
  }
  // A lemma that looks like it jumped far ahead is more likely a stray match
  // inside a definition; only accept up to two pages forward.
  if (found - cursor > 2) {
    missing.push(e.id);
    continue;
  }
  cursor = found;
  out[e.id] = span[found].printed;
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
