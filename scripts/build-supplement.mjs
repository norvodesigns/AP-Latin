#!/usr/bin/env node
/**
 * Generates src/data/supplementaryVocabulary.ts: real Latin that appears in
 * the Reading Room's passages but is not on the CED's required 990-word
 * list, glossed from William Whitaker's WORDS dictionary data (the standard
 * open Latin dictionary dataset — Lewis & Short, the Oxford Latin
 * Dictionary, and other scholarly sources, packaged for machine use).
 *
 * One-time setup this script depends on and does not itself automate: a
 * parsed copy of Whitaker's DICTLINE.GEN at scripts/.cache/dictline.json,
 * as an array of `{ id, orth, parts, pos, senses }` objects (the shape
 * `whitakers_words.datagenerator.Generator().import_dicts()` produces —
 * https://github.com/blagae/whitakers_words). That parsing step needs the
 * actual WORDS data files and a Python environment; this script only
 * consumes its already-parsed JSON output, so re-running it does not
 * require re-installing that toolchain unless the cache is missing.
 *
 * What this script does, using only Node and the app's own matching code:
 *   1. Finds every word across all passages the core vocabulary's lookup()
 *      cannot resolve (the same audit scripts/audit-vocab.mjs reports).
 *   2. Builds a lookup index over the dictionary cache using the exact same
 *      buildIndex()/lookupIn() the app uses for the core list, so a
 *      candidate is accepted or rejected by the identical rule a real
 *      lookup at runtime would apply — no separate, drifting heuristic.
 *   3. Keeps only the dictionary entries that resolved at least one
 *      no-match word, formats them as VocabEntry objects with
 *      `supplementary: true`, and writes the result.
 *
 * A short hand-written list of proper nouns Whitaker's dictionary itself
 * does not carry (mythological/historical figures and places named in
 * Vergil and Pliny) is appended after the generated ones — ordinary
 * classical-reference knowledge, not a guess, and marked the same way.
 */
import fs from 'node:fs';
import { coreIndex, lookupIn, buildIndex, normalizeWord, tokenize } from '../src/lib/latin.ts';
import { allPassages } from '../src/data/passages/index.ts';

const CACHE_PATH = new URL('.cache/dictline.json', import.meta.url);
if (!fs.existsSync(CACHE_PATH)) {
  console.error(
    `Missing ${CACHE_PATH.pathname}. This script consumes an already-parsed copy of ` +
      "Whitaker's WORDS dictionary data — see the file header for how it was produced.",
  );
  process.exit(1);
}

const POS_LABEL = {
  N: 'noun', V: 'verb', ADJ: 'adjective', ADV: 'adverb', PRON: 'pronoun',
  PREP: 'preposition', CONJ: 'conjunction', INTERJ: 'interjection', NUM: 'numeral',
  VPAR: 'participle', SUPINE: 'supine', PACK: 'packon', TACKON: 'tackon',
};

/* ---- 1. every word the core list cannot resolve ---- */

// Checked against `coreIndex` only, never the full two-tier `lookup()`: this
// script regenerates supplementaryVocabulary.ts from scratch every run, so a
// word an *earlier* run already added there must still count as unresolved
// here, or a second run would only ever look for words neither list has yet
// and silently drop everything the first run found.
// "ue", not "ve": every word reaching this has already gone through
// normalizeWord, which folds "v" to "u" — mirrors src/lib/latin.ts's ENCLITICS.
const ENCLITICS = ['que', 'ue', 'ne'];
function lookupWithEnclitic(index, w) {
  const direct = lookupIn(index, w);
  if (direct.length > 0) return direct;
  for (const suffix of ENCLITICS) {
    if (w.length >= suffix.length + 2 && w.endsWith(suffix)) {
      const stripped = lookupIn(index, w.slice(0, -suffix.length));
      if (stripped.length > 0) return stripped;
    }
  }
  return [];
}

const noMatch = new Map(); // normalized -> count
for (const p of allPassages) {
  for (const line of p.lines) {
    for (const t of tokenize(line.latin)) {
      if (!t.isWord) continue;
      const w = normalizeWord(t.text);
      if (!w) continue;
      if (lookupWithEnclitic(coreIndex, w).length > 0) continue;
      noMatch.set(w, (noMatch.get(w) ?? 0) + 1);
    }
  }
}
console.log(`words unresolved by the core list: ${noMatch.size}`);

/* ---- 2. index the dictionary cache with the app's own matcher ---- */

const dict = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
const dictEntries = [];
for (const e of dict) {
  if (!e.orth || !e.parts?.length || !e.senses?.length) continue;
  const pos = POS_LABEL[e.pos] ?? e.pos.toLowerCase();
  const lemma = [...new Set(e.parts)].join(', ');
  dictEntries.push({
    id: `sup-${e.id}`,
    lemma,
    headword: e.parts[0] ?? e.orth,
    pos,
    definition: e.senses.slice(0, 5).join('; '),
    readings: [],
    units: [],
    supplementary: true,
    // Extra stems beyond the headword — index-only, stripped before writing out.
    __stems: e.parts.slice(1),
  });
}

const dictIndex = buildIndex(dictEntries);
// The generic indexer only stems a lemma's *comma-separated* parts; give the
// bare oblique/perfect/supine stems Whitaker's data supplies directly a
// second pass, the same way NOUN_STEMS patches the core index by hand.
for (const e of dictEntries) {
  for (const raw of e.__stems) {
    const s = normalizeWord(raw);
    if (s.length >= 3) {
      const cur = dictIndex.byStem.get(s);
      if (cur) { if (!cur.includes(e)) cur.push(e); }
      else dictIndex.byStem.set(s, [e]);
    }
  }
}

/* ---- 3. keep only entries that actually resolve a no-match word ---- */

const used = new Map(); // id -> entry
let coveredWords = 0;
for (const w of noMatch.keys()) {
  const results = lookupWithEnclitic(dictIndex, w).slice(0, 2);
  if (results.length === 0) continue;
  coveredWords++;
  for (const r of results) used.set(r.entry.id, r.entry);
}
console.log(`words newly covered: ${coveredWords} / ${noMatch.size}`);
console.log(`distinct dictionary entries kept: ${used.size}`);

const generated = [...used.values()]
  .sort((a, b) => a.headword.localeCompare(b.headword))
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  .map(({ __stems, ...rest }) => rest);

/* ---- other words Whitaker's dictionary lookup doesn't reach ---- */

// The reflexive pronoun (sui/sibi/se) has no nominative, so it is
// conventionally headed by its genitive — Whitaker's DICTLINE carries it,
// but this project's own indexer never reaches it there because "sui"'s
// 3-letter stem collides with noise and the generic dictionary-matching
// pass above only keeps entries that actually resolved a no-match word
// found by direct lookup, and the short forms here fall below normal
// matching thresholds. Added by hand with Whitaker's own gloss, not a guess.
const otherHandAdded = [
  {
    headword: 'sui',
    lemma: 'sui, sibi, se, se',
    pos: 'pronoun',
    definition: 'himself, herself, itself, themselves (reflexive pronoun); him/her/it/oneself',
  },
];

/* ---- proper nouns Whitaker's dictionary itself doesn't carry ---- */

const properNouns = [
  { headword: 'Aeneas', lemma: 'Aeneas, -ae', pos: 'noun (proper)', definition: 'Aeneas, Trojan hero, son of Anchises and Venus, legendary ancestor of the Romans' },
  { headword: 'Anchises', lemma: 'Anchises, -ae', pos: 'noun (proper)', definition: "Anchises, Aeneas's father, carried from burning Troy on his son's shoulders" },
  { headword: 'Ascanius', lemma: 'Ascanius, -i', pos: 'noun (proper)', definition: "Ascanius (also Iulus), Aeneas's son, legendary ancestor of the Julian family" },
  { headword: 'Turnus', lemma: 'Turnus, -i', pos: 'noun (proper)', definition: "Turnus, king of the Rutuli, Aeneas's chief rival for Lavinia and Italy" },
  { headword: 'Dido', lemma: 'Dido, Didonis', pos: 'noun (proper)', definition: 'Dido, queen and founder of Carthage, loved and abandoned by Aeneas' },
  { headword: 'Iarbas', lemma: 'Iarbas, -ae', pos: 'noun (proper)', definition: 'Iarbas, an African king, rejected suitor of Dido' },
  { headword: 'Hector', lemma: 'Hector, -oris', pos: 'noun (proper)', definition: "Hector, greatest Trojan warrior, son of Priam, killed by Achilles" },
  { headword: 'Priamus', lemma: 'Priamus, -i', pos: 'noun (proper)', definition: 'Priam, king of Troy during the Trojan War' },
  { headword: 'Laocoon', lemma: 'Laocoon, -ontis', pos: 'noun (proper)', definition: 'Laocoon, Trojan priest who warned against the wooden horse and was killed with his sons by serpents' },
  { headword: 'Sinon', lemma: 'Sinon, -onis', pos: 'noun (proper)', definition: 'Sinon, the Greek who deceived the Trojans into bringing in the wooden horse' },
  { headword: 'Troia', lemma: 'Troia, -ae', pos: 'noun (proper)', definition: 'Troy, the city besieged and destroyed by the Greeks' },
  { headword: 'Ilium', lemma: 'Ilium, -i', pos: 'noun (proper)', definition: 'Ilium, another name for Troy' },
  { headword: 'Latium', lemma: 'Latium, -i', pos: 'noun (proper)', definition: 'Latium, the region of Italy where Aeneas lands and Rome is later founded' },
  { headword: 'Ausonia', lemma: 'Ausonia, -ae', pos: 'noun (proper)', definition: 'Ausonia, a poetic name for Italy' },
  { headword: 'Karthago', lemma: 'Karthago, -inis', pos: 'noun (proper)', definition: 'Carthage, the North African city founded by Dido' },
  { headword: 'Iuno', lemma: 'Iuno, -onis', pos: 'noun (proper)', definition: "Juno, queen of the gods, hostile to Aeneas and the Trojans" },
  { headword: 'Iuppiter', lemma: 'Iuppiter, Iovis', pos: 'noun (proper)', definition: 'Jupiter, king of the gods' },
  { headword: 'Venus', lemma: 'Venus, -eris', pos: 'noun (proper)', definition: "Venus, goddess of love, Aeneas's divine mother" },
  { headword: 'Vulcanus', lemma: 'Vulcanus, -i', pos: 'noun (proper)', definition: 'Vulcan, god of fire and the forge, who makes Aeneas armor at Venus’s request' },
  { headword: 'Neptunus', lemma: 'Neptunus, -i', pos: 'noun (proper)', definition: 'Neptune, god of the sea' },
  { headword: 'Pallas', lemma: 'Pallas, -antis', pos: 'noun (proper)', definition: "Pallas, young son of Evander, allied with Aeneas and killed by Turnus" },
  { headword: 'Evander', lemma: 'Evander, -dri', pos: 'noun (proper)', definition: 'Evander, Greek-born king in Italy who allies with Aeneas' },
  { headword: 'Latinus', lemma: 'Latinus, -i', pos: 'noun (proper)', definition: 'Latinus, king of the Latins, father of Lavinia' },
  { headword: 'Lavinia', lemma: 'Lavinia, -ae', pos: 'noun (proper)', definition: 'Lavinia, daughter of Latinus, betrothed to Aeneas' },
  { headword: 'Amata', lemma: 'Amata, -ae', pos: 'noun (proper)', definition: "Amata, queen of the Latins, opposed to Lavinia's marriage to Aeneas" },
  { headword: 'Camilla', lemma: 'Camilla, -ae', pos: 'noun (proper)', definition: 'Camilla, warrior-maiden who leads the Volscians against Aeneas' },
  { headword: 'Mezentius', lemma: 'Mezentius, -i', pos: 'noun (proper)', definition: "Mezentius, exiled Etruscan tyrant allied with Turnus" },
  { headword: 'Metabus', lemma: 'Metabus, -i', pos: 'noun (proper)', definition: "Camilla's father, an exiled king of the Volscians" },
  { headword: 'Pergama', lemma: 'Pergama, -orum', pos: 'noun (proper, pl.)', definition: 'Pergama, the citadel of Troy; often used for Troy itself' },
];

/* ---- write the file ---- */

function tsLiteral(v) {
  return JSON.stringify(v);
}
function entryToTs(e, idx) {
  const id = e.id ?? `sup-proper-${idx}`;
  return (
    `  {\n` +
    `    id: ${tsLiteral(id)},\n` +
    `    lemma: ${tsLiteral(e.lemma)},\n` +
    `    headword: ${tsLiteral(e.headword)},\n` +
    `    pos: ${tsLiteral(e.pos)},\n` +
    `    definition: ${tsLiteral(e.definition)},\n` +
    `    readings: [],\n` +
    `    units: [],\n` +
    `    supplementary: true,\n` +
    `  },`
  );
}

const out = `import type { VocabEntry } from './types';

/**
 * Words that appear in the syllabus and supplementary passages but are not
 * on the CED's required 990-word list — exactly the words the real exam
 * glosses in the margin. The Reading Room's glossary already told a student
 * as much ("Not in the CED core vocabulary list — which means the exam
 * would gloss it for you"), but said nothing else, because until this file
 * existed the app had nowhere to get an actual gloss from. It has one now.
 *
 * Generated by scripts/build-supplement.mjs from William Whitaker's WORDS
 * dictionary data — the standard open Latin dictionary dataset, itself built
 * from Lewis & Short, the Oxford Latin Dictionary, and other scholarly
 * sources — filtered to the headwords and stems actually needed to resolve
 * a word that appears in one of this app's passages and is not already in
 * \`coreVocabulary\`. None of it is invented: every definition is the
 * dictionary's own, and every entry is checked against the same lookup
 * index the core list uses, so a wrong stem match here reads no differently
 * to the reader than one against the core list — labelled "stem match,
 * verify in context" — already does. A short block of proper nouns
 * (mythological/historical figures and places named in Vergil and Pliny)
 * that dictionary does not carry is appended by hand at the end.
 *
 * This list must never be treated as CED-required vocabulary:
 * \`supplementary: true\` on every entry keeps it out of the vocab flashcard
 * deck and out of any CED reading/unit accounting, exactly like the real
 * appendix boundary.
 */
export const supplementaryVocabulary: VocabEntry[] = [
${generated.map((e, i) => entryToTs(e, i)).join('\n')}
${otherHandAdded
  .map((e, i) =>
    entryToTs(
      { ...e, id: `sup-word-${normalizeWord(e.headword)}` },
      i,
    ),
  )
  .join('\n')}
${properNouns
  .map((e, i) =>
    entryToTs(
      { ...e, id: `sup-proper-${normalizeWord(e.headword)}` },
      i,
    ),
  )
  .join('\n')}
];
`;

fs.writeFileSync(new URL('../src/data/supplementaryVocabulary.ts', import.meta.url), out);
console.log(
  `wrote ${generated.length + otherHandAdded.length + properNouns.length} entries to src/data/supplementaryVocabulary.ts`,
);
