import { coreVocabulary } from '@/data/vocabulary';
import { supplementaryVocabulary } from '@/data/supplementaryVocabulary';
import { VOCAB_DISAMBIGUATION, type VocabDisambiguationEntry } from '@/data/vocabDisambiguation';
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
  // Pluperfect indicative, full paradigm (eram already covered 1sg; the
  // rest never did, so no pluperfect but the 1st singular resolved before).
  'ibus', 'orum', 'arum', 'erunt', 'eram', 'erat', 'eras', 'erant', 'eratis', 'eramus',
  'issem', 'isset', 'antur', 'entur', 'untur', 'atur', 'etur', 'itur', 'ri',
  // Future passive/deponent 3rd plural (-buntur), missing next to the
  // imperfect's "-bantur" above — amabuntur/videbuntur land on "ama-"/
  // "vide-" the same way.
  'bantur', 'buntur', 'batur', 'bant', 'bimus', 'bitis',
  // Present passive/deponent 1st/2nd plural, both the bare form 1st/2nd/
  // 4th conjugation (and 3rd-io, whose stem already has the "-i-") need
  // and the "-i-"/"-a-" linked forms bare consonant-stem 3rd conjugation
  // needs for its indicative and subjunctive respectively (regimur/
  // regimini indicative, regamur/regamini subjunctive — obteramur is the
  // subjunctive passive, "so that we may be crushed").
  'mur', 'imur', 'amur', 'mini', 'imini', 'amini',
  // Present active participle (-ns, all oblique cases). The bare "nt-"
  // family below only reaches 1st/2nd conjugation, whose present stem
  // ("ama-"/"tene-") already contains the thematic vowel the ending needs
  // ("tenens"/"tenentis"/etc. all reduce to "tene"); 3rd, 3rd-io, and 4th
  // conjugation ("regens", "capiens", "audiens") need the same "-e-" link
  // the imperfect tense does, so they get their own set landing on "reg-"/
  // "capi-"/"audi-" instead.
  'ntibus', 'ntium', 'ntes', 'ntem', 'ntis', 'nti', 'nte', 'ntia', 'ns',
  'entibus', 'entium', 'entes', 'entem', 'entis', 'enti', 'ente', 'entia', 'ens',
  // Future active participle (-urus, -ura, -urum), landing on the perfect/
  // supine stem already indexed from a verb's own principal parts.
  'urus', 'urum', 'ura',
  // Gerund / gerundive (-andus/-endus and their full case paradigm),
  // landing on the present stem exactly like the participle endings above.
  'andus', 'andum', 'anda', 'andi', 'ando', 'andos', 'andas', 'andis', 'andorum', 'andarum',
  'endus', 'endum', 'enda', 'endi', 'endo', 'endos', 'endas', 'endis', 'endorum', 'endarum',
  // Comparative adjective (-ior/-ius and its 3rd-declension case forms),
  // landing on the positive adjective's own stem — gravior/gravius/
  // gravioris/etc. all reduce to grav-, gravis's own indexed stem.
  'ioribus', 'iorum', 'iores', 'ioris', 'iorem', 'iori', 'ior', 'ius',
  // Superlative adjective (-issimus and its full case paradigm plus the
  // adverbial -issime), landing on the positive adjective's own stem exactly
  // like the comparative endings above — gravissimus/gravissime/etc. all
  // reduce to grav-.
  'issimorum', 'issimarum', 'issimus', 'issima', 'issimum', 'issimi', 'issimae',
  'issimo', 'issimam', 'issimis', 'issimos', 'issimas', 'issime',
  // Imperfect indicative/subjunctive with the "-e-" linking vowel that 3rd,
  // 3rd-io, and 4th conjugation verbs need but 1st/2nd don't (their present
  // stem already ends in the thematic vowel, so the bare "bat"/"rer" family
  // below already reaches them) — regebat/audiebat/capiebatur/regerer all
  // reduce to their bare present stem this way, the same stem the present
  // participle and gerund endings above already resolve through.
  'ebamus', 'ebatis', 'ebantur', 'ebamur', 'ebamini',
  'ebam', 'ebas', 'ebat', 'ebant', 'ebar', 'ebaris', 'ebatur', 'bar',
  // Imperfect subjunctive, active and passive/deponent alike (amarem/
  // amarer, regerem/regerer — 3rd conjugation needs the same "-e-" link
  // the imperfect indicative above does; the rest land straight on their
  // own vowel-bearing stem).
  'eremus', 'eretis', 'erentur', 'eremur', 'eremini',
  'erer', 'ereris', 'eretur', 'erent', 'erem', 'eres', 'eret',
  'remus', 'retis', 'rentur', 'remur', 'remini',
  'rer', 'reris', 'retur', 'rem', 'res', 'ret',
  'amus', 'atis', 'emus', 'etis', 'imus', 'itis', 'unt', 'ant', 'ent', 'at', 'et',
  // Bare 2-char personal endings: "it" (3rd/3rd-io/4th conj. 3rd singular
  // present active — poscit/tollit/ponit, the connecting vowel the 1st/2nd/
  // 3rd plural forms already resolve through never applies to this one
  // person, so it needed its own ending) and "or" (1st singular present
  // passive/deponent — ducor/queror/testor, landing on the same active
  // present stem the rest of the passive paradigm already resolves through).
  // "ar" is the same 1st-singular passive/deponent ending's SUBJUNCTIVE
  // vowel (loquar, "I may speak", next to indicative loquor).
  'it', 'or', 'ar',
  // Perfect subjunctive / future perfect, full paradigm (only "erim" existed
  // by accident, as a potential-subjunctive example — the rest never did).
  'erimus', 'eritis', 'erint', 'erim', 'erit', 'eris',
  // Perfect infinitive (-isse), landing on the same perfect stem the rest of
  // the perfect system already resolves through (vidisse -> vid-, videbam's
  // own stem; also covers the poetic syncopated "-asse" for 1st conjugation,
  // e.g. amasse = amavisse, since that already strips to the bare root via
  // the "asti" entry below rather than needing a separate rule here).
  'isse',
  // Perfect indicative 2nd singular/plural (-isti/-istis), landing on the
  // same perfect stem as the rest of the paradigm — dixisti/dixistis reduce
  // to "dix", audivisti to "audiv", exactly like "vidit"/"viderunt" already do.
  'isti', 'istis',
  // Bare "-tur" (3rd singular present passive) for the handful of irregular
  // verbs whose infinitive has no thematic vowel to trigger the ordinary
  // "-atur"/"-etur"/"-itur" endings above — fero's "fertur", and compounds
  // of it and eo, land on their own bare stem this way instead.
  'tur',
  // Poetic syncopated 1st-conjugation perfect, dropping "-vi-" before an
  // ending starting with s or r (amavisti -> amasti, "sperasti" for
  // speravisti; amavisse -> amasse the same way for the infinitive) —
  // landing on the bare root exactly like the ordinary present tense does,
  // since 1st conjugation's own thematic vowel isn't present in this
  // contracted form either.
  'asti', 'asse',
  // Ablative singular of a 3rd-declension comparative (crassior -> the
  // ablative crassiore) — every other case of the comparative paradigm
  // already has its own entry above.
  'iore',
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
      // A deponent/semi-deponent's perfect is a participle + "sum" ("locutus
      // sum", "ausus sum"), not a single word — dropping "sum" here is what
      // lets the rest of this loop treat "locutus" like any other stem-
      // bearing form, instead of normalizeWord fusing the two into the
      // unindexable "locutussum" (its embedded space is stripped along with
      // everything else that isn't a letter).
      const p = part.replace(/\(.*?\)/g, '').replace(/\bsum\b/g, '').trim();
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
      // consonant root stemOf's generic endings reduce it to. "-eri" is the
      // same present stem for a 2nd-conjugation-pattern DEPONENT infinitive
      // (tueri, vereri, misereri — "tue-ntem", "vere-batur" need "tue-"/
      // "vere-" exactly like an active verb's "-ere" infinitive needs
      // "gere-").
      if (w.length >= 5 && (w.endsWith('are') || w.endsWith('ere') || w.endsWith('ire') || w.endsWith('eri'))) {
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
  // "tui" is deliberately not mapped to tuus here even though it is a
  // grammatically real genitive of it — every actual occurrence of "tui" in
  // this corpus is instead the personal pronoun tu's own genitive ("desiderium
  // tui", "longing for you"), mapped to tu below instead.
  tuus: 'tuus', tua: 'tuus', tuum: 'tuus', tuam: 'tuus', tuae: 'tuus', tuo: 'tuus',
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
  // do, dare, dedi, datum — "to give". 1st conjugation, but its present stem
  // is the bare 2-letter "da-", under the stemmer's 3-character floor, so no
  // present-system form of it (unlike every other 1st-conjugation verb) can
  // ever be found via `byStem`.
  da: 'do', das: 'do', dat: 'do', damus: 'do', datis: 'do', dant: 'do',
  dabam: 'do', dabas: 'do', dabat: 'do', dabamus: 'do', dabatis: 'do', dabant: 'do',
  dabo: 'do', dabis: 'do', dabit: 'do', dabimus: 'do', dabitis: 'do', dabunt: 'do',
  dem: 'do', des: 'do', det: 'do', demus: 'do', detis: 'do', dent: 'do',
  darem: 'do', dares: 'do', daret: 'do', daremus: 'do', daretis: 'do', darent: 'do',
  dedi: 'do', dedisti: 'do', dedit: 'do', dedimus: 'do', dedistis: 'do', dederunt: 'do', dedere: 'do',
  datus: 'do', data: 'do', datum: 'do', dare: 'do', dans: 'do', dantis: 'do',
  datur: 'do', dantur: 'do', dabatur: 'do', dabantur: 'do',
  dandus: 'do', dandum: 'do', dando: 'do', dandi: 'do',
  // eo, ire, ii/ivi, itum — "to go". Root is a single letter ("i-"/"e-"),
  // so nothing built on it ever clears the stemmer's 3-character floor.
  ibat: 'eo', ibam: 'eo', ibas: 'eo', ibant: 'eo', ibo: 'eo', ibit: 'eo',
  iret: 'eo', irem: 'eo', irent: 'eo', eundo: 'eo', eundum: 'eo', eundi: 'eo',
  iit: 'eo', iimus: 'eo', ierunt: 'eo', iere: 'eo',
  // abeo — same short root, common enough compound to need its own set.
  // eo's present participle is the irregular "iens, euntis" (not the
  // regular "-ens" family every other verb uses), so its compounds' own
  // participles need their own mapping too.
  abeundi: 'abeo', abeundo: 'abeo', abeundum: 'abeo', abeuntes: 'abeo',
  // eo's future participle "iturus" — irregular the same way "moriturus" is.
  iturum: 'eo', itura: 'eo', iturus: 'eo',
  // adsum, adesse, adfui — imperfect "aderat" family (its own short root
  // "ad-" is fine at 2 letters plus the "es-" stem, but "aderant" collides
  // textually with the plain pluperfect "-erant" ending above, which strips
  // to just "ad" and falls under the floor).
  aderam: 'adsum', aderas: 'adsum', aderat: 'adsum', aderamus: 'adsum',
  aderatis: 'adsum', aderant: 'adsum',
  // desum, deesse, defui — "to be lacking/wanting", same short-root issue.
  deerat: 'desum', deerit: 'desum', deerunt: 'desum', deest: 'desum', deesse: 'desum',
  // memini, meminisse — defective verb whose only imperative is the
  // irregular future form "memento" (there is no present tense to build it
  // from regularly).
  memento: 'memini', mementote: 'memini',
  // nosco, noscere, novi, notum — "to know, recognize". The syncopated
  // perfect "novisti" -> "nosti" drops the "-vi-" the way "amasti" does for
  // 1st conjugation, but on a stem the "asti" rule doesn't cover.
  nosti: 'nosco', nostis: 'nosco', norat: 'nosco', norant: 'nosco',
  // ago, agere, egi, actum — perfect stem "eg-" is only 2 letters.
  egi: 'ago', egit: 'ago', egimus: 'ago', egistis: 'ago', egerunt: 'ago', egere: 'ago',
  // vinco, vincere, vici, victum — perfect stem "vic-" is fine at 3 letters,
  // but "vicisti" needed the "-isti" ending fixed above; already covered now.
  // volo, velle, volui — irregular infinitive already handled via EXTRA_FORMS
  // pattern for velle itself; "voluisti" needed the same "-isti" fix.
  // for, fari, fatus sum — deponent, root is a single letter ("f-").
  fatur: 'for', fabar: 'for', fantur: 'for', fatus: 'for', fata: 'for', fatum: 'for',
  // sum, esse, fui — the one common imperative form "este" (2nd plural) was
  // already covered; "esto" (2nd/3rd singular future imperative) was not.
  esto: 'sum',
  // capio, capere — "capit" ("it takes", Caesar B.G. 1.1 "initium capit a
  // flumine Rhodano") is not itself a real inflected form of caput/capitis
  // ("head") at all, but NOUN_STEMS registers "capit" as caput's oblique
  // stem for genuinely declined forms like "capitis"/"capiti" — as a side
  // effect that also makes the bare string "capit" match caput by a longer
  // (and wrongly winning) stem length. An exact match here fixes it without
  // touching the oblique-case indexing caput's other forms still need.
  capit: 'capio',
  // duo, duae, duo — the numeral's oblique cases don't fit the regular
  // 1st/2nd declension endings the stemmer expects.
  duobus: 'duo', duorum: 'duo', duabus: 'duo',
  // quidam, quaedam, quoddam — "a certain" (qui + -dam), oblique cases with
  // the inserted "-n-"/"-r-" a plain qui+dam split would miss.
  quendam: 'quidam', quandam: 'quidam', quorundam: 'quidam', quarundam: 'quidam',
  quibusdam: 'quidam', quosdam: 'quidam', quasdam: 'quidam',
  // qui/quibus + the postpositive enclitic "-cum" ("with whom"), and
  // ego/nos/vos + the same enclitic ("mecum", "with me") — neither "cum"
  // attached this way is in the ordinary ENCLITICS list, since unlike
  // -que/-ve/-ne it only ever attaches to a handful of ablative pronouns.
  // (secum, the reflexive's own turn in this family, is in
  // SUPPLEMENTARY_EXTRA_FORMS below — sui/sibi/se has no entry on the CED
  // core list, only the supplementary one, so its stem lives there.)
  quocum: 'qui', quacum: 'qui', quibuscum: 'qui',
  mecum: 'ego', tecum: 'tu', nobiscum: 'nos', vobiscum: 'vos',
  // utor, uti, usus sum — root "ut-" is fine at 2 letters plus a vowel, but
  // still under the stemmer's 3-character floor.
  utantur: 'utor', utaris: 'utor',
  // fio, fieri — root is a single letter ("fi-").
  fient: 'fio', fit: 'fio',
  // deus, dei — the headword's own 2-letter stem ("de-") is under the floor,
  // same class of gap as os/oris above.
  dei: 'deus', deo: 'deus',
  // oro, orare and paro, parare — both fine 1st-conjugation verbs, but their
  // future tense ("-abunt"/"-abuntur") needed an ending this table doesn't
  // have, and both roots ("or-", "par-") are borderline short enough that a
  // direct mapping is safer than adding a new generic ending just for these.
  orabunt: 'oro', parabuntur: 'paro', oranda: 'oro',
  // peto, petere — the syncopated perfect 3rd plural "petiere" (alongside
  // regular "petiverunt"/"petierunt") drops the same way "amasse" does.
  petiere: 'peto',
  // volo, velle — "mavis" is a fused contraction of "magis vis" ("you
  // prefer"), not a regular 2nd singular built on the stem at all.
  mavis: 'volo',
  // vis, vis — wildly irregular declension (vis, vis, vim, vi... plural
  // vires, virium, viribus, vires, viribus), so almost none of its case
  // forms fit the ordinary noun endings.
  vim: 'vis', vires: 'vis', virium: 'vis', viribus: 'vis',
  // ops, opis — plural "opes" ("resources, wealth") is the far more common
  // form, but the headword's own 2-letter stem is under the floor.
  opes: 'ops',
  // sum compounds again: insum, inesse — "to be in/among" — not common
  // enough on its own to warrant a separate dictionary entry.
  inest: 'sum',
  // Real, confirmed misreadings found auditing the corpus: an oblique form
  // ties in stem length with an entirely different word sharing the same
  // reduced stem, and the wrong one was winning the tie.
  // domine — vocative of dominus ("master, lord"), not a form of domina
  // ("mistress") at all: domina's own vocative is unchanged "domina", so
  // nothing about this spelling can ever actually be domina.
  domine: 'dominus',
  // manibus — dative/ablative plural of manus ("hand"), not "mane"
  // (adverb, "in the morning" — adverbs do not inflect for case at all)
  // or maneo ("to remain"), whose stem this only coincidentally matches.
  manibus: 'manus',
  // sedibus — dative/ablative plural of sedes ("seat, dwelling place"),
  // not the indeclinable conjunction sed ("but") or sedeo ("to sit").
  sedibus: 'sedes',
  // vocibus — dative/ablative plural of vox ("voice"), not voco ("to
  // call") — a different, if related, word.
  vocibus: 'vox',
  // opera/opere — overwhelmingly opus ("work, task") in its neuter
  // plural/ablative forms in this corpus, not operio ("to cover"), whose
  // stem this only coincidentally matches.
  opera: 'opus', opere: 'opus', operis: 'opus', operi: 'opus',
  // casu — ablative of casus ("chance, accident"), not cado ("to fall"):
  // casus's own supine "casum" gives cado a same-length "cas-" stem that
  // otherwise wins the tie.
  casu: 'casus',
  // arces/arce — forms of arx ("citadel, stronghold"), not arcus ("bow,
  // arch"), whose stem this only coincidentally matches at the same length.
  arces: 'arx', arce: 'arx',
  // totus, -a, -um — "whole, entire": an irregular pronominal adjective
  // (genitive totius, dative toti, like unus/alius/solus/nullus above), so
  // none of its oblique forms fit the regular 1st/2nd-declension endings —
  // and every one of them ties in stem length with the indeclinable "tot"
  // ("so many"), an entirely different word, which was winning the tie.
  totius: 'totus', toti: 'totus', totam: 'totus', toto: 'totus',
  totos: 'totus', totas: 'totus', totorum: 'totus', totarum: 'totus',
  // mene — "me" (accusative of ego) plus the postpositive interrogative
  // enclitic "-ne" ("mene fugis?", "[are you fleeing] FROM ME?"). Not
  // handled by the ordinary ENCLITICS-stripping fallback below, since that
  // only runs when a direct lookup finds nothing at all, and "mene" already
  // (wrongly) matches mens ("mind") by stem coincidence.
  mene: 'ego',
  // deos — accusative plural of deus ("god"), whose own 2-letter stem
  // ("de-") is under the stemmer's floor the same way dei/deo above are, so
  // this never reached deus at all before.
  deos: 'deus',
  // Full-corpus audit: every actual occurrence of each spelling below reads
  // as one specific word throughout this corpus, even though the bare
  // stem also collides with an unrelated word by coincidence. Each was
  // checked against every line it appears in, not just assumed from the
  // first hit — see VOCAB_DISAMBIGUATION instead for the (much rarer) cases
  // where the same spelling really is two different words in two different
  // lines and a single global answer would be wrong half the time.
  //
  // prima/primo — always primus ("first"), including its adverbial neuter
  // accusative use ("prima gesserat", "did first") and its ablative-
  // adverbial use ("primo", "at first") — never the distinct adverb
  // "primum", which never actually appears under this stem in the corpus.
  prima: 'primus', primo: 'primus',
  // animum/animo — always animus ("mind, spirit"), never anima ("breath,
  // life-force"), whose stem this only coincidentally matches.
  animum: 'animus', animo: 'animus',
  // multa/multae/multas/multi — always the adjective multus ("much, many"),
  // agreeing with a noun or standing for one ("many things"), never the
  // distinct adverb multum ("greatly"), which needs a verb to modify and
  // never appears under this stem here.
  multa: 'multus', multae: 'multus', multas: 'multus', multi: 'multus',
  // terras/terris/terram/terrae — always terra ("earth, land"). None of
  // these is a real inflected form of terreo ("to frighten") at all —
  // terreo's own forms are terreo/terres/terret/terrean-t — so every match
  // against it here was a pure stem-collision artifact, not a real second
  // reading of the word.
  terras: 'terra', terris: 'terra', terram: 'terra', terrae: 'terra',
  // metu — always metus ("fear"), ablative singular. Not a real form of
  // metuo ("to fear") either — its forms are metuo/metuis/metuit — so this
  // is the same kind of artifact as terras/terreo above.
  metu: 'metus',
  // tecta/tectis — always tectum ("roof, building, house"), plural, never
  // the participle of tego ("to cover") in this corpus (tego's own
  // "tectus, -a, -um" would need an explicit subject it's agreeing with,
  // which none of these lines give it).
  tecta: 'tectum', tectis: 'tectum',
  // manu/manum — always manus ("hand"). Not a real form of the indeclinable
  // adverb mane ("in the morning") or of maneo ("to remain") either —
  // maneo's own forms are maneo/manes/manet, never "manu"/"manum".
  manu: 'manus', manum: 'manus',
  // animis/animae — always animus ("mind, spirit") for animis, always anima
  // ("breath, life-force") for animae — different from the animum/animo
  // pair above, which are always animus; the corpus genuinely uses these
  // two forms for the two different underlying words.
  animis: 'animus', animae: 'anima',
  // consulas — always consulo ("to consult, take care for"), never a form
  // of the noun consul at all (consul's own oblique forms are
  // consulis/consuli/consule/consules, never "consulas").
  consulas: 'consulo',
  // uoluere (voluere) — always volvo ("to turn over, roll, experience"),
  // its historical infinitive, never volo ("to wish").
  uoluere: 'volvo',
  // metuens — the present participle of metuo ("to fear"), never a form of
  // the noun metus, which has no participle at all.
  metuens: 'metuo',
  // soluuntur (solvuntur) — always solvo ("to loosen, undo"; here
  // "solvuntur frigore membra", "the limbs go slack with cold/fear"), not
  // solus ("alone"), which this only coincidentally shares a stem with.
  soluuntur: 'solvo',
  // uoce (voce) — always vox ("voice"), ablative singular. Not a form of
  // voco ("to call") — voco's own forms are voco/vocas/vocat.
  uoce: 'vox',
  // fert/ferunt — always fero ("to carry, bear"), never ferus ("wild"),
  // which has no verb forms at all.
  fert: 'fero', ferunt: 'fero',
  // superant — always supero ("to rise above, surpass"), not the
  // preposition super or the adjective superus, neither of which has verb
  // forms.
  superant: 'supero',
  // undas — always unda ("wave"), never the adverb unde ("whence"), which
  // does not decline and only coincidentally shares a stem.
  undas: 'unda',
  // parua (parva) — always parvus ("small"), never the adverb parum ("too
  // little"), which does not inflect for gender/case at all.
  parua: 'parvus',
  // celerem — always celer ("swift"), never celo ("to hide"), whose own
  // forms are celo/celas/celat and share this stem only by coincidence.
  celerem: 'celer',
  // caeli — always caelum ("sky, heaven"), genitive singular, never the
  // proper name Caelius, which this only coincidentally stem-matches.
  caeli: 'caelum',
  // sedet — always sedeo ("to sit"), never sedes ("seat") or the
  // conjunction sed ("but"), neither of which has verb forms.
  sedet: 'sedeo',
  // fugis — always fugio ("to flee"), never the noun fuga, which has no
  // verb forms.
  fugis: 'fugio',
  // lacrimas/lacrimis — always lacrima ("tear"), accusative/dative-ablative
  // plural, never lacrimo ("to weep"), whose own forms are
  // lacrimo/lacrimas(1st sg pres!)/lacrimat — "lacrimas" only collides with
  // lacrimo's 2nd singular present by coincidence of spelling, but every
  // actual occurrence here is the noun's plural, not "you weep".
  lacrimas: 'lacrima', lacrimis: 'lacrima',
  // tui — always tu ("you"), the personal pronoun's own genitive ("of
  // you"), never the possessive adjective tuus agreeing with a noun.
  tui: 'tu',
  // totaque — always totus ("whole, entire") plus the enclitic "-que",
  // never the indeclinable tot ("so many"), which this only coincidentally
  // stem-matches.
  totaque: 'totus',
  // tantam — always tantus ("so great"), extending the tanto/tanti/tantae/
  // tanta family above; never the adverb tantum, which needs a verb to
  // modify and never appears under this stem here.
  tantam: 'tantus',
  // altae — always altus ("high, deep"), agreeing with a genitive noun
  // ("altae Romae", "of lofty Rome"), never the substantive noun altum
  // ("the deep sea") — contrast "alta"/"alto" in VOCAB_DISAMBIGUATION,
  // which really do split between the two.
  altae: 'altus',
  // somnis — always somnus ("sleep"), dative/ablative plural, in the fixed
  // idiom "in somnis" ("in one's sleep/in a dream") — never somnium
  // ("dream"), whose own plural is "somnia", not "somnis".
  somnis: 'somnus',
  // auras/auro — auras is always aura ("breeze, air"), accusative plural,
  // in the common poetic phrase "per auras" ("through the air"); auro is
  // always aurum ("gold"), ablative singular. Neither is a real form of
  // auris ("ear"), whose own accusative plural is "aures" and whose
  // dative/ablative singular is "auri", not "auro".
  auras: 'aura', auro: 'aurum',
  // fatis — always fatum ("fate"), dative/ablative plural, never a form of
  // the deponent verb for ("to speak") — for's own forms are for/faris/
  // fatur, and its participle "fatus" would need "-tis" for this case,
  // not "-tis" attached to a bare "fa-" the way fatis reads.
  fatis: 'fatum',
  // fugit — always fugio ("to flee"), never the noun fuga, which has no
  // verb forms.
  fugit: 'fugio',
  // sola — always solus ("alone"), never sol ("sun") or soleo ("to be
  // accustomed"), neither of which has a feminine adjectival form at all.
  sola: 'solus',
  // amorem — always amor ("love"), accusative singular, never amo ("to
  // love"), which has no such noun-looking form.
  amorem: 'amor',
  // longa — always longus ("long"), agreeing with a noun in the same line,
  // never the adverb longe ("far"), which needs a verb to modify and never
  // appears under this stem here.
  longa: 'longus',
  // uulnere (vulnere) — always vulnus ("wound"), ablative singular, never
  // vulnero ("to wound"), whose own forms are vulnero/vulneras/vulnerat.
  uulnere: 'vulnus',
  // libertis — always libertus ("freedman"), dative/ablative plural
  // (covering mixed-gender groups the way Latin's masculine plural
  // regularly does), never liberta/libertas/liber/liberi, none of whose
  // own paradigms actually produce this form.
  libertis: 'libertus',
  // mali — always malum ("evil, misfortune"), genitive singular ("tanti
  // mali", "of so great an evil"), never malus ("bad") or malo ("to
  // prefer"), neither of which has a genitive-looking form spelled this way
  // on its own.
  mali: 'malum',
  // tanto/tanti/tantae/tanta — always tantus ("so great"), agreeing with a
  // noun or (ablative) expressing degree of difference, extending the
  // tantam entry above; never the adverb tantum, which needs a verb to
  // modify and never appears under this stem here.
  tanto: 'tantus', tanti: 'tantus', tantae: 'tantus', tanta: 'tantus',
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
  // -er, -era/-ra, -erum/-rum adjectives that drop the "e" outside the
  // nominative masculine singular (pulcher, pulchra — not every -er
  // adjective does this: miser/tener/liber keep it, "misera" not "misra",
  // and already resolve fine since their own headword-as-stem then equals
  // the query word's stem directly). Every one of these is spelled with the
  // dictionary's abbreviated "-gra"/"-tra"/etc. lemma form (e.g. "noster,
  // -stra, -strum"), which the generic lemma-alternate-forms parser above
  // deliberately skips (it only takes full, unabbreviated words) — so
  // without an entry here, no oblique form of any of these — including,
  // for noster/vester, the extremely common "nostra"/"vestra"/"nostrum"/
  // "vestrum" — ever resolved at all.
  aeger: 'aegr', niger: 'nigr', sacer: 'sacr', pulcher: 'pulchr',
  noster: 'nostr', vester: 'vestr',
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
  // sui, sibi, se — the emphatic/poetic doubled form "sese" alongside "se",
  // and "secum" ("with himself/herself/itself/themselves"), the reflexive's
  // turn in the mecum/tecum/nobiscum/vobiscum family of pronoun + postpositive
  // "-cum" (see EXTRA_FORMS above for the rest of that family) — without
  // this, "secum" stemmed to "sec-" and landed on the unrelated verb seco
  // ("to cut"), a real, confirmed misreading this maps around directly.
  sese: 'sui', secum: 'sui',
  // odi, odisse — perfect-in-form-only, so its "3rd plural" is the
  // syncopated "odere" alongside the regular "oderunt".
  odere: 'odi',
  // ruo, ruere, rui — root is a bare 2-letter "ru-", under the stemmer's
  // 3-character floor, so no present-system form of it ever indexed.
  ruit: 'ruo', ruunt: 'ruo', ruisse: 'ruo', ruens: 'ruo',
  // reus, rei — dative/ablative plural "reis" collides with nothing but
  // also matches nothing, since the headword's own 2-letter stem is under
  // the stemmer's floor.
  reis: 'reus',
  // iatraliptes — the one accusative form Pliny's text actually uses.
  iatralipten: 'iatraliptes',
  // aufero and offero (fero compounds) — irregular "ferre" infinitive means
  // their passive 3rd singular ("-fertur") has no thematic vowel for the
  // ordinary "-atur"/"-etur"/"-itur" endings to land on.
  aufertur: 'aufero', offertur: 'offero',
  // gigno, gignere, genui, genitum — progigno is the same verb with a
  // prefix Whitaker's dictionary doesn't carry as its own headword.
  progenuit: 'gigno',
  // avus, avi — accusative plural, its own 2-letter stem under the floor.
  avos: 'avus',
  // Proper-noun oblique/Greek-declension forms the ordinary ENDINGS table
  // and the generic "headword, genitive" lemma parser can't derive —
  // exactly the same class of gap "aenean" above exists to close.
  arpocras: 'harpocras', arpocrati: 'harpocras',
  laocoonta: 'laocoon', iarban: 'iarbas',
  tyrii: 'tyrius', tyrias: 'tyrius', tyrio: 'tyrius',
  tyrrhena: 'tyrrhenus',
  nicomedensem: 'nicomedenses',
  dardanidum: 'dardanidae',
  alciden: 'alcides', thesea: 'theseus',
  gerusian: 'gerusia', iseon: 'iseum',
  thermuthin: 'thermuthis', maximillae: 'maximilla',
  // imus, ima, imum — headword's own 2-letter stem ("im-") is under the floor.
  imas: 'imus',
  // venor/miror — future 2nd singular alternate "-bere"/"-beris" ending, and
  // (miror) the "-b-" future infix a deponent stem never otherwise carries.
  uenabere: 'venor', miraberis: 'miror',
  // percontor/adsumo — spelling variants ("percunctor" with -u-, "assumo"
  // with assimilated -ss-) that don't match the headword's own stem letter
  // for letter, exactly like "Arpocras" for "Harpocras" above.
  percunctatus: 'percontor', assumpsi: 'adsumo',
  // sono — "sonantior" is the comparative of its own present participle
  // "sonans" ("more resounding"), not a headword of its own.
  sonantior: 'sono',
  // subeo — same irregular "-eunt-" participle eo's other compounds need.
  subeuntem: 'subeo',
  // morior — future participle "moriturus" is built irregularly on the
  // present stem, not the supine stem "mortuus" its perfect actually uses.
  moriturum: 'morior', morituram: 'morior', moriturus: 'morior',
  // requiro — the syncopated perfect "requisisti" drops "-vi-" the same way
  // "amasti" does, but on a stem the 1st-conjugation-only "asti" rule above
  // doesn't reach.
  requisisti: 'requiro',
  // axis — headword's own 2-letter stem is under the floor.
  axem: 'axis',
  // insatiabilis — the 3rd-declension adjective's adverb ends "-iter", not
  // the ordinary "-e"/"-er" the stemmer expects.
  insatiabiliter: 'insatiabilis',
  // hortor — its own stem ("hort-") is exactly the noun "hortus" ("garden")
  // reduces to as well, and "hortus" is core. Without an exact match of its
  // own, "hortatur" (Pliny 6.16.12) always loses that stem-length tie to
  // the (wrong) core noun, since a stem match ranks purely by length.
  hortatur: 'hortor',
  // Aeneid 1.34-87 — Juno's bargain with Aeolus. divom/divom (archaic
  // genitive plural of divus, alongside the regular "divum" the ordinary
  // ENDINGS table would still miss since the headword's own stem is under
  // the 3-character floor); Aeole, the vocative of Aeolus (2nd-declension
  // "-us" nouns take "-e", not covered by the generic stemmer any more than
  // "domine" from "dominus" is); Aiacis and Oilei, oblique/genitive forms of
  // proper nouns whose nominatives never appear in the text at all; imis,
  // dative/ablative plural of imus (2-letter stem, same floor issue as
  // "imas" above); Argivom, archaic genitive plural of Argivi.
  divom: 'divus', aeole: 'aeolus', aiacis: 'aiax', oilei: 'oileus',
  imis: 'imus', argivom: 'argivi',
  // cuspide — ablative of cuspis ("spear point"), not the rare/obscure verb
  // "cuspido" Whitaker's dictionary also carries under the same stem length.
  cuspide: 'cuspis',
  // plurima — always plurimus ("very many, most") in this corpus, agreeing
  // with a noun or standing for one ("very many things"). It coincidentally
  // also stem-matches a supplementary "multum" entry that is otherwise
  // unrelated to it.
  plurima: 'plurimus',
  // crebris — always creber ("frequent, thick-coming"), agreeing with a
  // noun ("crebris tremoribus", "crebris ignibus"); not a real form of
  // whatever "crebrisurus" is in Whitaker's raw data (that headword itself
  // looks like a parsing artifact, not a real Latin word this ever needs).
  crebris: 'creber',
  // glomerantur — always glomero ("to gather, mass together"), never
  // glomus ("ball of thread"), which has no verb forms.
  glomerantur: 'glomero',
  // feta — always fetus, -a, -um ("pregnant with, teeming with"), the
  // adjective's own feminine form, never a form of the doubtful verb
  // "feto" this only coincidentally stem-matches.
  feta: 'fetus',
  // innuptaeque — always innuptus ("unmarried, virgin") plus "-que", never
  // innubo ("to marry into"), which has no form spelled this way.
  innuptaeque: 'innuptus',
  // corde — always cor ("heart"), ablative singular, never "corda" (this
  // dictionary's raw data has no sense of "corda" that fits an ablative
  // "corde" as one of its own forms anyway).
  corde: 'cor',
  // foedera is deliberately not mapped here even though "foedus" is
  // technically its correct headword: Whitaker's data has TWO unrelated
  // entries sharing that exact spelling (the adjective "foedus, -a, -um",
  // "foul", and the noun "foedus, foederis", "treaty"), so an EXTRA_FORMS-
  // style override can't tell them apart by headword string alone — see
  // VOCAB_DISAMBIGUATION, which picks the noun by its `pos` instead.
  // mandata — always mandatum ("order, command"), plural, carried through
  // the air in both Aeneid lines that use it; not a real form of mando ("to
  // entrust, order") on its own, which needs a different ending pattern.
  mandata: 'mandatum',
  // aspectu — always aspectus ("sight, appearance, gaze"), ablative
  // singular — the noun aspicio's own action regularly forms, not a form
  // of aspicio itself, which has no such ablative-singular-looking form.
  aspectu: 'aspectus',
  // reliquias — always reliquiae ("remains, remnants"), accusative plural,
  // never relinquo ("to leave behind"), whose own perfect stem "reliqu-"
  // this only coincidentally matches at the same length.
  reliquias: 'reliquia',
  // ossa — always "bones" (the 3rd-declension neuter distinct from "os,
  // oris", mouth/face, whose own plural is "ora", not "ossa" — see "ora"
  // in VOCAB_DISAMBIGUATION), never a coincidental stem match against that
  // unrelated word.
  ossa: 'ossum',
  // diuum (divum) — the archaic genitive plural of divus ("god"), alongside
  // "divom" already above — "domus divum", "interpres divum", every one of
  // its occurrences in the corpus. Never diu ("for a long time"), diva
  // ("goddess"), or dives ("rich"), none of which forms a genitive plural
  // spelled this way.
  diuum: 'divus',
  // pugillares — always pugillaris (a real 3rd-declension plural), never
  // pugillare, whose own neuter plural would be "pugillaria" — Whitaker's
  // dictionary carries both as separate headwords for the same word
  // ("writing tablets"), but only one of them actually declines this way.
  pugillares: 'pugillaris',
  // specie — always species ("appearance, kind"), ablative singular, never
  // specio, an archaic/rare verb whose own forms don't include this one.
  specie: 'species',
  // pondere — always pondus ("weight"), ablative singular, never pondero
  // ("to weigh"), whose own forms are pondero/ponderas/ponderat.
  pondere: 'pondus',
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
 *
 * An exact match beats a stem match regardless of which tier it came from —
 * not just within one tier's own results. Without this, a core-list word
 * that merely *stems* to the query (e.g. "hortus" stemming to "hort") would
 * silently outrank a supplementary word that is an *exact* dictionary match
 * for it (e.g. "hortor" 3rd singular "hortatur"), since the core tier is
 * consulted first and a plain "core non-empty?" check never lets the
 * (correct) supplementary answer get a look in at all.
 */
export function lookup(word: string): LookupResult[] {
  const w = normalizeWord(word);
  if (w.length < 1) return [];

  const core = lookupWithEnclitic(coreIndex, w);
  const coreExact = core.filter((r) => r.match === 'exact');
  if (coreExact.length > 0) return coreExact.slice(0, 6);

  const supplementary = lookupWithEnclitic(supplementaryIndex, w);
  const supplementaryExact = supplementary.filter((r) => r.match === 'exact');
  if (supplementaryExact.length > 0) return supplementaryExact.slice(0, 6);

  const results = core.length > 0 ? core : supplementary;
  return results
    .sort((a, b) => b.stemLength - a.stemLength)
    .slice(0, 6);
}

const disambiguationIndex = new Map<string, VocabDisambiguationEntry[]>();
for (const entry of VOCAB_DISAMBIGUATION) {
  const key = `${entry.passageId}|${entry.lineN}|${entry.word}`;
  const cur = disambiguationIndex.get(key);
  if (cur) cur.push(entry);
  else disambiguationIndex.set(key, [entry]);
}

/**
 * Narrows `lookup()`'s results down to the one entry known to be correct in
 * this specific line, when the clicked word's spelling is one of the cases
 * hand-checked in VOCAB_DISAMBIGUATION (see that file for why this can't be
 * a global EXTRA_FORMS-style override: the same spelling is genuinely
 * different words in different sentences, e.g. "quod" as the relative
 * pronoun "qui" versus the unrelated conjunction "quod"). Falls back to the
 * unfiltered results whenever nothing in the table applies, or the one
 * entry it names isn't actually among the candidates lookup() found.
 *
 * `tokenIndex` (tokenize()'s per-token `index` for the line) only matters
 * for the rare line where the same spelling appears twice with two
 * different correct senses; every other call site can omit it.
 */
export function disambiguateInContext(
  passageId: string,
  lineN: number,
  word: string,
  results: LookupResult[],
  tokenIndex?: number,
): LookupResult[] {
  const candidates = disambiguationIndex.get(`${passageId}|${lineN}|${normalizeWord(word)}`);
  if (!candidates || candidates.length === 0) return results;
  const chosen =
    candidates.length === 1
      ? candidates[0]
      : (candidates.find((c) => c.tokenIndex === tokenIndex) ?? candidates[0]);
  const matches = (r: LookupResult) =>
    normalizeWord(r.entry.headword) === normalizeWord(chosen.headword) &&
    (!chosen.pos || r.entry.pos === chosen.pos) &&
    (!chosen.entryId || r.entry.id === chosen.entryId);

  const direct = results.filter(matches);
  if (direct.length > 0) return direct;

  // The desired entry isn't among lookup()'s own results — this happens
  // when the correct answer lives in the tier lookup() never reached,
  // because the OTHER tier already had an exact match of its own for this
  // exact spelling (e.g. "solum" the noun "ground" is a supplementary
  // headword in its own right, which wins outright over "solum" the
  // adjective solus's neuter form — a real stem/tier collision, not a
  // hand-picked sense — everywhere except the one line that really does
  // mean "ground"). Search both tiers directly, bypassing that priority,
  // since a hand-verified table entry already knows better.
  const w = normalizeWord(word);
  const cross = [...lookupWithEnclitic(coreIndex, w), ...lookupWithEnclitic(supplementaryIndex, w)].filter(matches);
  return cross.length > 0 ? cross : results;
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
