/**
 * Builds the scansion corpus from the full text of the Aeneid.
 *
 *   node scripts/build-scansion.mjs [--fetch] [--out public/scansion]
 *
 * Source: The Latin Library's Vergil, which carries vowel-quantity macrons
 * throughout — that is the whole reason this is tractable. Quantity by nature
 * cannot be recovered from unmarked text, so a macronised source is what lets
 * us produce an answer key rather than a guess.
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
import { existsSync } from 'node:fs';
import path from 'node:path';

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
const PLAIN_VOWELS = 'aeiouyAEIOUY';
const VOWELS = PLAIN_VOWELS + MACRONS;
const DIPHTHONGS = ['ae', 'au', 'ei', 'eu', 'oe', 'ui'];

const stripMacrons = (s) =>
  s
    .replace(/[āĀ]/g, 'a').replace(/[ēĒ]/g, 'e').replace(/[īĪ]/g, 'i')
    .replace(/[ōŌ]/g, 'o').replace(/[ūŪ]/g, 'u').replace(/[ȳȲ]/g, 'y');

const isVowel = (c) => VOWELS.includes(c);
const hasMacron = (s) => [...s].some((c) => MACRONS.includes(c));

/**
 * ae, au and oe are always diphthongs. eu, ei and ui almost never are: `deum`
 * is de-um, `meus` is me-us, `tuī` is tu-ī. Treating those as diphthongs loses
 * a syllable and the foot search then finds no solution at all, so they are
 * allowed only in the closed set of words where they genuinely are one.
 */
const EU_WORDS = /^(heu|eheu|heus|seu|ceu|neu|neu[dt]er)/;
const EU_GREEK = /(orpheu|orphe|theseu|peleu|tydeu|īleu|nēreu|acheu|prōteu|erectheu|capaneu|salmōneu|idomeneu)/;
const EI_WORDS = /^(deinde|dein|deinceps|hei|ei)$/;
const UI_WORDS = /^(cui|huic|huius|cuius|quoi)$/;

function isDiphthongAt(word, i) {
  const pair = stripMacrons(word.slice(i, i + 2)).toLowerCase();
  if (!DIPHTHONGS.includes(pair)) return false;
  if (pair === 'ae' || pair === 'au' || pair === 'oe') return true;

  const w = stripMacrons(word).toLowerCase();
  if (pair === 'eu') return EU_WORDS.test(w) || EU_GREEK.test(w);
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
    const bare = cluster.replace(/[^A-Za-zÀ-ÿĀ-ſ]/g, '');
    const n = bare.length;

    let cut;
    if (n === 0) cut = end + 1;
    else if (n === 1) cut = end + 1;
    else {
      const last2 = stripMacrons(bare.slice(-2)).toLowerCase();
      // qu counts as a single consonant and goes forward with the vowel.
      if (last2 === 'qu' || last2 === 'gu') cut = nextStart - 2;
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
  const V = 'aeiouyāēīōūȳAEIOUYĀĒĪŌŪȲ';
  const isV = (c) => c !== undefined && V.includes(c);

  for (let i = 0; i < word.length; i += 1) {
    const c = word[i];
    const isI = c === 'i' || c === 'I';
    if (isI && i === 0 && isV(word[1])) {
      chars.push(c === 'I' ? 'J' : 'j');
      map.push(i);
      continue;
    }
    if (isI && isV(word[i - 1]) && isV(word[i + 1])) {
      // Doubles: the preceding syllable closes on the first j.
      chars.push('j', 'j');
      map.push(i, i);
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
function analyseLine(raw) {
  const words = raw
    .split(/\s+/)
    .map((w) => w.replace(/[^A-Za-zÀ-ÿĀ-ſ]/g, ''))
    .filter(Boolean);
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
      const bare = stripMacrons(nextText.replace(/[^A-Za-zÀ-ÿĀ-ſ]/g, ''));
      if (count === 0 && /^[ptcbdgf][lr]/i.test(bare)) muteLiquidBreak = true;
      count += lead;
    }

    // Only two things are knowable from bare text: a diphthong, and a syllable
    // closed by two consonants. Quantity by nature is invisible without
    // macrons, so an open syllable is left OPEN and the metre decides it —
    // which is exactly the reasoning a student does when scanning.
    if (byNature) s.quantity = LONG;
    else if (count >= 2) s.quantity = muteLiquidBreak ? EITHER : LONG;
    else s.quantity = EITHER;
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
 * Pull verse lines out of the page. The Latin Library marks every fifth line
 * with its number; lines in between are unnumbered, so numbering is carried
 * forward from the last marker.
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
    .replace(/ /g, ' ');

  const out = [];
  let lastNumber = 0;
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    // Skip navigation, headings and attribution.
    if (/^(The Latin Library|The Classics Page|The Latin|P\. VERGILI|VERGIL|LIBER|Vergil)/i.test(line)) continue;
    if (/^[IVXLC]+\.?$/.test(line)) continue;

    const m = line.match(/^(.*?)\s{2,}(\d{1,4})$/) || line.match(/^(.*?)\s+(\d{1,4})$/);
    let content = line;
    let number = null;
    if (m && Number(m[2]) > lastNumber && Number(m[2]) - lastNumber <= 12) {
      content = m[1].trim();
      number = Number(m[2]);
    }
    if (!/[a-zA-ZĀ-ſ]/.test(content)) continue;
    // A verse line of the Aeneid is never this short or this long.
    if (content.length < 12 || content.length > 90) continue;

    lastNumber = number ?? lastNumber + 1;
    out.push({ n: lastNumber, latin: content });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Build                                                               */
/* ------------------------------------------------------------------ */

const stats = { total: 0, unique: 0, ambiguous: 0, unscannable: 0 };
const index = [];

await mkdir(OUT, { recursive: true });

for (const book of BOOKS) {
  const html = await loadBook(book);
  const lines = extractLines(html);
  const solved = [];

  for (const { n, latin } of lines) {
    stats.total += 1;
    const syllables = analyseLine(latin);
    if (!syllables) { stats.unscannable += 1; continue; }

    const solutions = solveFeet(syllables);
    if (solutions.length === 0) { stats.unscannable += 1; continue; }
    if (solutions.length > 1) { stats.ambiguous += 1; continue; }

    const feet = solutions[0];
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
        return sep + s.text;
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
      t: latin,
      s: sylString,
      f: feet.map((x) => (x === 'dactyl' ? 'D' : 'S')).join(''),
      e: syllables.map((s, i) => (s.elides ? i : -1)).filter((i) => i >= 0),
      c: findCaesurae(metrical, feet)
        .map((x) => `${x.afterSyllable}${CAESURA_CODE[x.type]}`)
        .join(','),
    });
    stats.unique += 1;
  }

  await writeFile(
    path.join(OUT, `aen${book}.json`),
    JSON.stringify({ b: book, n: solved.length, l: solved }),
  );
  index.push({ book, count: solved.length });
  process.stdout.write(`  Book ${String(book).padStart(2)}: ${String(solved.length).padStart(4)} lines\n`);
}

await writeFile(
  path.join(OUT, 'index.json'),
  JSON.stringify({
    work: 'Aeneid',
    author: 'Vergil',
    source: 'The Latin Library (public domain, macronised)',
    generated: new Date().toISOString().slice(0, 10),
    books: index,
    total: index.reduce((a, b) => a + b.count, 0),
  }),
);

const pct = (x) => `${((x / stats.total) * 100).toFixed(1)}%`;
console.log(`
  lines read      ${stats.total}
  scanned         ${stats.unique}  (${pct(stats.unique)})
  ambiguous       ${stats.ambiguous}  (${pct(stats.ambiguous)})  — dropped
  no solution     ${stats.unscannable}  (${pct(stats.unscannable)})  — dropped
`);
