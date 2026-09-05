import { coreVocabulary } from '@/data/vocabulary';
import { supplementaryVocabulary } from '@/data/supplementaryVocabulary';
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
  'untur', 'atur', 'etur', 'itur', 'ri', 'bantur', 'batur', 'bant', 'bimus', 'bitis',
  'amus', 'atis', 'emus', 'etis', 'imus', 'itis', 'unt', 'ant', 'ent', 'at', 'et',
  'bat', 'bam', 'bit', 'bis', 'bo', 'mus', 'tis', 'ere', 'are', 'ire', 'ae', 'am',
  'as', 'is', 'os', 'us', 'um', 'em', 'es', 'ei', 'ia', 'ibus',
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

/** Exported only for scripts/build-supplement.mjs, which needs to test
 *  candidate dictionary entries against the exact same matching logic the
 *  app itself uses at runtime, rather than a second, drifting copy of it. */
export interface Index {
  /** Normalised headword -> entries. */
  byHeadword: Map<string, VocabEntry[]>;
  /** Every alternative form listed in a lemma (e.g. "a, ab, abs"). */
  byAnyForm: Map<string, VocabEntry[]>;
  /** Stems of length >= 3, for inflected-form matching. */
  byStem: Map<string, VocabEntry[]>;
}

function push(map: Map<string, VocabEntry[]>, key: string, e: VocabEntry) {
  if (!key) return;
  const cur = map.get(key);
  if (cur) {
    if (!cur.includes(e)) cur.push(e);
  } else map.set(key, [e]);
}

/**
 * Builds one of the two lookup tiers — the core CED list and the
 * supplementary dictionary both go through this, so a word is found (or
 * not) the same way regardless of which list it lives on.
 */
export function buildIndex(entries: VocabEntry[]): Index {
  const byHeadword = new Map<string, VocabEntry[]>();
  const byAnyForm = new Map<string, VocabEntry[]>();
  const byStem = new Map<string, VocabEntry[]>();

  for (const e of entries) {
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
    // Strip a trailing gender/declension parenthetical — "(f.)", "(m. or f.)"
    // — before normalising: normalizeWord only deletes non-letters, so left
    // in place it would fuse onto the word (e.g. "partis (f.)" -> "partisf"),
    // corrupting every full-genitive noun this loop was meant to index.
    for (const part of e.lemma.split(',').slice(1)) {
      const p = part.replace(/\(.*?\)/g, '').trim();
      let w: string | null = null;
      if (p.startsWith('-')) {
        // Dictionary-style abbreviated infinitive ("gero, -ere" means
        // "gerere"): reconstructed only for the "-are"/"-ere"/"-ire"
        // present-infinitive pattern, never for an abbreviated noun/adjective
        // genitive ("corpus, -oris") — how much of the headword one of those
        // replaces varies by declension and hidden stem changes (rhotacism,
        // syncope, a hidden nasal), exactly what the hand-checked NOUN_STEMS
        // table below exists to get right by hand, where a wrong mechanical
        // guess would corrupt the index.
        //
        // Every verb's 1st principal part ends "-o", so that always drops.
        // Whether a thematic vowel drops with it depends on the conjugation,
        // and is not always visible from the suffix alone — "capio, -ere"
        // and "abeo, -ire" both drop a vowel that neither given suffix
        // starts with ("capere", "abire"), while "induo, -ere" (an "-uo"
        // verb, root-final "u", not a thematic vowel) keeps its "u"
        // ("induere"). What actually distinguishes them is the headword
        // itself: "a"/"e"/"i" immediately before the final "-o" is always a
        // thematic vowel absorbed into 1st singular "-o" and restored by the
        // infinitive ending (moveo -> mov+ere, capio -> cap+ere, abeo ->
        // ab+ire); "u" there is part of the root and never drops (induo ->
        // indu+ere); anything else is a consonant stem with no vowel to drop
        // (gero -> ger+ere).
        const suffix = p.slice(1);
        if (/^(are|ere|ire)$/.test(suffix) && head.length >= 2) {
          const dropsVowel = /[aei]/.test(head[head.length - 2] ?? '');
          w = head.slice(0, dropsVowel ? -2 : -1) + suffix;
        } else if (suffix === 'i' && head.endsWith('or') && head.length >= 3) {
          // A deponent's 1st principal part ends "-or", not "-o" — same
          // vowel-drop test, one position further in ("patior, -i" ->
          // pat+i -> "pati"; "sequor, -i" -> sequ+i -> "sequi", the "u"
          // there being root, not thematic, exactly as for active "induo").
          const dropsVowel = /[aei]/.test(head[head.length - 3] ?? '');
          w = head.slice(0, dropsVowel ? -3 : -2) + suffix;
        }
      } else {
        w = normalizeWord(p);
      }
      if (!w) continue;
      if (w.length >= 4) for (const s of stemOf(w)) if (s.length >= 3) push(byStem, s, e);
      // The present stem itself — infinitive minus just "-re" — for a verb's
      // "-are"/"-ere"/"-ire" infinitive. `stemOf` above only strips whole
      // endings like "-are"/"-ere" (to the bare root, e.g. "am-"/"ger-") or a
      // lone "-e" (to "amar-"/"gerer-"); neither lands on "ama-"/"gere-", the
      // vowel-bearing stem the present indicative plural and the imperfect
      // are actually built on ("ama-mus", "gere-bat", "vide-batur"). Without
      // this, no such form of a regular verb in these patterns resolves —
      // including, for "-are" verbs, the ordinary present tense itself
      // (amat, amamus) once its stem is longer than the single bare
      // consonant root stemOf's generic endings reduce it to.
      if (w.length >= 5 && (w.endsWith('are') || w.endsWith('ere') || w.endsWith('ire'))) {
        const presentStem = w.slice(0, -2);
        if (presentStem.length >= 3) push(byStem, presentStem, e);
      }
    }
  }

  return { byHeadword, byAnyForm, byStem };
}

export const coreIndex = buildIndex(coreVocabulary);

/**
 * Inflected forms of the handful of words the suffix-stripping stemmer above
 * cannot derive on its own: irregular/suppletive verbs and pronouns (sum,
 * possum, is, hic, ille, qui, quis, idem, ipse), and the small set of 1st/2nd
 * declension adjectives whose headword strips to a stem under the stemmer's
 * 3-character floor (meus, tuus, suus, unus) — "su-", "me-", "tu-", "un-"
 * never get indexed, so no inflected form of those four words resolved
 * before this table existed. Every form below is a standard textbook
 * paradigm of a word already present in the core list; this only teaches the
 * index forms it already has a correct entry for, it does not add new
 * headwords or definitions.
 */
const EXTRA_FORMS: Record<string, string> = {
  // sum, esse, fui — "to be"
  sum: 'sum', es: 'sum', est: 'sum', sumus: 'sum', estis: 'sum', sunt: 'sum',
  eram: 'sum', eras: 'sum', erat: 'sum', eramus: 'sum', eratis: 'sum', erant: 'sum',
  ero: 'sum', eris: 'sum', erit: 'sum', erimus: 'sum', eritis: 'sum', erunt: 'sum',
  fui: 'sum', fuisti: 'sum', fuit: 'sum', fuimus: 'sum', fuistis: 'sum', fuerunt: 'sum', fuere: 'sum',
  fueram: 'sum', fueras: 'sum', fuerat: 'sum', fueramus: 'sum', fueratis: 'sum', fuerant: 'sum',
  fuero: 'sum', fueris: 'sum', fuerit: 'sum', fuerimus: 'sum', fueritis: 'sum', fuerint: 'sum',
  sim: 'sum', sis: 'sum', sit: 'sum', simus: 'sum', sitis: 'sum', sint: 'sum',
  essem: 'sum', esses: 'sum', esset: 'sum', essemus: 'sum', essetis: 'sum', essent: 'sum',
  forem: 'sum', fores: 'sum', foret: 'sum', forent: 'sum', fore: 'sum',
  fuerim: 'sum',
  fuissem: 'sum', fuisses: 'sum', fuisset: 'sum', fuissemus: 'sum', fuissetis: 'sum', fuissent: 'sum',
  esse: 'sum', fuisse: 'sum', este: 'sum', futurus: 'sum', futura: 'sum', futurum: 'sum',
  // possum, posse, potui — "to be able"
  possum: 'possum', potes: 'possum', potest: 'possum', possumus: 'possum', potestis: 'possum', possunt: 'possum',
  poteram: 'possum', poteras: 'possum', poterat: 'possum', poteramus: 'possum', poteratis: 'possum', poterant: 'possum',
  potero: 'possum', poteris: 'possum', poterit: 'possum', poterimus: 'possum', poteritis: 'possum', poterunt: 'possum',
  potui: 'possum', potuisti: 'possum', potuit: 'possum', potuimus: 'possum', potuistis: 'possum', potuerunt: 'possum', potuere: 'possum',
  possim: 'possum', possis: 'possum', possit: 'possum', possimus: 'possum', possitis: 'possum', possint: 'possum',
  possem: 'possum', posses: 'possum', posset: 'possum', possemus: 'possum', possetis: 'possum', possent: 'possum',
  potuerim: 'possum', potuisset: 'possum', potuissem: 'possum',
  posse: 'possum', potuisse: 'possum',
  // is, ea, id — "he, she, it; this, that"
  eius: 'is', ei: 'is', eum: 'is', eam: 'is', eo: 'is', ea: 'is',
  ii: 'is', eae: 'is', eorum: 'is', earum: 'is', iis: 'is', eis: 'is', eos: 'is', eas: 'is',
  // hic, haec, hoc — "this"
  huius: 'hic', huic: 'hic', hunc: 'hic', hanc: 'hic', hac: 'hic',
  hi: 'hic', hae: 'hic', horum: 'hic', harum: 'hic', his: 'hic', hos: 'hic', has: 'hic',
  // ille, illa, illud — "that"
  illius: 'ille', illi: 'ille', illum: 'ille', illam: 'ille', illo: 'ille',
  illae: 'ille', illorum: 'ille', illarum: 'ille', illis: 'ille', illos: 'ille', illas: 'ille',
  // qui, quae, quod — relative "who, which"
  cuius: 'qui', cui: 'qui', quem: 'qui', quam: 'qui', quo: 'qui', qua: 'qui',
  quorum: 'qui', quarum: 'qui', quibus: 'qui', quos: 'qui', quas: 'qui',
  // quis, quid — interrogative/indefinite "who, what"
  quid: 'quis',
  // idem, eadem, idem — "the same" (is + -dem)
  eiusdem: 'idem', eidem: 'idem', eundem: 'idem', eandem: 'idem', eodem: 'idem',
  iidem: 'idem', eaedem: 'idem', eorundem: 'idem', earundem: 'idem', eisdem: 'idem', eosdem: 'idem', easdem: 'idem',
  // ipse, ipsa, ipsum — "self"
  ipsius: 'ipse', ipsi: 'ipse', ipsam: 'ipse', ipso: 'ipse',
  ipsorum: 'ipse', ipsarum: 'ipse', ipsis: 'ipse', ipsos: 'ipse', ipsas: 'ipse',
  // meus, tuus, suus, unus — regular 1st/2nd declension adjectives, but the
  // headword's stem ("me-", "tu-", "su-", "un-") is under the stemmer's
  // 3-character floor, so no form of these ever indexed via `byStem`.
  meus: 'meus', mea: 'meus', meum: 'meus', meam: 'meus', mei: 'meus', meae: 'meus', meo: 'meus',
  meorum: 'meus', mearum: 'meus', meis: 'meus', meos: 'meus', meas: 'meus', mi: 'meus',
  tuus: 'tuus', tua: 'tuus', tuum: 'tuus', tuam: 'tuus', tui: 'tuus', tuae: 'tuus', tuo: 'tuus',
  tuorum: 'tuus', tuarum: 'tuus', tuis: 'tuus', tuos: 'tuus', tuas: 'tuus',
  suus: 'suus', sua: 'suus', suum: 'suus', suam: 'suus', suae: 'suus', suo: 'suus',
  suorum: 'suus', suarum: 'suus', suis: 'suus', suos: 'suus', suas: 'suus',
  unius: 'unus', uni: 'unus', unum: 'unus', unam: 'unus', uno: 'unus', una: 'unus',
  // alius, alia, aliud — like unus/ullus/totus/solus/nullus, a pronominal
  // adjective with an irregular neuter in -ud instead of the regular -um
  // the stemmer expects.
  aliud: 'alius',
  // res, rei and dies, diei — the two common 5th-declension nouns. 5th
  // declension has its own case endings entirely (-ei, -em, -e, -erum,
  // -ebus), none of which are in the regular ENDINGS table, so no oblique
  // form of either word resolved before this.
  rei: 'res', rem: 'res', re: 'res', rerum: 'res', rebus: 'res',
  diei: 'dies', diem: 'dies', die: 'dies', dierum: 'dies', diebus: 'dies',
  // ex, e — "out of, from" (the one-letter alternate form the generic
  // lemma-parser above deliberately excludes, since it would also pick up
  // stray gender-abbreviation letters like the "f."/"m."/"n." in other
  // entries' lemmas).
  e: 'ex',
  // os, oris (n.) — "mouth, face". Rhotacised like corpus/tempus/genus in
  // NOUN_STEMS below, but the headword itself is only two letters, under
  // the stemmer's 3-character floor, so — same class of gap as meus/tuus/
  // suus/unus above — no form of it, including the headword's own oblique
  // stem "or-", could ever be indexed via `byStem` at all.
  oris: 'os', ori: 'os', ore: 'os', ora: 'os', orum: 'os', oribus: 'os',
  // fero, ferre, tuli, latum — irregular, so its passive forms (built on
  // the present stem "fer-" plus ordinary passive endings, but with no
  // thematic vowel to trigger the "-ere"/"-ire" present-stem indexing
  // above, since "ferre" itself is irregular and not one of those) never
  // resolved: fertur ("it is said/carried") is common idiom in narrative.
  fertur: 'fero', feruntur: 'fero', ferebatur: 'fero', ferebantur: 'fero', ferri: 'fero',
};

for (const [form, headword] of Object.entries(EXTRA_FORMS)) {
  for (const entry of coreIndex.byHeadword.get(normalizeWord(headword)) ?? []) {
    push(coreIndex.byAnyForm, normalizeWord(form), entry);
  }
}

/**
 * Oblique-case stems for nouns and adjectives whose 3rd-declension genitive
 * differs from the nominative by more than the ordinary case ending —
 * rhotacism (genus → gener-), a hidden nasal (homo → homin-, agmen →
 * agmin-), syncope (pater → patr-), or a consonant shift the nominative
 * spelling hides entirely (nox → noct- is fine already because the lemma
 * gives it in full; corpus → corpor- is not, because the dictionary entry
 * abbreviates it as "-oris"). `stemOf()` above always includes the
 * unmodified headword as a candidate stem, which is correct when the
 * genitive really is just "nominative + ending" (amor → amoris, consul →
 * consulis need nothing here) — this table exists only for the words where
 * that assumption fails. Every stem below is the standard textbook genitive
 * of a word already present in the core list with a correct definition;
 * this only extends which of its own forms the index can find.
 */
const NOUN_STEMS: Record<string, string> = {
  // -us (n.) s-stem neuters, rhotacised in oblique cases
  corpus: 'corpor', tempus: 'tempor', genus: 'gener', opus: 'oper', vulnus: 'vulner',
  munus: 'muner', litus: 'litor', latus: 'later', pectus: 'pector', scelus: 'sceler',
  nemus: 'nemor', sidus: 'sider',
  flos: 'flor',
  // -o (m./f.) nouns with a hidden -in-/-on- stem
  homo: 'homin', caligo: 'caligin', imago: 'imagin', virgo: 'virgin', ordo: 'ordin',
  legio: 'legion', oratio: 'oration', ratio: 'ration', sermo: 'sermon', multitudo: 'multitudin',
  carthago: 'carthagin', dido: 'didon', iuno: 'iunon', nemo: 'nemin',
  // -men (n.), stem in -min-
  agmen: 'agmin', carmen: 'carmin', crimen: 'crimin', flumen: 'flumin', limen: 'limin',
  lumen: 'lumin', nomen: 'nomin', numen: 'numin',
  caput: 'capit',
  // -es (m.), stem in -it-/-ip-
  comes: 'comit', eques: 'equit', miles: 'milit', hospes: 'hospit', princeps: 'princip',
  // -ex (m./f.), stem in -ic-
  iudex: 'iudic', vertex: 'vertic', pumex: 'pumic',
  // -is (m.) with a hidden nasal
  lapis: 'lapid', sanguis: 'sanguin',
  // -tas (f.), stem in -tat-
  civitas: 'civitat', aestas: 'aestat', aetas: 'aetat', celeritas: 'celeritat',
  cupiditas: 'cupiditat', libertas: 'libertat', potestas: 'potestat', tempestas: 'tempestat',
  voluptas: 'voluptat',
  // -us (f.), stem in -ut-/-ur-
  salus: 'salut', virtus: 'virtut', tellus: 'tellur',
  hiems: 'hiem',
  coniunx: 'coniug',
  // -er (m./f.) with syncope
  frater: 'fratr', pater: 'patr', mater: 'matr',
  pallas: 'pallant', laocoon: 'laocoont', harpocras: 'harpocrat',
  // Present-participle-type adjectives and nouns, stem in -nt-
  ardens: 'ardent', diligens: 'diligent', ingens: 'ingent', infans: 'infant',
  potens: 'potent', prudens: 'prudent', sapiens: 'sapient', vehemens: 'vehement', cliens: 'client',
  // -x adjectives, stem in -c-
  audax: 'audac', felix: 'felic', ferox: 'feroc',
  dives: 'divit', vetus: 'veter',
};

for (const [headword, stem] of Object.entries(NOUN_STEMS)) {
  // Written above in ordinary spelling for readability — normalise here
  // rather than by hand, so a "v" or "j" in either column can't slip
  // through unconverted the way an already-normalised literal could.
  for (const entry of coreIndex.byHeadword.get(normalizeWord(headword)) ?? []) {
    push(coreIndex.byStem, normalizeWord(stem), entry);
  }
}

/**
 * The second lookup tier: real Latin outside the required 990-word list,
 * generated from a standard dictionary — see the comment on
 * `supplementaryVocabulary` for where it comes from and why it exists.
 * Consulted only when the core list finds nothing at all, so a supplementary
 * entry never displaces or outranks a real CED-list answer.
 */
const supplementaryIndex = buildIndex(supplementaryVocabulary);

/**
 * A handful of supplementary-list forms the generic stemmer and lemma parser
 * cannot derive on their own: Greek-declension endings on the hand-added
 * proper nouns, which follow neither the regular Latin `ENDINGS` nor the
 * ordinary "headword, genitive" lemma shape those tables assume.
 */
const SUPPLEMENTARY_EXTRA_FORMS: Record<string, string> = {
  // Aeneas, -ae — Greek 1st-declension accusative in "-an", not the Latin
  // "-am" the stemmer expects (e.g. Aeneid 1.617 "ipse... Aenean acciri").
  aenean: 'aeneas',
};

for (const [form, headword] of Object.entries(SUPPLEMENTARY_EXTRA_FORMS)) {
  for (const entry of supplementaryIndex.byHeadword.get(normalizeWord(headword)) ?? []) {
    push(supplementaryIndex.byAnyForm, normalizeWord(form), entry);
  }
}

/** The three Latin enclitics that attach directly onto a word with no space
 *  — "-que" (and), "-ve" (or), "-ne" (the question marker) — checked longest
 *  first since "-ve" is a suffix of neither of the others. Written "ue", not
 *  "ve": every word reaching this has already gone through `normalizeWord`,
 *  which folds "v" to "u", so the literal "ve" spelling would never match. */
const ENCLITICS = ['que', 'ue', 'ne'];

export function lookupIn(index: Index, w: string): LookupResult[] {
  // An entry indexed under both its headword and its inflected forms would
  // otherwise be listed twice — dedupe as we merge, not afterwards.
  const seen = new Set<string>();
  const results: LookupResult[] = [];
  for (const entry of [...(index.byHeadword.get(w) ?? []), ...(index.byAnyForm.get(w) ?? [])]) {
    if (seen.has(entry.id)) continue;
    seen.add(entry.id);
    results.push({ entry, match: 'exact' as const, stemLength: w.length });
  }

  // Longest stems first so "amaverunt" prefers `amo` over a short accidental match.
  const stems = stemOf(w).sort((a, b) => b.length - a.length);
  for (const s of stems) {
    if (s.length < 3) continue;
    for (const entry of index.byStem.get(s) ?? []) {
      if (seen.has(entry.id)) continue;
      seen.add(entry.id);
      results.push({ entry, match: 'stem', stemLength: s.length });
    }
    if (results.length >= 6) break;
  }

  return results;
}

/** `lookupIn`, but retried with a trailing enclitic peeled off if nothing
 *  matched outright — see `ENCLITICS`. A word that resolved on its own is
 *  never retried this way: "atque", "neque", "itaque", "denique" and the
 *  rest are themselves headwords, matched before this ever runs. */
function lookupWithEnclitic(index: Index, w: string): LookupResult[] {
  const direct = lookupIn(index, w);
  if (direct.length > 0) return direct;
  for (const suffix of ENCLITICS) {
    // Remaining stem must be at least 2 letters — enough for a real short
    // word ("te" + "-que" = "teque", "ut" + "-que" = "utque") without
    // stripping an enclitic off something that only coincidentally ends the
    // same way.
    if (w.length >= suffix.length + 2 && w.endsWith(suffix)) {
      const stripped = lookupIn(index, w.slice(0, -suffix.length));
      if (stripped.length > 0) return stripped;
    }
  }
  return [];
}

/**
 * Look up an inflected Latin word, first against the CED core vocabulary,
 * then — only if that finds nothing — against the supplementary dictionary
 * of real Latin outside the required list.
 *
 * This is a stem-matching heuristic, not a morphological analyser: it returns
 * candidates ranked by how much of the word they explain. The UI labels
 * stem matches as such, and the "ask about this line" AI action is the route
 * to a real parse in context.
 */
export function lookup(word: string): LookupResult[] {
  const w = normalizeWord(word);
  if (w.length < 1) return [];

  const core = lookupWithEnclitic(coreIndex, w);
  const results = core.length > 0 ? core : lookupWithEnclitic(supplementaryIndex, w);

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
