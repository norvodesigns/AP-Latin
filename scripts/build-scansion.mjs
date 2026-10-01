/**
 * Builds the scansion corpus from the full text of the Aeneid.
 *
 *   node scripts/build-scansion.mjs [--fetch] [--out public/scansion]
 *
 * Source: The Latin Library's Vergil. It is unmarked text (only the opening
 * lines of Book 1 carry macrons), and quantity by nature cannot be read off
 * unmarked text. So nothing is assumed about it: the only quantities taken as
 * known are diphthongs and syllables closed by two consonants, and the metre
 * has to settle the rest. A line goes in only when it can settle it one way.
 *
 * Getting the syllables right is therefore everything, and bare spelling
 * misleads in a few known ways, each handled below and each a source of
 * confident wrong answers before it was: consonantal i after a prefix
 * (con-iunx), vocalic i in Greek names (Ĭ-ū-lus, Trō-ï-us), vowel pairs that
 * are not diphthongs (Trō-ës, Da-na-üm, a-ë-nus), Greek eu (Teu-crī,
 * Mnes-theus), and the page's own habits (u for v, wrapped and transposed
 * lines). The tell-tale sign of a slip is a spondaic fifth foot; Vergil has a
 * handful, and the corpus should show only those.
 *
 * The method, in order:
 *
 *   1. Syllabify each line, keeping word boundaries.
 *   2. Mark elisions (vowel/diphthong/-m before a vowel or h).
 *   3. Assign each metrical syllable a quantity:
 *        long by nature   — macron on the vowel, or a diphthong
 *        long by position — followed by two or more consonants, or x/z
 *        short            — otherwise
 *      A mute+liquid cluster does not force position, so those syllables are
 *      recorded as ambiguous and left for the meter to decide.
 *   4. Search every dactyl/spondee arrangement of feet 1–5 (foot 6 is always
 *      two syllables) for the ones consistent with those quantities.
 *   5. Keep the line only when exactly one arrangement survives. Anything that
 *      stays ambiguous is dropped rather than guessed at — a practice tool that
 *      teaches an invented quantity is worse than a smaller one.
 *
 * Output is one JSON file per book plus an index, written to public/ so the
 * client can fetch a book on demand instead of shipping ~10,000 lines in the
 * bundle.
 */

import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const BOOKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const SRC = (b) => `https://www.thelatinlibrary.com/vergil/aen${b}.shtml`;
const CACHE = 'scripts/.cache/aeneid';

const args = process.argv.slice(2);
const OUT = argValue('--out') ?? 'public/scansion';
const FETCH = args.includes('--fetch');

function argValue(flag) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : null;
}

/* ------------------------------------------------------------------ */
/* Latin phonology                                                     */
/* ------------------------------------------------------------------ */

const MACRONS = 'āēīōūȳĀĒĪŌŪȲ';
/**
 * A diaeresis marks a vowel that stands on its own: Trōës, aënus, Aenēïa. The
 * respelling step below writes it where the bare spelling would mislead (a
 * diphthong that is not one, an i that is not a consonant), and it is shown
 * to students too, the way school texts print it.
 */
const DIAERESES = 'ëïüËÏÜ';
const PLAIN_VOWELS = 'aeiouyAEIOUY';
const VOWELS = PLAIN_VOWELS + MACRONS + DIAERESES;
const DIPHTHONGS = ['ae', 'au', 'ei', 'eu', 'oe', 'ui'];

const stripMacrons = (s) =>
  s
    .replace(/[āĀ]/g, 'a').replace(/[ēĒëË]/g, 'e').replace(/[īĪïÏ]/g, 'i')
    .replace(/[ōŌ]/g, 'o').replace(/[ūŪüÜ]/g, 'u').replace(/[ȳȲ]/g, 'y');

const isVowel = (c) => VOWELS.includes(c);
const hasMacron = (s) => [...s].some((c) => MACRONS.includes(c));

/**
 * ae, au and oe are always diphthongs. eu, ei and ui almost never are: `deum`
 * is de-um, `meus` is me-us, `tuī` is tu-ī. Treating those as diphthongs loses
 * a syllable and the foot search then finds no solution at all, so they are
 * allowed only in the closed set of words where they genuinely are one.
 */
const EU_WORDS = /^(heu|eheu|heus|seu|ceu|neu|neu[dt]er)/;
/**
 * Greek names are where eu is a diphthong: at the start (Eu-ry-a-lus, Eu-rus,
 * Teu-crī, Leu-cā-tē) and in the -eus of a nominative or vocative (Mnes-theus,
 * Ī-li-o-neus, Ty-deu). Lower-case words never qualify that way, so de-us,
 * e-unt and au-re-us are safe; Tartareus and Grȳnēus are adjectives, Tar-ta-re-us.
 */
const EU_START = /^(eu|teu|leu)/;
const EU_END = /([^aeiouy]|typho)eu(s)?(que|ve|ne)?$/;
const EU_NOT = /^(tartareus|gryneus|deus|meus|reus)/;
const EI_WORDS = /^(deinde|dein|deinceps|hei|ei)$/;
const UI_WORDS = /^(cui|huic|huius|cuius|quoi)$/;

function isDiphthongAt(word, i) {
  const pair = stripMacrons(word.slice(i, i + 2)).toLowerCase();
  if (!DIPHTHONGS.includes(pair)) return false;
  // A diaeresis on the second vowel says the pair is two syllables.
  if (DIAERESES.includes(word[i + 1])) return false;
  if (pair === 'ae' || pair === 'au' || pair === 'oe') return true;

  const w = stripMacrons(word).toLowerCase();
  if (pair === 'eu') {
    if (EU_WORDS.test(w)) return true;
    const proper = /^[A-ZĀ-Ȳ]/.test(word);
    if (!proper || EU_NOT.test(w)) return false;
    if (EU_START.test(w) && i === w.indexOf('eu')) return true;
    const end = w.search(/eu(s)?(que|ve|ne)?$/);
    return EU_END.test(w) && i === end;
  }
  if (pair === 'ei') return EI_WORDS.test(w);
  if (pair === 'ui') return UI_WORDS.test(w);
  return false;
}

/** Vowel nuclei of a word, as [startIndex, length] pairs. */
function nuclei(word) {
  const out = [];
  for (let i = 0; i < word.length; i += 1) {
    if (!isVowel(word[i])) continue;
    // `qu` and `gu` before a vowel are consonantal — the u is not a nucleus.
    if (
      i > 0 &&
      (word[i - 1].toLowerCase() === 'q' || word[i - 1].toLowerCase() === 'g') &&
      stripMacrons(word[i]).toLowerCase() === 'u' &&
      i + 1 < word.length &&
      isVowel(word[i + 1])
    ) {
      continue;
    }
    if (i + 1 < word.length && isDiphthongAt(word, i)) {
      out.push([i, 2]);
      i += 1;
      continue;
    }
    out.push([i, 1]);
  }
  return out;
}

/** Split a word into syllables. */
function syllabify(word) {
  const nu = nuclei(word);
  if (nu.length <= 1) return [word];

  const cuts = [];
  for (let k = 0; k < nu.length - 1; k += 1) {
    const end = nu[k][0] + nu[k][1] - 1; // last char of this nucleus
    const nextStart = nu[k + 1][0];
    const cluster = word.slice(end + 1, nextStart);
    const bare = cluster.replace(/[^A-Za-zÀ-ÿĀ-ſȲȳ]/g, '');
    const n = bare.length;

    let cut;
    if (n === 0) cut = end + 1;
    else if (n === 1) cut = end + 1;
    else {
      const last2 = stripMacrons(bare.slice(-2)).toLowerCase();
      const last3 = stripMacrons(bare.slice(-3)).toLowerCase();
      // qu counts as a single consonant and goes forward with the vowel.
      if (last2 === 'qu' || last2 === 'gu') cut = nextStart - 2;
      // So do ch, ph, th and rh, Greek single sounds written with two letters:
      // An-chī-sēs, A-chā-tēs, Or-pheus, not Anc-hī-sēs. Display only: h never
      // counts toward position, so the quantities come out the same either way.
      else if (/^[cpt]h[lr]$/.test(last3) && n >= 3) cut = nextStart - 3;
      else if (/^[cptr]h$/.test(last2)) cut = nextStart - 2;
      else if (/^[ptcbdgf][lr]$/.test(last2)) cut = nextStart - 2;
      else cut = nextStart - 1;
    }
    cuts.push(Math.max(end + 1, Math.min(cut, nextStart)));
  }

  const out = [];
  let prev = 0;
  for (const c of cuts) {
    out.push(word.slice(prev, c));
    prev = c;
  }
  out.push(word.slice(prev));
  return out.filter(Boolean);
}

const CONSONANT_RE = /[bcdfgjklmnpqrstvwxzBCDFGJKLMNPQRSTVWXZ]/;

/**
 * Consonant sounds at the start of a string, for the position rule.
 * `x` and `z` are double consonants; `qu` is single; `h` never counts.
 */
function leadingConsonants(s) {
  let n = 0;
  for (let i = 0; i < s.length; i += 1) {
    const c = s[i];
    const lc = stripMacrons(c).toLowerCase();
    if (lc === 'h') continue;
    if (isVowel(c)) break;
    if (!CONSONANT_RE.test(c)) continue;
    if (lc === 'x' || lc === 'z') { n += 2; continue; }
    if (lc === 'q' && s[i + 1] && stripMacrons(s[i + 1]).toLowerCase() === 'u') { n += 1; i += 1; continue; }
    n += 1;
  }
  return n;
}

/** Trailing consonant sounds of a string. */
function trailingConsonants(s) {
  let n = 0;
  for (let i = s.length - 1; i >= 0; i -= 1) {
    const c = s[i];
    const lc = stripMacrons(c).toLowerCase();
    if (lc === 'h') continue;
    if (isVowel(c)) break;
    if (!CONSONANT_RE.test(c)) continue;
    if (lc === 'x' || lc === 'z') { n += 2; continue; }
    n += 1;
  }
  return n;
}

/**
 * `i` starting the second half of a compound is a consonant too: con-iunx,
 * ad-iuvat, ob-iectus, sub-iungō. Read as a vowel it adds a syllable that the
 * foot search will happily fit as a short, giving a confident wrong answer
 * (coniunx is two syllables, not co-ni-unx).
 *
 * Only two shapes are safe to rewrite. Before u it is consonantal. Before e it
 * is consonantal in the iaciō family (ob-iēc-it, con-iec-tus) but a vowel in
 * the compounds of eō (sub-i-ēre, ad-i-ēns), so e is taken only when c follows.
 * Anything else (con-i-ciō, ab-i-it) stays a vowel. in- and per- are left out:
 * verse keeps their i a vowel (i-ni-ū-ri-a at Aen. 1.27, a hand-checked line).
 */
const PREFIX_RE = /^(ab|ad|con|ob|sub|dis|circum)$/;

function iacioCompound(word, i) {
  const head = stripMacrons(word.slice(0, i)).toLowerCase();
  const next = stripMacrons(word.slice(i + 1, i + 3)).toLowerCase();
  return /^(ab|ad|con|in|ob|sub)$/.test(head) && next[0] === 'c' && /[aeiou]/.test(next[1] ?? '');
}

function consonantalSu(word, i) {
  const w = stripMacrons(word).toLowerCase();
  const m = /^(as|con|man|per)?su(?=(a[dv]|as[aeiou]|esc|et))/.exec(w);
  return Boolean(m) && i === m[0].length - 1;
}

/**
 * Greek and foreign names whose opening I is a vowel, not a consonant: Ĭ-ū-lus
 * (always three syllables in Vergil, line-final in pulcher Iūlus), Ī-ō, Ī-ō-pās,
 * Ī-ar-bās, Ī-ā-pyx, Ī-a-si-us, Ī-ae-ra, Ī-ol-lās, Ī-ō-ni-us. Read as J they
 * lose a syllable and the line comes out as a spondaic ending it does not have.
 * Latin words (iam, Iūnō, Iuppiter, Iūlius, Iūturna, Iānus) stay consonantal.
 */
const VOCALIC_I = /^(iul(us|i|o|um|e)(que|ve|ne)?$|io$|iopas|ioni|iaer|iapy|iarb|iasi|ioll)/;

function afterPrefix(word, i) {
  const head = stripMacrons(word.slice(0, i)).toLowerCase();
  if (!PREFIX_RE.test(head)) return false;
  const next = stripMacrons(word.slice(i + 1, i + 3)).toLowerCase();
  return next[0] === 'u' || (next[0] === 'e' && next[1] === 'c');
}

/**
 * `i` between vowels is a consonant (maior, Trōia, eius): it does not form a
 * syllable of its own, and it counts double for position — Trōia scans Trōj-ja.
 * Rewriting it to `j`/`jj` before analysis is what makes both fall out.
 *
 * Because `i` → `jj` changes the string length, this returns an index map
 * alongside the rewritten word so syllable boundaries can be carried back to
 * the original spelling for display.
 */
function normaliseConsonantalI(word) {
  const chars = [];
  const map = [];
  const V = 'aeiouyāēīōūȳAEIOUYĀĒĪŌŪȲëïËÏ';
  const isV = (c) => c !== undefined && V.includes(c);
  // The u of qu and ngu is a consonant, so an i after it is not between
  // vowels: qui-ē-tus, qui-a, pin-gui-a.
  const afterQu = (k) =>
    k >= 2 && /[uU]/.test(word[k - 1]) && (/[qQ]/.test(word[k - 2]) || /ng/i.test(word.slice(k - 3, k - 1)));

  for (let i = 0; i < word.length; i += 1) {
    const c = word[i];
    const isI = c === 'i' || c === 'I';
    if (isI && i === 0 && isV(word[1]) && !VOCALIC_I.test(stripMacrons(word).toLowerCase())) {
      chars.push(c === 'I' ? 'J' : 'j');
      map.push(i);
      continue;
    }
    if (isI && isV(word[i - 1]) && isV(word[i + 1]) && !afterQu(i)) {
      // Doubles: the preceding syllable closes on the first j.
      chars.push('j', 'j');
      map.push(i, i);
      continue;
    }
    if (isI && i > 0 && afterPrefix(word, i)) {
      chars.push('j');
      map.push(i);
      continue;
    }
    // The iaciō compounds spelled with one i (sub-iciō, con-iciō, ob-icis)
    // say j-i: the j closes the prefix, which is long by position.
    if (isI && i > 0 && iacioCompound(word, i)) {
      chars.push('j', c);
      map.push(i, i);
      continue;
    }
    // The u of suādeō, suāvis, suēscō is a consonant (swā-dent), unlike the
    // u of suus, sua.
    if ((c === 'u' || c === 'U') && consonantalSu(word, i)) {
      chars.push('w');
      map.push(i);
      continue;
    }
    chars.push(c);
    map.push(i);
  }
  return { norm: chars.join(''), map };
}

/* ------------------------------------------------------------------ */
/* Scanning one line                                                   */
/* ------------------------------------------------------------------ */

const LONG = 'long';
const SHORT = 'short';
const EITHER = 'either';

/**
 * Build the syllable list for a line, with elisions marked and a quantity (or
 * `either`) attached to each metrical syllable.
 */
/**
 * Words whose bare spelling misleads the analysis, respelled with a diaeresis
 * on the vowel that stands alone. Each entry is [pattern on the lower-case,
 * macron-free word, index of the vowel to mark].
 *
 *   oe that is two vowels:  Trō-ës, Be-ro-ë, Si-mo-ën-ta, Cy-mo-tho-ë
 *   ae that is two vowels:  a-ë-nus (bronze), ā-ër, ā-ë-ri-us (of the air)
 *   au that is two vowels: Da-na-um, Me-ne-lā-us
 *   i between vowels that is a vowel, in Greek adjectives and names:
 *                           Ae-nē-ï-a, Pri-a-mē-ï-us, Trō-ï-us, Dē-ï-o-pē-a
 */
const RESPELL = [
  [/^(troe|beroe|cymothoe|pholoe|simoe|noem|typhoe)/, (w) => w.indexOf('oe') + 1],
  [/^aen(a|ae|am|as|i|is|o|os|um|us)(que|ve|ne)?$/, () => 1],
  [/^aer(que)?$/, () => 1],
  [/^aeri(a|ae|am|as|i|is|o|os|um|us)(que|ve|ne)?$/, () => 1],
  [/^(aene|lilybe|mino|nere|phine|priame|rhoete|typho)i[aeiou]/, (w) => w.search(/[eo]i[aeiou]/) + 1],
  [/^deiop/, () => 2],
  [/^troi(us|um|o|os|i|is)(que|ve|ne)?$/, () => 3],
  [/^danaum(que)?$/, () => 4],
  [/^menela(us|um)$/, () => 6],
];

/**
 * Words that are spelled the same but scan two ways, so both are tried and a
 * line is kept only if exactly one reading scans: Trōia the city is Trō-ja,
 * Trōïa the adjective (Trōïa gaza) is Trō-ï-a; aera is ae-ra (bronzes) or ā-ë-ra
 * (the air).
 */
const AMBIGUOUS = [
  [/^troi(a|ae|am)(que|ve|ne)?$/, () => 3],
  [/^aera(que|ve|ne)?$/, () => 1],
];

const markAt = (word, i) =>
  word.slice(0, i) + ({ e: 'ë', i: 'ï', u: 'ü', E: 'Ë', I: 'Ï', U: 'Ü' }[word[i]] ?? word[i]) + word.slice(i + 1);

function respell(word, alt) {
  const w = stripMacrons(word).toLowerCase();
  for (const [re, at] of RESPELL) if (re.test(w)) return markAt(word, at(w));
  if (alt) for (const [re, at] of AMBIGUOUS) if (re.test(w)) return markAt(word, at(w));
  return word;
}

const hasAmbiguous = (raw) =>
  raw.split(/\s+/).some((t) => {
    const w = stripMacrons(t.replace(/[^A-Za-zÀ-ÿĀ-ſȲȳ]/g, '')).toLowerCase();
    return AMBIGUOUS.some(([re]) => re.test(w));
  });

/**
 * The page writes u for v in a handful of words (paruus, aduectus, Mauortis).
 * Read as a vowel the u adds a syllable, so they are put right before
 * scanning, and in the text students see.
 */
const CORRECTIONS = {
  lauabat: 'lavabat', adnve: 'adnue', achiuos: 'achivos', argiua: 'argiva', argiuae: 'argivae',
  dolopumue: 'dolopumve', mauortia: 'mavortia', mauortis: 'mavortis', prouehimur: 'provehimur',
  aduectus: 'advectus', aluo: 'alvo', auem: 'avem', auo: 'avo', conuexo: 'convexo', fuluo: 'fulvo',
  longaeuo: 'longaevo', paruam: 'parvam', paruus: 'parvus', quidue: 'quidve', quoue: 'quove',
  ulua: 'ulva', voluitur: 'volvitur', vlixes: 'ulixes',
};

/**
 * Words Vergil scans with synizesis, two vowels run into one syllable: al-veō,
 * ge-nua as gen-va, a-bie-te, Ī-li-o-nei; and cōnūbium, whose u he treats
 * both ways. Nothing in the spelling says so, and a
 * line one syllable long can still be fitted by trading a spondee for a
 * dactyl, so lines with them are left out rather than scanned wrong.
 */
const SYNIZESIS = /^(alveo|alvei|genua|abiete|abietibus|parietibus|arietat|ilionei|oilei|dehinc|conubi(a|i|is|o|um))$/;

const hasSynizesis = (raw) =>
  raw.split(/\s+/).some((t) => SYNIZESIS.test(stripMacrons(t.replace(/[^A-Za-zÀ-ÿĀ-ſȲȳ]/g, '')).toLowerCase()));

function correct(line) {
  return line.replace(/[A-Za-z]+/g, (w) => {
    const fix = CORRECTIONS[w.toLowerCase()];
    if (fix) return w[0] === w[0].toUpperCase() ? fix[0].toUpperCase() + fix.slice(1) : fix;
    // A u that starts a word before a vowel, or stands between vowels, is
    // the page writing u for v (ualidis, uox, lauabat, Mauortis); Greek Eu-
    // names (Euanthen) keep their diphthong.
    if (/^Eu[aeiou]/.test(w)) return w;
    return w
      .replace(/^([Uu])(?=[aeiou])/, (u) => (u === 'U' ? 'V' : 'v'))
      .replace(/(?<=[aeioAEIO])u(?=[aeiou])/g, 'v');
  });
}

/**
 * `macronized` says the text marks every long vowel, as the course's own
 * readings do. Then an unmarked vowel in an open syllable is known short,
 * not merely unknown, and far more lines settle to one scansion.
 */
function analyseLine(raw, alt = false, macronized = false) {
  const words = raw
    // The Latin Library marks an em dash as the numeric entity `&#151;`
    // (a Windows-1252 legacy that many old pages carry), and does it with
    // no surrounding whitespace — "ego&#151;sed", not "ego &#151; sed". A
    // bare `\s+` split then never sees a boundary there and welds the two
    // words either side of the dash into one. An em/en dash is punctuation
    // that separates words regardless of whether the page bothered to add
    // spaces around it, so it is normalised to a space before splitting.
    .replace(/&#151;|[—–]/g, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/[^A-Za-zÀ-ÿĀ-ſȲȳ]/g, ''))
    .filter(Boolean)
    .map((w) => respell(w, alt));
  if (words.length === 0) return null;

  const normed = words.map(normaliseConsonantalI);
  const norm = normed.map((x) => x.norm);

  // Syllabify the rewritten form, then carry each boundary back through the
  // index map so the syllable a student sees is the original spelling.
  const flat = [];
  normed.forEach(({ norm: nw, map }, wi) => {
    const syls = syllabify(nw);
    let at = 0;
    const bounds = syls.map((s) => {
      const start = at;
      at += s.length;
      return [start, at];
    });
    bounds.forEach(([s, e], si) => {
      const origStart = map[s] ?? words[wi].length;
      const origEnd = e < map.length ? map[e] : words[wi].length;
      flat.push({
        text: words[wi].slice(origStart, origEnd) || syls[si],
        analysis: syls[si],
        wordIndex: wi,
        isWordFinal: si === syls.length - 1,
      });
    });
  });

  // Elision: a word ending in a vowel, diphthong or vowel+m elides before a
  // word starting with a vowel or h. The elided syllable is the final one.
  for (let i = 0; i < flat.length; i += 1) {
    const s = flat[i];
    if (!s.isWordFinal) continue;
    const nextWord = norm[s.wordIndex + 1];
    if (!nextWord) continue;
    const a = s.analysis;
    const endsVowelish =
      isVowel(a[a.length - 1]) ||
      (stripMacrons(a[a.length - 1]).toLowerCase() === 'm' &&
        a.length > 1 &&
        isVowel(a[a.length - 2]));
    const startsVowelish = isVowel(nextWord[0]) || nextWord[0].toLowerCase() === 'h';
    if (endsVowelish && startsVowelish) s.elides = true;
  }

  // Quantities for the syllables that count.
  for (let i = 0; i < flat.length; i += 1) {
    const s = flat[i];
    if (s.elides) continue;

    const a = s.analysis;
    const nu = nuclei(a);
    const last = nu[nu.length - 1];
    if (!last) { s.quantity = EITHER; continue; }

    const nucleusText = a.slice(last[0], last[0] + last[1]);
    const byNature = hasMacron(nucleusText) || last[1] === 2;

    // Consonants after this syllable's nucleus, continuing into the following
    // syllables and across the word boundary (elided syllables are skipped).
    const tail = a.slice(last[0] + last[1]);
    let count = trailingConsonantsForward(tail);
    let muteLiquidBreak = false;

    // Elision removes a vowel, not the consonants that close the syllable
    // before it: in `multum ille`, `mul` is long because l+t still stand, even
    // though -um is elided. So the following syllables are read for their
    // consonants whether or not they elide.
    if (count < 2 && i + 1 < flat.length) {
      const nextText = flat[i + 1].analysis;
      const lead = leadingConsonants(nextText);
      // A mute+liquid pair may or may not make position — the ambiguous case.
      const bare = stripMacrons(nextText.replace(/[^A-Za-zÀ-ÿĀ-ſȲȳ]/g, ''));
      if (count === 0 && /^[ptcbdgf][lr]/i.test(bare)) muteLiquidBreak = true;
      count += lead;
    }

    // Only two things are knowable from bare text: a diphthong, and a syllable
    // closed by two consonants. Quantity by nature is invisible without
    // macrons, so an open syllable is left OPEN and the metre decides it —
    // which is exactly the reasoning a student does when scanning.
    // mihi, tibi, sibi, ibi, ubi end in a vowel verse treats as either length,
    // whatever a text marks.
    const anceps = s.isWordFinal && /^(mihi|tibi|sibi|ibi|ubi)$/.test(stripMacrons(words[s.wordIndex]).toLowerCase());
    if (byNature && !anceps) s.quantity = LONG;
    else if (count >= 2) s.quantity = muteLiquidBreak ? EITHER : LONG;
    else s.quantity = macronized && !anceps ? SHORT : EITHER;
  }

  return flat;
}

/** Consonant sounds following the nucleus inside the same syllable. */
function trailingConsonantsForward(tail) {
  let n = 0;
  for (let i = 0; i < tail.length; i += 1) {
    const c = tail[i];
    const lc = stripMacrons(c).toLowerCase();
    if (lc === 'h') continue;
    if (isVowel(c)) break;
    if (!CONSONANT_RE.test(c)) continue;
    if (lc === 'x' || lc === 'z') { n += 2; continue; }
    n += 1;
  }
  return n;
}

/**
 * Find every foot arrangement consistent with the quantities. Feet 1–5 are
 * dactyl or spondee; foot 6 is two syllables and its second is anceps, so it
 * accepts anything.
 */
function solveFeet(syllables) {
  const metrical = syllables.filter((s) => !s.elides);
  const n = metrical.length;
  // 2 (foot 6) + 5 feet of 2 or 3 → 12..17 syllables.
  const dactyls = n - 12;
  if (dactyls < 0 || dactyls > 5) return [];

  const solutions = [];
  const pattern = [];

  /**
   * A long slot accepts anything: an open syllable may well be long by nature,
   * we simply cannot see it. A short slot rejects only what is *known* long —
   * a diphthong, or a syllable closed by two consonants. Every solution found
   * is therefore forced by the metre rather than guessed.
   */
  const fits = (q, needLong) => (needLong ? q !== SHORT : q !== LONG);

  const walk = (foot, idx, used) => {
    if (foot === 5) {
      // Foot 6: long + anceps.
      if (idx !== n - 2) return;
      if (!fits(metrical[idx].quantity, true)) return;
      solutions.push([...pattern, 'spondee']);
      return;
    }
    for (const kind of ['dactyl', 'spondee']) {
      const isDactyl = kind === 'dactyl';
      if (isDactyl && used >= dactyls) continue;
      if (!isDactyl && foot - used >= 5 - dactyls) continue;
      const len = isDactyl ? 3 : 2;
      if (idx + len > n - 2) continue;
      if (!fits(metrical[idx].quantity, true)) continue;
      if (isDactyl) {
        if (!fits(metrical[idx + 1].quantity, false)) continue;
        if (!fits(metrical[idx + 2].quantity, false)) continue;
      } else if (!fits(metrical[idx + 1].quantity, true)) continue;

      pattern.push(kind);
      walk(foot + 1, idx + len, used + (isDactyl ? 1 : 0));
      pattern.pop();
    }
  };

  walk(0, 0, 0);
  return solutions;
}

/** Caesurae, located from where word boundaries fall inside the feet. */
function findCaesurae(metrical, feet) {
  const out = [];
  // Index of the first syllable of each foot.
  const starts = [];
  let idx = 0;
  for (const f of feet) {
    starts.push(idx);
    idx += f === 'dactyl' ? 3 : 2;
  }

  const named = [
    [2, 'penthemimeral'], // after the long of foot 3
    [3, 'hephthemimeral'], // after the long of foot 4
    [1, 'trithemimeral'], // after the long of foot 2
  ];
  for (const [foot, type] of named) {
    const at = starts[foot];
    if (at === undefined) continue;
    // A caesura falls after the first (long) syllable of the foot.
    const s = metrical[at];
    if (s && s.isWordFinal) out.push({ afterSyllable: at, type });
  }
  // Bucolic diaeresis: word end at the close of foot 4.
  const endFoot4 = starts[4];
  if (endFoot4 !== undefined && metrical[endFoot4 - 1]?.isWordFinal) {
    out.push({ afterSyllable: endFoot4 - 1, type: 'bucolic' });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Source text                                                         */
/* ------------------------------------------------------------------ */

async function loadBook(book) {
  const cached = path.join(CACHE, `aen${book}.html`);
  if (!FETCH && existsSync(cached)) return readFile(cached, 'utf8');

  const res = await fetch(SRC(book));
  if (!res.ok) throw new Error(`fetch book ${book}: ${res.status}`);
  const html = await res.text();
  await mkdir(CACHE, { recursive: true });
  await writeFile(cached, html);
  return html;
}

/**
 * Pull verse lines out of the page, each with its line number.
 *
 * The Latin Library prints a number on every fifth line, and the page's number
 * is the authority: it follows the OCT where a count cannot (the page prints
 * transposed lines in their new order, 10.663 before 10.661, and leaves out
 * lines the editor deletes). So every printed number resets the count, in
 * either direction, and lines in between count on from it.
 *
 * Two page habits would otherwise knock the count off by one for the rest of
 * a book:
 *   - A verse wrapped onto a second page line. When the number sits on a short
 *     second part (4.540 `superbis 540`), the part is joined back on. When it
 *     sits on the first part (7.45 `maius opus moveo. 45`, then `Rex arva
 *     Latinus et urbes`), nothing on the page says which line is extra.
 *   - Half-lines (`disce omnis.`), which are verses and must be counted even
 *     though they cannot be scanned.
 * So after counting, any stretch between two printed numbers that holds the
 * wrong number of lines is dropped: a line with an uncertain citation is worse
 * than a missing one.
 */
function extractLines(html) {
  let text = html.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<[^>]+>/g, '');
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#151;/g, '—')
    .replace(/\u00a0/g, ' ');

  const lines = [];
  let lastNumber = 0;
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    // Skip navigation, headings and attribution.
    if (/^(The Latin Library|The Classics Page|The Latin|P\. VERGILI|VERGIL|LIBER|Vergil|Aeneid\b)/i.test(line)) continue;
    if (/^[IVXLC]+\.?$/.test(line)) continue;

    const m = line.match(/^(.*?)\s+(\d{1,4})$/);
    const content = m ? m[1].trim() : line;
    const printed = m ? Number(m[2]) : null;
    if (!/[a-zA-ZĀ-ſ]/.test(content)) continue;
    // Nothing on these pages this long is a verse.
    if (content.length > 90) continue;

    const prev = lines[lines.length - 1];
    if (printed !== null && prev && printed === prev.n && content.length < 12) {
      prev.latin = `${prev.latin} ${content}`;
      prev.printed = true;
      continue;
    }

    const n = printed ?? lastNumber + 1;
    lines.push({ n, latin: content, printed: printed !== null });
    lastNumber = n;
  }

  // Between two printed numbers there must be exactly the lines they imply.
  const keep = lines.map(() => true);
  let anchor = -1;
  lines.forEach((l, i) => {
    if (!l.printed) return;
    if (anchor >= 0 && l.n - lines[anchor].n !== i - anchor) {
      for (let k = anchor + 1; k < i; k += 1) keep[k] = false;
    }
    anchor = i;
  });

  return {
    lines: lines
      .filter((l, i) => keep[i] && l.latin.length >= 12)
      .map(({ n, latin }) => ({ n, latin: correct(latin) })),
    // The book's length is its last line number, now that the numbering can be
    // trusted: half-lines and dropped stretches still count as verses.
    verses: lines.reduce((m, l) => Math.max(m, l.n), 0),
  };
}

/* ------------------------------------------------------------------ */
/* The course's macronized readings                                    */
/* ------------------------------------------------------------------ */

/**
 * Level IV of the course reads the syllabus Aeneid with every long vowel
 * marked. Bare text leaves about a third of those lines open between two or
 * more scansions; the macrons settle most of them. Each reading step is
 * titled with its lines ("Aeneid 1.1–7") and holds one verse per entry, so a
 * line's number is the step's first line plus its place in the step.
 */
async function loadCourseLines() {
  const out = new Map();
  const dir = 'src/data/curriculum';
  if (!existsSync(dir)) return out;
  for (const level of readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory())) {
    for (const file of readdirSync(path.join(dir, level.name)).filter((f) => /^unit\d+\.ts$/.test(f))) {
      const { unit } = await import(pathToFileURL(path.resolve(dir, level.name, file)).href);
      for (const lesson of unit.lessons) {
        for (const step of lesson.steps) {
          if (step.kind !== 'read') continue;
          const m = /^Aeneid (\d+)\.(\d+)[–-](\d+)$/.exec(step.title ?? '');
          if (!m) continue;
          const [book, from, to] = m.slice(1).map(Number);
          if (to - from + 1 !== step.lines.length) continue; // not one verse per entry
          step.lines.forEach((l, i) => out.set(`${book}.${from + i}`, l.la));
        }
      }
    }
  }
  return out;
}

/** The same words letter for letter, ignoring marks, case, punctuation, u/v and i/j. */
const sameText = (a, b) => {
  const f = (s) => stripMacrons(s).toLowerCase().replace(/v/g, 'u').replace(/j/g, 'i').replace(/[^a-z]/g, '');
  return f(a) === f(b);
};

/** Long marks off, for display: a macron on screen would give the answer away. */
const unmark = (s) =>
  s.replace(/[āĀ]/g, (c) => (c === 'ā' ? 'a' : 'A')).replace(/[ēĒ]/g, (c) => (c === 'ē' ? 'e' : 'E'))
    .replace(/[īĪ]/g, (c) => (c === 'ī' ? 'i' : 'I')).replace(/[ōŌ]/g, (c) => (c === 'ō' ? 'o' : 'O'))
    .replace(/[ūŪ]/g, (c) => (c === 'ū' ? 'u' : 'U')).replace(/[ȳȲ]/g, (c) => (c === 'ȳ' ? 'y' : 'Y'));

/**
 * The scansion the course's macrons give for a line, or null. Only an answer
 * the bare text also allows is accepted, so a slip in the course's macrons can
 * at worst leave a line out, never put in a scansion the metre forbids.
 */
function settleWithMacrons(course, found) {
  const marked = (hasAmbiguous(course) ? [false, true] : [false])
    .map((alt) => analyseLine(course, alt, true))
    .filter(Boolean)
    .flatMap((syl) => solveFeet(syl).map((feet) => ({ syl, feet })));
  if (marked.length !== 1) return null;
  const { syl, feet } = marked[0];
  const elisions = (x) => x.map((y) => (y.elides ? 1 : 0)).join('');
  const match = found.filter(
    (f) => f.feet.join() === feet.join() && f.syl.length === syl.length && elisions(f.syl) === elisions(syl),
  );
  return match.length === 1 ? match[0] : null;
}

/* ------------------------------------------------------------------ */
/* Build                                                               */
/* ------------------------------------------------------------------ */

const stats = { total: 0, unique: 0, ambiguous: 0, unscannable: 0, settled: 0 };
const courseLines = await loadCourseLines();
/** Lines the bare text settles on its own where the course's macrons disagree. */
const disagreements = [];
const perBook = [];
const index = [];

await mkdir(OUT, { recursive: true });

for (const book of BOOKS) {
  const html = await loadBook(book);
  const { lines, verses } = extractLines(html);
  const solved = [];
  const bookStats = { book, total: 0, unique: 0, ambiguous: 0, unscannable: 0 };

  for (const { n, latin } of lines) {
    stats.total += 1;
    bookStats.total += 1;
    // Every reading of the line, and every arrangement each one allows. A word
    // that scans two ways (Trōia, aera) doubles the readings; the line is kept
    // only when exactly one reading-and-arrangement survives.
    if (hasSynizesis(latin)) { stats.ambiguous += 1; bookStats.ambiguous += 1; continue; }
    const readings = (hasAmbiguous(latin) ? [false, true] : [false])
      .map((alt) => analyseLine(latin, alt))
      .filter(Boolean);
    if (readings.length === 0) { stats.unscannable += 1; bookStats.unscannable += 1; continue; }

    const found = readings.flatMap((syl) => solveFeet(syl).map((feet) => ({ syl, feet })));
    if (found.length === 0) { stats.unscannable += 1; bookStats.unscannable += 1; continue; }

    const course = courseLines.get(`${book}.${n}`);
    const marked = course && sameText(course, latin) ? course : null;
    let chosen = found.length === 1 ? found[0] : null;
    if (!chosen && marked) {
      chosen = settleWithMacrons(marked, found);
      if (chosen) stats.settled += 1;
    } else if (chosen && marked) {
      // An audit of the course's macrons against lines the metre settles alone.
      const check = settleWithMacrons(marked, found);
      if (!check) disagreements.push(`${book}.${n}  ${marked}`);
    }
    if (!chosen) { stats.ambiguous += 1; bookStats.ambiguous += 1; continue; }

    const { syl: syllables, feet } = chosen;
    const metrical = syllables.filter((s) => !s.elides);

    // Resolve every `either` against the winning arrangement, so the answer
    // key is fully determined rather than carrying an ambiguity forward.
    const resolved = [];
    let i = 0;
    for (const f of feet) {
      const len = f === 'dactyl' ? 3 : 2;
      resolved.push(LONG);
      for (let k = 1; k < len; k += 1) resolved.push(f === 'dactyl' ? SHORT : LONG);
      i += len;
    }
    /*
     * Stored compactly, because the whole corpus is ~6,500 lines and the
     * client fetches a book at a time. Quantities are NOT stored: the foot
     * pattern determines every one of them (a dactyl is long-short-short, a
     * spondee long-long), so the decoder reconstructs them and the file only
     * has to carry what cannot be derived — the syllable text, which
     * syllables elide, and the feet.
     *
     *   s  syllables, "|" inside a word and " " between words
     *   f  feet, one character each: D dactyl, S spondee
     *   e  indices of elided syllables
     *   c  caesurae as "<index><type>", type p/h/t/b
     */
    const sylString = syllables
      .map((s, i) => {
        const prev = syllables[i - 1];
        const sep = i === 0 ? '' : prev.wordIndex === s.wordIndex ? '|' : ' ';
        return sep + unmark(s.text);
      })
      .join('');

    const CAESURA_CODE = {
      penthemimeral: 'p',
      hephthemimeral: 'h',
      trithemimeral: 't',
      bucolic: 'b',
    };

    solved.push({
      i: n,
      t: unmark(latin),
      s: sylString,
      f: feet.map((x) => (x === 'dactyl' ? 'D' : 'S')).join(''),
      e: syllables.map((s, i) => (s.elides ? i : -1)).filter((i) => i >= 0),
      c: findCaesurae(metrical, feet)
        .map((x) => `${x.afterSyllable}${CAESURA_CODE[x.type]}`)
        .join(','),
    });
    stats.unique += 1;
    bookStats.unique += 1;
  }

  await writeFile(
    path.join(OUT, `aen${book}.json`),
    JSON.stringify({ b: book, n: solved.length, l: solved }),
  );
  index.push({ book, count: solved.length, sourceCount: verses });
  perBook.push(bookStats);
  process.stdout.write(`  Book ${String(book).padStart(2)}: ${String(solved.length).padStart(4)} lines\n`);
}

await writeFile(
  path.join(OUT, 'index.json'),
  JSON.stringify({
    work: 'Aeneid',
    author: 'Vergil',
    source: 'The Latin Library (public domain)',
    generated: new Date().toISOString().slice(0, 10),
    books: index,
    total: index.reduce((a, b) => a + b.count, 0),
    // How many verse lines this book's source text actually has, before any
    // are dropped for ambiguous or unsolvable scansion — so a consumer can
    // report "X of Y lines available" honestly instead of presenting the
    // scanned count as the whole poem.
    sourceTotal: index.reduce((a, b) => a + b.sourceCount, 0),
  }),
);

const pct = (x, of) => `${((x / of) * 100).toFixed(1)}%`;

/* Per-book coverage: how much of each book actually made it into the
   corpus, and why the rest was dropped. Reporting only — this does not
   change which lines get dropped, just makes the gaps visible instead of
   a single opaque aggregate. */
console.log(`
  book  in source  emitted  dropped (ambiguous)  dropped (no solution)`);
for (const b of perBook) {
  console.log(
    `  ${String(b.book).padStart(4)}  ${String(b.total).padStart(9)}  ` +
      `${String(b.unique).padStart(7)} (${pct(b.unique, b.total)})  ` +
      `${String(b.ambiguous).padStart(19)}  ${String(b.unscannable).padStart(21)}`,
  );
}

console.log(`
  lines read      ${stats.total}
  scanned         ${stats.unique}  (${pct(stats.unique, stats.total)})
  ambiguous       ${stats.ambiguous}  (${pct(stats.ambiguous, stats.total)})  — dropped
  no solution     ${stats.unscannable}  (${pct(stats.unscannable, stats.total)})  — dropped
  settled by the course's macrons: ${stats.settled}
`);
if (disagreements.length) {
  console.log(`  ${disagreements.length} line(s) where the course's macrons disagree with the metre:`);
  for (const d of disagreements) console.log(`    ${d}`);
}
