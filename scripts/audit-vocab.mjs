/**
 * Tokenizes every passage in the Reading Room and reports how many word
 * occurrences the glossary's `lookup()` can and can't resolve against the
 * core vocabulary. Run with `npx tsx scripts/audit-vocab.mjs`.
 *
 * A large "no match" count is not automatically a bug — the CED core list
 * is a fixed 990 words, and any real Latin text uses far more than that, the
 * same way the actual exam glosses non-core words in the margin. What's
 * worth investigating is a *high-frequency* word with no match (a real
 * failure in the lookup heuristic) versus a long tail of one-off content
 * words (expected, and exactly what "Not in the CED core vocabulary list"
 * in the Reader's glossary already tells the student).
 */
import { coreVocabulary } from '../src/data/vocabulary.ts';
import { allPassages } from '../src/data/passages/index.ts';
import { lookup, normalizeWord, tokenize } from '../src/lib/latin.ts';

console.log(`coreVocabulary entries: ${coreVocabulary.length}`);
console.log(`passages: ${allPassages.length}`);

const wordStats = new Map(); // normalized -> { count, raw:Set, exact:bool, stemOnly:bool, none:bool }
let totalWordTokens = 0;

for (const p of allPassages) {
  for (const line of p.lines) {
    const tokens = tokenize(line.latin);
    for (const t of tokens) {
      if (!t.isWord) continue;
      totalWordTokens++;
      const norm = normalizeWord(t.text);
      if (!norm) continue;
      let s = wordStats.get(norm);
      if (!s) {
        s = { count: 0, raw: new Set(), results: null };
        wordStats.set(norm, s);
      }
      s.count++;
      s.raw.add(t.text);
    }
  }
}

let noMatch = 0;
let exactMatch = 0;
let stemOnlyMatch = 0;
const noMatchWords = [];
const stemOnlyWords = [];

for (const [norm, s] of wordStats) {
  const results = lookup(norm);
  if (results.length === 0) {
    noMatch++;
    noMatchWords.push([norm, s.count, [...s.raw].slice(0, 3)]);
  } else if (results[0].match === 'exact') {
    exactMatch++;
  } else {
    stemOnlyMatch++;
    stemOnlyWords.push([norm, s.count, [...s.raw].slice(0, 3), results[0].entry.headword]);
  }
}

console.log(`\nDistinct normalized word forms across all passages: ${wordStats.size}`);
console.log(`Total word-token occurrences: ${totalWordTokens}`);
console.log(`  exact match:      ${exactMatch}`);
console.log(`  stem-only match:  ${stemOnlyMatch}`);
console.log(`  NO match at all:  ${noMatch}`);

noMatchWords.sort((a, b) => b[1] - a[1]);
console.log(`\nTop 60 no-match words by occurrence count:`);
for (const [w, c, raw] of noMatchWords.slice(0, 60)) {
  console.log(`  ${w.padEnd(20)} x${c}  (${raw.join(', ')})`);
}

console.log(`\nTotal no-match distinct words: ${noMatchWords.length}`);
console.log(`Total no-match occurrences: ${noMatchWords.reduce((a, [, c]) => a + c, 0)}`);

stemOnlyWords.sort((a, b) => b[1] - a[1]);
console.log(`\nTop 30 stem-only (fuzzy, possibly wrong) matches by occurrence:`);
for (const [w, c, raw, hw] of stemOnlyWords.slice(0, 30)) {
  console.log(`  ${w.padEnd(20)} x${c}  (${raw.join(', ')}) -> guessed "${hw}"`);
}
