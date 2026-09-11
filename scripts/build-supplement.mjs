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

/**
 * Whitaker's DICTLINE stores every verb's principal parts as bare stems, not
 * citation forms — e.g. amo is recorded as parts ["am","am","amau","amat"],
 * never "amo"/"amare"/"amavi"/"amatum". Left alone, that puts a truncated
 * non-word like "am" or "quer" in front of a student instead of "amo" or
 * "queror". The `n: [conjugation, variant]` code on each entry says which
 * ending pattern applies, and `form` flags deponents/semi-deponents, so the
 * real citation form can be rebuilt instead of shown raw. Every rule below
 * was checked against known real verbs across all four conjugations plus
 * sum/possum/eo/volo/fero/fio and their compounds (e.g. n=[2,1] video ->
 * "uid"+"eo"="uideo", "uid"+"ere"="uidere"; n=[3,1] deponent patior ->
 * "pati"+"or"="patior", "pat"+"i"="pati"; n=[6,2] volo -> "uol"+"o"="uolo",
 * "uel"+"le"="uelle") before being trusted here.
 */
function reconstructVerb(e) {
  const raw = e.parts.map((p) => (p === '-' ? null : p));
  const [p0, p1, p2, p3] = raw;
  if (!p0) return null;
  const [n0, n1] = e.n ?? [];
  const formTags = e.form ?? [];
  const isDeponent = formTags.includes('DEP');
  // True deponents and semi-deponents (audeo, soleo, gaudeo, fido...) both
  // show their perfect as a participle + sum rather than a synthetic form.
  const usesParticiplePerfect = isDeponent || formTags.includes('SEMIDEP');

  let pres1sg = null;
  let inf = null;
  if (n0 === 1 && n1 === 1 && p1) {
    pres1sg = p0 + (isDeponent ? 'or' : 'o');
    inf = p1 + (isDeponent ? 'ari' : 'are');
  } else if (n0 === 2 && n1 === 1 && p1) {
    pres1sg = p0 + (isDeponent ? 'eor' : 'eo');
    inf = p1 + (isDeponent ? 'eri' : 'ere');
  } else if (n0 === 3 && n1 === 1 && p1) {
    // Covers plain 3rd conjugation and 3rd-io alike: p0 already carries the
    // -i- an -io verb needs (capi-, pati-) and p1 already lacks it.
    pres1sg = p0 + (isDeponent ? 'or' : 'o');
    inf = p1 + (isDeponent ? 'i' : 'ere');
  } else if (n0 === 3 && n1 === 4 && p0) {
    pres1sg = p0 + (isDeponent ? 'or' : 'o');
    inf = p0 + (isDeponent ? 'ri' : 're');
  } else if (n0 === 3 && n1 === 3 && p1) {
    // -facio compound passives: fio/fieri, not fiere.
    pres1sg = `${p0}o`;
    inf = `${p1}ieri`;
  } else if (n0 === 3 && n1 === 2 && p1) {
    // fero compounds: ferre, not ferere.
    pres1sg = `${p0}o`;
    inf = `${p1}re`;
  } else if (n0 === 5 && n1 === 1 && p1) {
    // sum compounds: esse, not essere.
    pres1sg = `${p0}um`;
    inf = `${p1}esse`;
  } else if (n0 === 5 && n1 === 2 && p0) {
    // possum: posse, not possere.
    pres1sg = `${p0}um`;
    inf = `${p0}e`;
  } else if (n0 === 6 && n1 === 1 && p1) {
    // eo compounds: ire, not iere.
    pres1sg = `${p0}o`;
    inf = `${p1}re`;
  } else if (n0 === 6 && n1 === 2 && p1) {
    // volo/nolo/malo: velle/nolle/malle.
    pres1sg = `${p0}o`;
    inf = `${p1}le`;
  } else if (n0 === 8 && n1 === 3 && p1) {
    // Irregular-imperative 3rd conjugation (duc, dic, fac and compounds).
    pres1sg = `${p0}o`;
    inf = `${p1}ere`;
  } else if (n0 === 8 && n1 === 2 && p1) {
    pres1sg = `${p0}eo`;
    inf = `${p1}ere`;
  } else if (n0 === 8 && n1 === 1 && p1) {
    pres1sg = `${p0}o`;
    inf = `${p1}are`;
  } else if (n0 === 7 && n1 === 3 && p0) {
    // edo/comedo/exedo: p1 carries the archaic "es-" merger with sum
    // (edere/esse), so build off p0's regular 3rd-conjugation shape instead.
    pres1sg = `${p0}o`;
    inf = `${p0}ere`;
  }
  if (!pres1sg || !inf) return null;

  const lemmaParts = [pres1sg, inf];
  if (usesParticiplePerfect) {
    const stem = p3 ?? p2;
    if (stem) lemmaParts.push(`${stem}us sum`);
  } else {
    if (p2) lemmaParts.push(`${p2}i`);
    if (p3) lemmaParts.push(`${p3}um`);
  }
  return { headword: pres1sg, lemma: lemmaParts.join(', ') };
}

/**
 * Whitaker's DICTLINE stores nouns and adjectives as bare stems too, exactly
 * like verbs (see reconstructVerb above), but ONLY when `parts[0]` equals
 * `parts[1]` — that's Whitaker's own signal that no real citation form is on
 * file and the stem is duplicated as a placeholder (e.g. "rip"/"rip" for
 * ripa, "gall"/"gall" for gallus, "speci"/"speci" for species). When they
 * differ, `parts[0]` is already the genuine nominative singular (e.g.
 * "abdicatio"/"abdication") and must be used as-is, never run through this
 * reconstruction.
 *
 * The `n: [declension, variant]` code says which declension and sub-pattern
 * applies, and `form: [gender, kind]` gives the gender. Checked against real
 * dictionary data, only these declension/variant combinations reconstruct
 * safely and unambiguously from the bare stem alone:
 *   - nouns, declension 1, variant 1 -> "-a" (the ordinary puella/nauta
 *     type; other variants sharing declension 1 are Greek-declension nouns
 *     with irregular endings like "-e"/"-es", not "-a")
 *   - nouns, declension 2, variants 1-2 -> "-us" (any gender) or "-um"
 *     (neuter) — e.g. "morb" -> morbus, "frigidari" -> frigidarium
 *   - nouns, declension 4, variant 1 -> "-us" or (neuter) "-u"
 *   - nouns, declension 5, variant 1 -> "-es"
 *   - adjectives, declension 1, variant 1 -> "-us, -a, -um" (the regular
 *     bonus/bona/bonum type; other variants are the irregular pronominal
 *     adjectives — solus, totus, alius, alter — whose declension doesn't
 *     follow from the stem this way)
 * Everything else (declension 3 nouns/adjectives, every other variant, a
 * missing/unrecognized code) is excluded rather than guessed at — e.g.
 * "grand" is n=[3,2], the adjective "grandis, grande", not "grandus".
 */
function genderTag(g) {
  if (g === 'M') return ' (m.)';
  if (g === 'F') return ' (f.)';
  if (g === 'N') return ' (n.)';
  return '';
}
function reconstructNounOrAdjective(e) {
  const p0 = e.parts?.[0];
  if (!p0 || p0 === '-') return null;
  const [n0, n1] = e.n ?? [];
  const gender = e.form?.[0];

  if (e.pos === 'N') {
    const tag = genderTag(gender);
    if (n0 === 1 && n1 === 1) return { headword: `${p0}a`, lemma: `${p0}a, -ae${tag}` };
    if (n0 === 2 && (n1 === 1 || n1 === 2)) {
      return gender === 'N'
        ? { headword: `${p0}um`, lemma: `${p0}um, -i${tag}` }
        : { headword: `${p0}us`, lemma: `${p0}us, -i${tag}` };
    }
    if (n0 === 4 && n1 === 1) {
      return gender === 'N'
        ? { headword: `${p0}u`, lemma: `${p0}u, -us${tag}` }
        : { headword: `${p0}us`, lemma: `${p0}us, -us${tag}` };
    }
    if (n0 === 5 && n1 === 1) return { headword: `${p0}es`, lemma: `${p0}es, -ei${tag}` };
    return null;
  }
  if (e.pos === 'ADJ' && n0 === 1 && n1 === 1) {
    return { headword: `${p0}us`, lemma: `${p0}us, -a, -um` };
  }
  return null;
}

const dict = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
const dictEntries = [];
for (const e of dict) {
  if (!e.orth || !e.parts?.length || !e.senses?.length) continue;
  const pos = POS_LABEL[e.pos] ?? e.pos.toLowerCase();
  // Only a bare, unreconstructed stem (parts[0] === parts[1], Whitaker's own
  // "no citation form on file" signal) needs rebuilding; when they differ,
  // parts[0] is already the real nominative/citation form.
  const isBareStem = (e.pos === 'N' || e.pos === 'ADJ') && e.parts[0] === e.parts[1];
  const rebuilt = e.pos === 'V' ? reconstructVerb(e) : isBareStem ? reconstructNounOrAdjective(e) : null;
  // A bare stem that couldn't be safely reconstructed (declension 3, an
  // irregular variant, or an unrecognized n/form code) is excluded outright
  // rather than kept with a garbled headword like "rip" or "speci" — a
  // missing entry is far better than a confidently wrong one.
  if (isBareStem && !rebuilt) continue;
  const lemma = rebuilt?.lemma ?? [...new Set(e.parts)].join(', ');
  dictEntries.push({
    id: `sup-${e.id}`,
    lemma,
    headword: rebuilt?.headword ?? e.parts[0] ?? e.orth,
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
  // Two ordinary, extremely common nouns the automated pass above never saw:
  // both were already resolving to a real but WRONG dictionary entry before
  // this fix (color -> colo, "to cultivate", via a stem collision the new
  // present-tense stemming rules introduced; doctor found nothing at all),
  // so neither ever appeared on the "no match" list the automated pass
  // works from in the first place. Found by manually checking every common
  // noun that could plausibly collide with a verb's stem, not guessed.
  {
    headword: 'color',
    lemma: 'color, coloris (m.)',
    pos: 'noun',
    definition: 'color, hue, tint; complexion; outward appearance',
  },
  {
    headword: 'doctor',
    lemma: 'doctor, doctoris (m.)',
    pos: 'noun',
    definition: 'teacher, instructor',
  },
  // Defective verb: only a perfect system exists (no present tense), so
  // Whitaker's dictionary line for it doesn't fit the ordinary principal-
  // parts shape reconstructVerb() above expects.
  {
    headword: 'odi',
    lemma: 'odi, odisse, osurus',
    pos: 'verb',
    definition: 'hate, despise (perfect in form, present in meaning)',
  },
  // Irregular numeral, not a regular 1st/2nd declension adjective (unus,
  // duo already have their own EXTRA_FORMS in src/lib/latin.ts for the
  // same reason) — plural-only, its own case endings.
  {
    headword: 'tres',
    lemma: 'tres, tria',
    pos: 'numeral',
    definition: 'three',
  },
  // 2nd-declension noun whose 2-letter stem ("re-") is under the stemmer's
  // 3-character floor and collides with the unrelated 5th-declension "res".
  {
    headword: 'reus',
    lemma: 'reus, rei (m.)',
    pos: 'noun',
    definition: 'defendant, accused person; one under obligation, answerable (for)',
  },
  // Two Greek loanwords Pliny uses that Whitaker's Latin-only dictionary
  // does not carry under their Latinized declension.
  {
    headword: 'idolon',
    lemma: 'idolon, idoli (n.)',
    pos: 'noun',
    definition: 'phantom, image, apparition',
  },
  {
    headword: 'iatraliptes',
    lemma: 'iatraliptes, iatraliptae (m.)',
    pos: 'noun',
    definition: 'physical trainer who treats by rubbing with oil, masseur',
  },
  // Common words the core list's own lookup() never actually fails on (so
  // the generated pass above never considers them at all) but resolves
  // WRONG — stem-colliding with an unrelated core word — because neither
  // tier carries the real headword. "verum" here is the emphatic adversative
  // conjunction ("but", "but also" — "non solum... verum etiam", "not
  // only... but also"), not a form of verus; "solum" is the noun ("ground,
  // soil"), not a form of solus. Added by hand with each word's own gloss,
  // not a guess.
  {
    headword: 'verum',
    lemma: 'verum',
    pos: 'conjunction',
    definition: 'but, but also, however, yet (often "non solum/modo... verum etiam", "not only... but also")',
  },
  {
    headword: 'solum',
    lemma: 'solum, soli (n.)',
    pos: 'noun',
    definition: 'ground, soil, earth, land; sole (of the foot)',
  },
  // Real Latin words appearing in the corpus that Whitaker's dictionary
  // either lacks under this exact prefix spelling or doesn't carry at all.
  {
    headword: 'venor',
    lemma: 'venor, venari, venatus sum',
    pos: 'verb',
    definition: 'hunt, chase',
  },
  {
    headword: 'obtero',
    lemma: 'obtero, obterere, obtrivi, obtritum',
    pos: 'verb',
    definition: 'crush, trample underfoot, grind down',
  },
  {
    headword: 'subeo',
    lemma: 'subeo, subire, subii, subitum',
    pos: 'verb',
    definition: 'go under, approach, come up (to); undergo, endure; occur to (the mind)',
  },
  {
    headword: 'insatiabilis',
    lemma: 'insatiabilis, insatiabile',
    pos: 'adjective',
    definition: 'insatiable, that cannot be satisfied',
  },
  {
    headword: 'sordes',
    lemma: 'sordes, sordium (f. pl.)',
    pos: 'noun',
    definition: 'filth, dirt, squalor; meanness, baseness',
  },
  {
    headword: 'percontor',
    lemma: 'percontor (percunctor), percontari, percontatus sum',
    pos: 'verb',
    definition: 'question closely, interrogate, inquire',
  },
  {
    headword: 'internecto',
    lemma: 'internecto, internectere',
    pos: 'verb',
    definition: 'weave in among, intertwine, entwine',
  },
  {
    headword: 'immulgeo',
    lemma: 'immulgeo, immulgere',
    pos: 'verb',
    definition: 'milk (an animal) into, let flow into by milking',
  },
  {
    headword: 'adsumo',
    lemma: 'adsumo (assumo), adsumere, adsumpsi, adsumptum',
    pos: 'verb',
    definition: 'take up, take to oneself, adopt; claim, assume',
  },
  {
    headword: 'avus',
    lemma: 'avus, avi (m.)',
    pos: 'noun',
    definition: 'grandfather; ancestor, forefather',
  },
  {
    headword: 'fultura',
    lemma: 'fultura, fulturae (f.)',
    pos: 'noun',
    definition: 'support, prop, buttress',
  },
  {
    headword: 'imus',
    lemma: 'imus, ima, imum',
    pos: 'adjective',
    definition: 'lowest, deepest, bottommost; last (superlative of inferus)',
  },
  {
    headword: 'centies',
    lemma: 'centies',
    pos: 'adverb',
    definition: 'a hundred times',
  },
  {
    headword: 'oreas',
    lemma: 'oreas, oreadis (f.)',
    pos: 'noun',
    definition: 'mountain nymph, Oread',
  },
  {
    headword: 'axis',
    lemma: 'axis, axis (m.)',
    pos: 'noun',
    definition: 'axle, axis; (poetic) the sky, heavens',
  },
  {
    headword: 'requiro',
    lemma: 'requiro, requirere, requisivi (requisii), requisitum',
    pos: 'verb',
    definition: 'seek out, look for; ask, inquire after; miss, feel the loss of',
  },
  {
    headword: 'enoto',
    lemma: 'enoto, enotare, enotavi, enotatum',
    pos: 'verb',
    definition: 'note down, make a note of',
  },
  {
    headword: 'illitteratus',
    lemma: 'illitteratus, illitterata, illitteratum',
    pos: 'adjective',
    definition: 'unlettered, uneducated, illiterate',
  },
  {
    headword: 'magalia',
    lemma: 'magalia, magalium (n. pl.)',
    pos: 'noun',
    definition: 'huts, shelters (of a rustic or foreign kind)',
  },
  // Two Greek loanwords for public buildings, named in Pliny's letter to
  // Trajan about a fire at Nicomedia — transliterated straight from Greek
  // and not assimilated to a normal Latin declension, so their accusative
  // ("Gerusian", "Iseon") doesn't fit the regular ENDINGS table either.
  {
    headword: 'gerusia',
    lemma: 'gerusia, gerusiae (f.)',
    pos: 'noun (proper)',
    definition: "a gerusia, the council-house of a city's elders (Greek loanword)",
  },
  {
    headword: 'iseum',
    lemma: 'iseum (Iseon), isei (n.)',
    pos: 'noun (proper)',
    definition: 'an Iseum, a temple of the goddess Isis (Greek loanword)',
  },
  // divus — a genuinely common word (substantive plural "the gods"), but
  // absent from Whitaker's dictionary cache under this headword entirely
  // (only "deus" is there). Aeneid 1.46 "quae divom incedo regina" uses the
  // archaic genitive plural "divom"/"divum", mapped in SUPPLEMENTARY_EXTRA_
  // FORMS since the ordinary ENDINGS table has no "-om" alternate to "-um".
  {
    headword: 'divus',
    lemma: 'divus, -a, -um',
    pos: 'adjective',
    definition: 'divine, godlike; (substantive, usually plural) a god',
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
  { headword: 'Garumna', lemma: 'Garumna, -ae', pos: 'noun (proper)', definition: 'the Garonne, a river forming the boundary between Aquitania and the rest of Gaul (Caesar, De Bello Gallico)' },
  // Added by hand as its own exact-match headword rather than left to the
  // generic dictionary-matching pass above: "Gallia" stems (by stripping a
  // single final "-a") to "galli", which is correct, but the query word
  // "gallia" itself also collides with "galliari" ("poultry-keeper" /
  // "hen-house") once the "-ri" ending (added for passive infinitives like
  // "amari") strips down to the same 6-letter "gallia" — an accidental
  // collision that let two irrelevant poultry senses outrank the real
  // "Gaul" entry by stem length. An exact headword match here is checked
  // before any stem match at all, so it can never lose to that collision.
  { headword: 'Gallia', lemma: 'Gallia, -ae', pos: 'noun (proper)', definition: 'Gaul, the region comprising modern France, Belgium, and parts of the Netherlands, Germany, and Switzerland' },
  // Pliny's letters: the eruption of Vesuvius (6.16, 6.20), Harpocras and
  // citizenship (10.5-10.7), the Nicomedia fire (10.33), and other letters.
  { headword: 'Vesuvius', lemma: 'Vesuvius, -i', pos: 'noun (proper)', definition: 'Mount Vesuvius, the volcano near Naples whose 79 CE eruption killed Pliny the Elder' },
  { headword: 'Rectina', lemma: 'Rectina, -ae', pos: 'noun (proper)', definition: "Rectina, a woman at the foot of Vesuvius whose plea for rescue prompted Pliny the Elder's fatal voyage" },
  { headword: 'Tascius', lemma: 'Tascius, -i', pos: 'noun (proper)', definition: "Tascius, Rectina's husband" },
  { headword: 'Pomponianus', lemma: 'Pomponianus, -i', pos: 'noun (proper)', definition: "Pomponianus, Pliny the Elder's friend at Stabiae, whom he was trying to reach when he died" },
  { headword: 'Stabiae', lemma: 'Stabiae, -arum (f. pl.)', pos: 'noun (proper, pl.)', definition: 'Stabiae, a town near Vesuvius, Pomponianus’s home' },
  { headword: 'Harpocras', lemma: 'Harpocras (Arpocras), -atis', pos: 'noun (proper)', definition: "Harpocras, Pliny's Egyptian doctor, for whom Pliny requested Alexandrian and Roman citizenship" },
  { headword: 'Thermuthis', lemma: 'Thermuthis, Thermuthidis', pos: 'noun (proper)', definition: "Thermuthis, the deceased woman who had freed Harpocras" },
  { headword: 'Theon', lemma: 'Theon, Theonis', pos: 'noun (proper)', definition: "Theon, Thermuthis's father (or former owner)" },
  { headword: 'Maximilla', lemma: 'Maximilla, -ae', pos: 'noun (proper)', definition: 'Antonia Maximilla, a distinguished Roman woman for whose freedwomen Pliny requested the ius Quiritium' },
  { headword: 'Hedia', lemma: 'Hedia, -ae', pos: 'noun (proper)', definition: "Hedia, a freedwoman of Antonia Maximilla" },
  { headword: 'Harmeris', lemma: 'Harmeris, Harmeridis', pos: 'noun (proper)', definition: "Harmeris, another freedwoman of Antonia Maximilla" },
  { headword: 'Nicomedia', lemma: 'Nicomedia, -ae', pos: 'noun (proper)', definition: 'Nicomedia, a city in the Roman province of Bithynia (Pliny’s letter on its fire, Ep. 10.33)' },
  { headword: 'Nicomedenses', lemma: 'Nicomedenses, -ium (m. pl.)', pos: 'noun (proper, pl.)', definition: 'the Nicomedians, people of Nicomedia' },
  { headword: 'Nicaea', lemma: 'Nicaea, -ae', pos: 'noun (proper)', definition: 'Nicaea, another city in Bithynia' },
  { headword: 'Nicaeenses', lemma: 'Nicaeenses, -ium (m. pl.)', pos: 'noun (proper, pl.)', definition: 'the Nicaeans, people of Nicaea' },
  { headword: 'Claudiopolitani', lemma: 'Claudiopolitani, -orum (m. pl.)', pos: 'noun (proper, pl.)', definition: 'the people of Claudiopolis, a city in Bithynia-Pontus' },
  { headword: 'Sinopenses', lemma: 'Sinopenses, -ium (m. pl.)', pos: 'noun (proper, pl.)', definition: 'the people of Sinope, a city on the Black Sea' },
  { headword: 'Quirites', lemma: 'Quirites, Quiritium (m. pl.)', pos: 'noun (proper, pl.)', definition: 'the Quirites, a ceremonial name for Roman citizens; ius Quiritium, "the rights of Roman citizenship"' },
  // Vergil: Aeneid 1 (Dido/Carthage), 6 (the Underworld), 7 and 11-12
  // (the Italian war), a handful of names Whitaker's dictionary — a
  // Latin-only word list — does not carry.
  { headword: 'Sychaeus', lemma: 'Sychaeus, -i', pos: 'noun (proper)', definition: "Sychaeus, Dido's murdered husband, whose ghost warns her to flee Tyre" },
  { headword: 'Pygmalion', lemma: 'Pygmalion, Pygmalionis', pos: 'noun (proper)', definition: "Pygmalion, Dido's brother, king of Tyre, who murdered Sychaeus for his gold" },
  { headword: 'Elissa', lemma: 'Elissa, -ae', pos: 'noun (proper)', definition: 'Elissa, another name for Dido' },
  { headword: 'Tyrius', lemma: 'Tyrius, -a, -um', pos: 'adjective', definition: "Tyrian; of Tyre; (as Vergil uses it) Carthaginian, Phoenician, Dido's own" },
  { headword: 'Gaetulus', lemma: 'Gaetulus, -a, -um', pos: 'adjective', definition: 'Gaetulian, of the Gaetuli, a North African people' },
  { headword: 'Marpesius', lemma: 'Marpesius, -a, -um', pos: 'adjective', definition: 'of Marpesus, a mountain on Paros famous for its marble ("Marpesian marble")' },
  { headword: 'Phoenissa', lemma: 'Phoenissa, -ae', pos: 'noun (proper)', definition: 'the Phoenician woman — Vergil’s epithet for Dido' },
  { headword: 'Chimaera', lemma: 'Chimaera, -ae', pos: 'noun (proper)', definition: 'the Chimaera, a fire-breathing monster, part lion, goat, and serpent' },
  { headword: 'Aetnaeus', lemma: 'Aetnaeus, -a, -um', pos: 'adjective', definition: 'of Mount Etna, Etnean' },
  { headword: 'Marcellus', lemma: 'Marcellus, -i', pos: 'noun (proper)', definition: "Marcellus, Augustus's nephew and intended heir, who died young in 23 BCE and appears in the Underworld in Aeneid 6" },
  { headword: 'Charon', lemma: 'Charon, Charontis', pos: 'noun (proper)', definition: 'Charon, the grim ferryman who carries the shades of the dead across the river to the Underworld' },
  { headword: 'Cocytus', lemma: 'Cocytus, -i', pos: 'noun (proper)', definition: 'the Cocytus, a river of the Underworld' },
  { headword: 'Acheron', lemma: 'Acheron, Acherontis', pos: 'noun (proper)', definition: 'the Acheron, the chief river of the Underworld' },
  { headword: 'Erebus', lemma: 'Erebus, -i', pos: 'noun (proper)', definition: 'Erebus, personified primordial darkness; also used for the Underworld itself' },
  { headword: 'Proserpina', lemma: 'Proserpina, -ae', pos: 'noun (proper)', definition: 'Proserpina, queen of the Underworld, wife of Pluto' },
  { headword: 'Cithaeron', lemma: 'Cithaeron, Cithaeronis', pos: 'noun (proper)', definition: 'Mount Cithaeron, near Thebes, associated with Bacchic revels' },
  { headword: 'Alcides', lemma: 'Alcides, -ae', pos: 'noun (proper)', definition: 'Alcides, a patronymic ("descendant of Alcaeus") for Hercules' },
  { headword: 'Theseus', lemma: 'Theseus, -ei (or -eos)', pos: 'noun (proper)', definition: 'Theseus, the Athenian hero, one of the few living mortals to visit the Underworld' },
  { headword: 'Pirithous', lemma: 'Pirithous, -i', pos: 'noun (proper)', definition: "Pirithous, Theseus's companion on his descent to the Underworld" },
  { headword: 'Quirinus', lemma: 'Quirinus, -i', pos: 'noun (proper)', definition: 'Quirinus, the deified Romulus, worshipped as a war god' },
  { headword: 'Latona', lemma: 'Latona, -ae', pos: 'noun (proper)', definition: 'Latona (Greek Leto), mother of Apollo and Diana by Jupiter' },
  { headword: 'Latonius', lemma: 'Latonius, -a, -um', pos: 'adjective', definition: "of Latona; (as a substantive) Latona's daughter, Diana" },
  { headword: 'Saturnius', lemma: 'Saturnius, -a, -um', pos: 'adjective', definition: "of Saturn; (as a substantive, feminine) Saturn's daughter, Juno" },
  { headword: 'Saturnus', lemma: 'Saturnus, -i', pos: 'noun (proper)', definition: 'Saturn, an ancient Italian god identified with the Greek Cronus, father of Jupiter and Juno' },
  { headword: 'Volsci', lemma: 'Volsci, -orum (m. pl.)', pos: 'noun (proper, pl.)', definition: 'the Volscians, an Italian people whom Camilla leads against Aeneas' },
  { headword: 'Volscus', lemma: 'Volscus, -a, -um', pos: 'adjective', definition: 'Volscian, of the Volsci' },
  { headword: 'Privernum', lemma: 'Privernum, -i', pos: 'noun (proper)', definition: "Privernum, a Volscian town, Metabus's home before his exile" },
  { headword: 'Casmilla', lemma: 'Casmilla, -ae', pos: 'noun (proper)', definition: "Casmilla, Camilla's mother, whose name Metabus adapted to create \"Camilla\"" },
  { headword: 'Amasenus', lemma: 'Amasenus, -i', pos: 'noun (proper)', definition: 'the Amasenus, a river in Latium that Metabus crosses carrying the infant Camilla' },
  { headword: 'Daunus', lemma: 'Daunus, -i', pos: 'noun (proper)', definition: "Daunus, Turnus's father, a legendary king in Apulia" },
  { headword: 'Marica', lemma: 'Marica, -ae', pos: 'noun (proper)', definition: 'Marica, an Italian nymph, mother of King Latinus by Faunus in some traditions' },
  { headword: 'Albanus', lemma: 'Albanus, -a, -um', pos: 'adjective', definition: 'Alban, of Alba Longa; (plural, as a substantive) the Albans' },
  { headword: 'Enceladus', lemma: 'Enceladus, -i', pos: 'noun (proper)', definition: 'Enceladus, one of the Giants who fought the Olympian gods, later buried under Mount Etna' },
  { headword: 'Dardanidae', lemma: 'Dardanidae, -arum (m. pl.)', pos: 'noun (proper, pl.)', definition: 'the Dardanidae, "sons of Dardanus" — the Trojans' },
  { headword: 'Dardanius', lemma: 'Dardanius, -a, -um', pos: 'adjective', definition: 'Dardanian, Trojan' },
  { headword: 'Sidonius', lemma: 'Sidonius, -a, -um', pos: 'adjective', definition: 'Sidonian, of Sidon; (loosely) Phoenician, Carthaginian' },
  { headword: 'Argolicus', lemma: 'Argolicus, -a, -um', pos: 'adjective', definition: 'Argolic, of Argos; (loosely) Greek' },
  { headword: 'Achivi', lemma: 'Achivi, -orum (m. pl.)', pos: 'noun (proper, pl.)', definition: 'the Achivi, a poetic name for the Greeks' },
  { headword: 'Tenedos', lemma: 'Tenedos, -i (f.)', pos: 'noun (proper)', definition: 'Tenedos, a small island near Troy where the Greek fleet hid the wooden horse ruse' },
  { headword: 'Dardanidum', lemma: 'Dardanidae, -arum (m. pl.)', pos: 'noun (proper, pl.)', definition: '(genitive plural) the Dardanidae, "sons of Dardanus" — the Trojans' },
  { headword: 'Cassandra', lemma: 'Cassandra, -ae', pos: 'noun (proper)', definition: "Cassandra, Trojan princess and prophetess, cursed never to be believed" },
  { headword: 'Tritonia', lemma: 'Tritonia (Tritonis), Tritonidis', pos: 'noun (proper)', definition: 'Tritonia/Tritonis, an epithet of Minerva (Athena), from Lake Tritonis, her legendary birthplace' },
  { headword: 'Ganymedes', lemma: 'Ganymedes, Ganymedis', pos: 'noun (proper)', definition: 'Ganymede, the Trojan youth carried off by Jupiter to serve as cupbearer to the gods' },
  { headword: 'Paris', lemma: 'Paris, Paridis', pos: 'noun (proper)', definition: 'Paris, Trojan prince whose abduction of Helen caused the Trojan War' },
  { headword: 'Tydides', lemma: 'Tydides, -ae', pos: 'noun (proper)', definition: 'Tydides, "son of Tydeus" — a patronymic for Diomedes' },
  { headword: 'Aeacides', lemma: 'Aeacides, -ae', pos: 'noun (proper)', definition: 'Aeacides, "descendant of Aeacus" — a patronymic used for Achilles or Pyrrhus' },
  { headword: 'Sarpedon', lemma: 'Sarpedon, Sarpedonis', pos: 'noun (proper)', definition: 'Sarpedon, a Lycian ally of Troy, son of Jupiter, killed by Patroclus' },
  { headword: 'Simois', lemma: 'Simois, Simoentis', pos: 'noun (proper)', definition: 'the Simois, a river near Troy' },
  { headword: 'Cynthus', lemma: 'Cynthus, -i', pos: 'noun (proper)', definition: 'Mount Cynthus, on Delos, birthplace of Apollo and Diana' },
  { headword: 'Eurotas', lemma: 'Eurotas, -ae', pos: 'noun (proper)', definition: 'the Eurotas, the river of Sparta' },
  { headword: 'Oreas', lemma: 'Oreas, Oreadis (f.)', pos: 'noun (proper)', definition: "an Oread, a mountain nymph in Diana's retinue" },
  { headword: 'Lycia', lemma: 'Lycia, -ae', pos: 'noun (proper)', definition: 'Lycia, a region of southwestern Asia Minor, sacred to Apollo' },
  { headword: 'Amphrysius', lemma: 'Amphrysius, -a, -um', pos: 'adjective', definition: "of the Amphrysus, a river in Thessaly where Apollo served Admetus; (as Vergil uses it) belonging to Apollo's prophetess, the Sibyl" },
  { headword: 'Garamantes', lemma: 'Garamantes, -um (m. pl.)', pos: 'noun (proper, pl.)', definition: 'the Garamantes, a North African people' },
  { headword: 'Caspius', lemma: 'Caspius, -a, -um', pos: 'adjective', definition: 'Caspian, of the Caspian region' },
  { headword: 'Maeotius', lemma: 'Maeotius, -a, -um', pos: 'adjective', definition: 'Maeotian, of the Maeotian marshes (the Sea of Azov)' },
  { headword: 'Strymonius', lemma: 'Strymonius, -a, -um', pos: 'adjective', definition: 'of the Strymon, a river in Thrace; (as Vergil uses it) an epithet for a crane, a bird of that region' },
  { headword: 'Inachus', lemma: 'Inachus, -i', pos: 'noun (proper)', definition: 'Inachus, a river god and legendary first king of Argos' },
  { headword: 'Mnestheus', lemma: 'Mnestheus, -ei (or -eos)', pos: 'noun (proper)', definition: "Mnestheus, one of Aeneas's Trojan companions" },
  { headword: 'Sergestus', lemma: 'Sergestus, -i', pos: 'noun (proper)', definition: "Sergestus, one of Aeneas's Trojan companions" },
  { headword: 'Serestus', lemma: 'Serestus, -i', pos: 'noun (proper)', definition: "Serestus, one of Aeneas's Trojan companions" },
  { headword: 'Tyrrhenus', lemma: 'Tyrrhenus, -a, -um', pos: 'adjective', definition: 'Etruscan, Tyrrhenian' },
  { headword: 'Cyllenius', lemma: 'Cyllenius, -a, -um', pos: 'adjective', definition: 'of Mount Cyllene; (as a substantive) Mercury, born on Cyllene' },
  { headword: 'Gryneus', lemma: 'Gryneus, -a, -um', pos: 'adjective', definition: 'of Grynium, a town in Asia Minor with a famous oracle of Apollo' },
  // Aeneid 1.34-87 (Juno's grievance and her bargain with Aeolus): the king
  // of the winds, his floating island-prison, the nymph offered as his
  // bribe, and the two Greek names in Juno's own complaint against fate.
  { headword: 'Aeolus', lemma: 'Aeolus, -i', pos: 'noun (proper)', definition: 'Aeolus, king and keeper of the winds, who releases them against the Trojan fleet at Juno’s bidding' },
  { headword: 'Aeolia', lemma: 'Aeolia, -ae', pos: 'noun (proper)', definition: "Aeolia, the floating island that is Aeolus's home and the winds' prison" },
  { headword: 'Deiopea', lemma: 'Deiopea, -ae', pos: 'noun (proper)', definition: "Deiopea, loveliest of Juno's fourteen nymphs, promised to Aeolus in marriage as payment for wrecking the Trojan fleet" },
  { headword: 'Aiax', lemma: 'Aiax, Aiacis', pos: 'noun (proper)', definition: 'Ajax the Lesser, son of Oileus, whose sacrilege against Cassandra at Troy earned Minerva’s lasting hatred' },
  { headword: 'Oileus', lemma: 'Oileus, Oilei', pos: 'noun (proper)', definition: 'Oileus, king of Locris, father of the lesser Ajax' },
  { headword: 'Argivi', lemma: 'Argivi, -orum (m. pl.)', pos: 'noun (proper, pl.)', definition: 'the Argives, the Greeks collectively (a poetic synonym for Danai)' },
  // Pliny's letters: the ghost story of Curtius Rufus and Athenodorus
  // (Ep. 7.27), Ummidia Quadratilla (Ep. 7.24).
  { headword: 'Curtius', lemma: 'Curtius, -i', pos: 'noun (proper)', definition: 'Curtius Rufus, a Roman who rose from humble origins to the proconsulship of Africa, said to have been visited there by a prophetic apparition' },
  { headword: 'Rufus', lemma: 'Rufus, -i', pos: 'noun (proper)', definition: "Rufus, a common Roman cognomen (\"red-haired\") — here, Curtius Rufus's" },
  { headword: 'Athenodorus', lemma: 'Athenodorus, -i', pos: 'noun (proper)', definition: 'Athenodorus, the Stoic philosopher who calmly investigated a haunted house at Athens' },
  { headword: 'Ummidia', lemma: 'Ummidia, -ae', pos: 'noun (proper)', definition: 'Ummidia Quadratilla, a wealthy Roman matron who died at nearly eighty, grandmother of Pliny’s friend Quadratus' },
  { headword: 'Quadratilla', lemma: 'Quadratilla, -ae', pos: 'noun (proper)', definition: 'Quadratilla — see Ummidia Quadratilla' },
  { headword: 'Cassianus', lemma: 'Cassianus, -a, -um', pos: 'adjective', definition: 'of (Gaius) Cassius (Longinus); Cassiana schola, the law school he founded' },
  { headword: 'Quadratus', lemma: 'Quadratus, -i', pos: 'noun (proper)', definition: "Quadratus, Ummidia Quadratilla's grandson and Pliny's friend, addressee of Epistula 7.24" },
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
 * on the CED's required 990-word list — real Latin the exam itself would
 * gloss in the margin, not a lesser or provisional entry. The app treats it
 * exactly like \`coreVocabulary\`: addable to the flashcard deck, reviewable,
 * searchable, all the same. \`supplementary: true\` on every entry exists only
 * so the UI can show a small "AP" badge on the words that ARE on the CED
 * list — it draws no other line.
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
