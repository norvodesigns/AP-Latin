import { coreVocabulary } from '@/data/vocabulary';
import type { VocabEntry } from '@/data/types';

/* ------------------------------------------------------------------ */
/* Normalisation                                                       */
/* ------------------------------------------------------------------ */

/** Remove vowel-quantity macrons and breves so lookups match either form. */
export function stripMacrons(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̄̆]/g, '')
    .normalize('NFC');
}

/**
 * Fold a Latin word to its comparison form: no macrons, lowercase, and with
 * the orthographic variants j/v collapsed onto i/u as dictionaries do.
 */
export function normalizeWord(s: string): string {
  return stripMacrons(s)
    .toLowerCase()
    .replace(/j/g, 'i')
    .replace(/v/g, 'u')
    .replace(/[^a-z]/g, '');
}

export interface Token {
  /** The text as it appears, macrons intact. */
  text: string;
  /** True for a word; false for punctuation and whitespace. */
  isWord: boolean;
  /** Index of this token within its line. */
  index: number;
}

/** Split a line into word and non-word tokens, preserving everything. */
export function tokenize(line: string): Token[] {
  const out: Token[] = [];
  const re = /([A-Za-zÀ-ÿĀ-ſ]+)|([^A-Za-zÀ-ÿĀ-ſ]+)/g;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(line)) !== null) {
    out.push({ text: m[0], isWord: Boolean(m[1]), index: i++ });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Glossary lookup                                                     */
/* ------------------------------------------------------------------ */

export interface LookupResult {
  entry: VocabEntry;
  /** How the match was made, shown in the UI so a guess reads as a guess. */
  match: 'exact' | 'stem';
  /** Length of the shared stem, used for ranking. */
  stemLength: number;
}

/** Endings stripped when deriving a stem, longest first. */
const ENDINGS = [
  'ibus', 'orum', 'arum', 'erunt', 'eram', 'issem', 'isset', 'antur', 'entur',
  'imus', 'itis', 'unt', 'ant', 'ent', 'bat', 'bam', 'bit', 'bo', 'ere', 'are',
  'ire', 'ae', 'am', 'as', 'is', 'os', 'us', 'um', 'em', 'es', 'ei', 'ia', 'ibus',
  'i', 'o', 'a', 'e', 'u', 's', 'm', 't',
];

function stemOf(word: string): string[] {
  const stems: string[] = [word];
  for (const e of ENDINGS) {
    if (word.length > e.length + 1 && word.endsWith(e)) {
      stems.push(word.slice(0, -e.length));
    }
  }
  return stems;
}

/** Index built once at module load: normalised headword -> entries. */
const byHeadword = new Map<string, VocabEntry[]>();
/** Every alternative form listed in a lemma (e.g. "a, ab, abs"). */
const byAnyForm = new Map<string, VocabEntry[]>();
/** Stems of length >= 3, for inflected-form matching. */
const byStem = new Map<string, VocabEntry[]>();

function push(map: Map<string, VocabEntry[]>, key: string, e: VocabEntry) {
  if (!key) return;
  const cur = map.get(key);
  if (cur) {
    if (!cur.includes(e)) cur.push(e);
  } else map.set(key, [e]);
}

for (const e of coreVocabulary) {
  const head = normalizeWord(e.headword);
  push(byHeadword, head, e);

  // Alternative nominatives / spellings listed in the lemma, e.g. "nec or neque",
  // "vulnus (volnus), -eris (n.)". Only full words count, not "-eris" style parts.
  for (const raw of e.lemma.split(/[,()]|\bor\b/)) {
    const w = normalizeWord(raw.trim());
    if (w.length >= 2 && !raw.trim().startsWith('-')) push(byAnyForm, w, e);
  }

  // Verb and noun stems from the headword, so inflected forms resolve.
  for (const s of stemOf(head)) {
    if (s.length >= 3) push(byStem, s, e);
  }
  // Perfect / supine stems, taken from the principal parts in the lemma.
  for (const part of e.lemma.split(',').slice(1)) {
    const p = part.trim();
    if (p.startsWith('-')) continue;
    const w = normalizeWord(p);
    if (w.length >= 4) for (const s of stemOf(w)) if (s.length >= 4) push(byStem, s, e);
  }
}

/**
 * Look up an inflected Latin word against the CED core vocabulary.
 *
 * This is a stem-matching heuristic, not a morphological analyser: it returns
 * candidates ranked by how much of the word they explain. The UI labels
 * stem matches as such, and the "ask about this line" AI action is the route
 * to a real parse in context.
 */
export function lookup(word: string): LookupResult[] {
  const w = normalizeWord(word);
  if (w.length < 1) return [];

  // An entry indexed under both its headword and its inflected forms would
  // otherwise be listed twice — dedupe as we merge, not afterwards.
  const seen = new Set<string>();
  const results: LookupResult[] = [];
  for (const entry of [...(byHeadword.get(w) ?? []), ...(byAnyForm.get(w) ?? [])]) {
    if (seen.has(entry.id)) continue;
    seen.add(entry.id);
    results.push({ entry, match: 'exact' as const, stemLength: w.length });
  }

  // Longest stems first so "amaverunt" prefers `amo` over a short accidental match.
  const stems = stemOf(w).sort((a, b) => b.length - a.length);
  for (const s of stems) {
    if (s.length < 3) continue;
    for (const entry of byStem.get(s) ?? []) {
      if (seen.has(entry.id)) continue;
      seen.add(entry.id);
      results.push({ entry, match: 'stem', stemLength: s.length });
    }
    if (results.length >= 6) break;
  }

  return results
    .sort((a, b) => {
      if (a.match !== b.match) return a.match === 'exact' ? -1 : 1;
      return b.stemLength - a.stemLength;
    })
    .slice(0, 6);
}

/* ------------------------------------------------------------------ */
/* Syllabification and metre                                           */
/* ------------------------------------------------------------------ */

const VOWELS = 'aeiouyāēīōūȳăĕĭŏŭ';
const DIPHTHONGS = ['ae', 'au', 'ei', 'eu', 'oe', 'ui'];

export function isVowel(c: string): boolean {
  return VOWELS.includes(c.toLowerCase());
}

/**
 * Split a Latin word into syllables using the standard rules:
 * a single consonant goes with the following vowel; in a cluster the last
 * consonant goes forward; mute + liquid stays together.
 */
export function syllabify(word: string): string[] {
  const w = word.toLowerCase();
  const nuclei: number[] = [];

  for (let i = 0; i < w.length; i++) {
    if (!isVowel(w[i])) continue;
    // Treat a diphthong as one nucleus.
    const pair = stripMacrons(w.slice(i, i + 2));
    if (i + 1 < w.length && DIPHTHONGS.includes(pair) && !nuclei.includes(i - 1)) {
      nuclei.push(i);
      i++;
      continue;
    }
    // qu / gu are single consonantal units, not nuclei.
    if (i > 0 && (w[i - 1] === 'q' || w[i - 1] === 'g') && stripMacrons(w[i]) === 'u' && i + 1 < w.length && isVowel(w[i + 1])) {
      continue;
    }
    nuclei.push(i);
  }

  if (nuclei.length <= 1) return [word];

  const cuts: number[] = [];
  for (let k = 0; k < nuclei.length - 1; k++) {
    let start = nuclei[k];
    // Skip past a diphthong's second element.
    const pair = stripMacrons(w.slice(start, start + 2));
    if (DIPHTHONGS.includes(pair)) start += 1;
    const end = nuclei[k + 1];
    const cluster = w.slice(start + 1, end);
    const n = cluster.length;

    let cut: number;
    if (n === 0) cut = start + 1;
    else if (n === 1) cut = start + 1;
    else {
      const last2 = cluster.slice(-2);
      // Mute + liquid (pr, tr, cr, br, dr, gr, pl, cl, fl, gl, bl) stays with the vowel.
      if (/^[ptcbdgf][lr]$/.test(last2)) cut = end - 2;
      else cut = end - 1;
    }
    cuts.push(cut);
  }

  const out: string[] = [];
  let prev = 0;
  for (const c of cuts) {
    out.push(word.slice(prev, c));
    prev = c;
  }
  out.push(word.slice(prev));
  return out.filter(Boolean);
}

/** Syllabify a whole line, keeping word boundaries. */
export function syllabifyLine(line: string): Array<{ syllable: string; wordIndex: number; final: boolean }> {
  const words = line.split(/\s+/).filter(Boolean);
  const out: Array<{ syllable: string; wordIndex: number; final: boolean }> = [];
  words.forEach((w, wi) => {
    const clean = w.replace(/[^A-Za-zÀ-ÿĀ-ſ]/g, '');
    if (!clean) return;
    const syls = syllabify(clean);
    syls.forEach((s, si) => out.push({ syllable: s, wordIndex: wi, final: si === syls.length - 1 }));
  });
  return out;
}

/**
 * Does the word end in a vowel, diphthong, or vowel + m — the condition for
 * elision before a word beginning with a vowel or h?
 */
export function elidesBefore(word: string, next: string): boolean {
  const a = word.replace(/[^A-Za-zÀ-ÿĀ-ſ]/g, '').toLowerCase();
  const b = next.replace(/[^A-Za-zÀ-ÿĀ-ſ]/g, '').toLowerCase();
  if (!a || !b) return false;
  const endsVowelish = isVowel(a[a.length - 1]) || (a.endsWith('m') && a.length > 1 && isVowel(a[a.length - 2]));
  const startsVowelish = isVowel(b[0]) || b[0] === 'h';
  return endsVowelish && startsVowelish;
}
