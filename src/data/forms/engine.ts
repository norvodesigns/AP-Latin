/**
 * The morphology behind Forms Forge: regular Latin paradigms, generated.
 *
 * Every form comes out with its macrons, and with `|` before the ending the
 * way the course's tables mark it (`puell|ae`), so the drills can show the
 * ending in red. Irregular words (sum, the pronouns) are written out by hand
 * in ./index.ts; everything regular is built here from its principal parts,
 * which keeps hundreds of forms consistent with a few dozen rules.
 *
 * `scripts/verify-content.mjs` spot-checks the output against forms written
 * out by hand, so a slip in a rule fails CI.
 */

export type ParadigmKind = 'noun' | 'adjective' | 'pronoun' | 'verb';

export interface Paradigm {
  /** "puella", "amo-pres-act". Stable: drills and links use it. */
  id: string;
  kind: ParadigmKind;
  /** The dictionary entry: "puella, puellae, f." */
  lemma: string;
  gloss: string;
  /** What the table shows: "First declension", "Present system, active indicative". */
  title: string;
  /** The course lesson that teaches this table, so drills can follow the student. */
  lesson?: string;
  cols: string[];
  rows: Array<{ label: string; cells: string[] }>;
  /** What each cell is, in words: names[row][col] = "genitive plural". */
  names: string[][];
}

/** A cell may hold alternatives, "eī / iī". */
export const ALT = ' / ';

/* ------------------------------------------------------------------ */
/* Nouns                                                               */
/* ------------------------------------------------------------------ */

export type Declension = '1' | '2' | '2n' | '3' | '3n' | '3i' | '3in' | '4' | '4n' | '5';

const CASES = ['Nominative', 'Genitive', 'Dative', 'Accusative', 'Ablative'];

/** Endings after the stem: [sg nom … abl, pl nom … abl]. `null` = the nominative as given. */
const NOUN_ENDINGS: Record<Declension, Array<string | null>> = {
  '1': ['a', 'ae', 'ae', 'am', 'ā', 'ae', 'ārum', 'īs', 'ās', 'īs'],
  '2': [null, 'ī', 'ō', 'um', 'ō', 'ī', 'ōrum', 'īs', 'ōs', 'īs'],
  '2n': ['um', 'ī', 'ō', 'um', 'ō', 'a', 'ōrum', 'īs', 'a', 'īs'],
  '3': [null, 'is', 'ī', 'em', 'e', 'ēs', 'um', 'ibus', 'ēs', 'ibus'],
  '3n': [null, 'is', 'ī', null, 'e', 'a', 'um', 'ibus', 'a', 'ibus'],
  '3i': [null, 'is', 'ī', 'em', 'e', 'ēs', 'ium', 'ibus', 'ēs', 'ibus'],
  '3in': [null, 'is', 'ī', null, 'ī', 'ia', 'ium', 'ibus', 'ia', 'ibus'],
  '4': ['us', 'ūs', 'uī', 'um', 'ū', 'ūs', 'uum', 'ibus', 'ūs', 'ibus'],
  '4n': ['ū', 'ūs', 'ū', 'ū', 'ū', 'ua', 'uum', 'ibus', 'ua', 'ibus'],
  '5': ['ēs', 'eī', 'eī', 'em', 'ē', 'ēs', 'ērum', 'ēbus', 'ēs', 'ēbus'],
};

export interface NounSpec {
  id: string;
  lemma: string;
  gloss: string;
  /** Nominative singular, as the dictionary gives it. */
  nom: string;
  /** Stem, from the genitive: "rēg" for rēx, rēgis. */
  stem: string;
  decl: Declension;
  title: string;
  lesson?: string;
}

export function noun(spec: NounSpec): Paradigm {
  const endings = NOUN_ENDINGS[spec.decl];
  const form = (i: number) => {
    const e = endings[i];
    if (e === null) {
      // Mark the ending where the nominative visibly adds one: serv|us, mar|e.
      const rest = spec.nom.startsWith(spec.stem) ? spec.nom.slice(spec.stem.length) : '';
      return rest ? `${spec.stem}|${rest}` : spec.nom;
    }
    // Fifth-declension stems ending in a vowel keep the ē: diēī, not dieī.
    const ending = spec.decl === '5' && /[aeiouāēīōū]$/.test(spec.stem) && (e === 'eī') ? 'ēī' : e;
    return `${spec.stem}|${ending}`;
  };
  return {
    id: spec.id,
    kind: 'noun',
    lemma: spec.lemma,
    gloss: spec.gloss,
    title: spec.title,
    lesson: spec.lesson,
    cols: ['Singular', 'Plural'],
    rows: CASES.map((c, i) => ({ label: c, cells: [form(i), form(i + 5)] })),
    names: CASES.map((c) => [`${c.toLowerCase()} singular`, `${c.toLowerCase()} plural`]),
  };
}

/* ------------------------------------------------------------------ */
/* Adjectives                                                          */
/* ------------------------------------------------------------------ */

const ADJ_ROWS = ['Nom. sg.', 'Gen. sg.', 'Dat. sg.', 'Acc. sg.', 'Abl. sg.', 'Nom. pl.', 'Gen. pl.', 'Dat. pl.', 'Acc. pl.', 'Abl. pl.'];
const ADJ_ROW_NAMES = [
  'nominative singular', 'genitive singular', 'dative singular', 'accusative singular', 'ablative singular',
  'nominative plural', 'genitive plural', 'dative plural', 'accusative plural', 'ablative plural',
];

function adjective(
  base: Omit<Paradigm, 'kind' | 'rows' | 'names' | 'cols'>,
  cols: string[],
  genderNames: string[],
  columns: string[][],
): Paradigm {
  return {
    ...base,
    kind: 'adjective',
    cols,
    rows: ADJ_ROWS.map((label, r) => ({ label, cells: columns.map((col) => col[r]) })),
    names: ADJ_ROW_NAMES.map((n) => genderNames.map((g) => `${n}, ${g}`)),
  };
}

/** First and second declension: bonus, bona, bonum; noster, nostra, nostrum. */
export function adjective12(
  base: Omit<Paradigm, 'kind' | 'rows' | 'names' | 'cols'>,
  mascNom: string,
  stem: string,
): Paradigm {
  const m = [mascNom === `${stem}us` ? `${stem}|us` : mascNom, 'ī', 'ō', 'um', 'ō', 'ī', 'ōrum', 'īs', 'ōs', 'īs'];
  const f = ['a', 'ae', 'ae', 'am', 'ā', 'ae', 'ārum', 'īs', 'ās', 'īs'];
  const n = ['um', 'ī', 'ō', 'um', 'ō', 'a', 'ōrum', 'īs', 'a', 'īs'];
  const add = (e: string, i: number, isMasc: boolean) => (isMasc && i === 0 ? e : `${stem}|${e}`);
  return adjective(base, ['m.', 'f.', 'n.'], ['masculine', 'feminine', 'neuter'], [
    m.map((e, i) => add(e, i, true)),
    f.map((e, i) => add(e, i, false)),
    n.map((e, i) => add(e, i, false)),
  ]);
}

/**
 * Third declension, i-stem: fortis, forte (two endings); ācer, ācris, ācre
 * (three); ingēns, ingentis (one). Pass the nominatives in m, f, n order.
 */
export function adjective3(
  base: Omit<Paradigm, 'kind' | 'rows' | 'names' | 'cols'>,
  nom: { m: string; f: string; n: string },
  stem: string,
): Paradigm {
  const mf = (nomForm: string) => [nomForm, `${stem}|is`, `${stem}|ī`, `${stem}|em`, `${stem}|ī`, `${stem}|ēs`, `${stem}|ium`, `${stem}|ibus`, `${stem}|ēs`, `${stem}|ibus`];
  const neut = [nom.n, `${stem}|is`, `${stem}|ī`, nom.n, `${stem}|ī`, `${stem}|ia`, `${stem}|ium`, `${stem}|ibus`, `${stem}|ia`, `${stem}|ibus`];
  if (nom.m === nom.f) {
    return adjective(base, ['m./f.', 'n.'], ['masculine or feminine', 'neuter'], [mf(nom.m), neut]);
  }
  return adjective(base, ['m.', 'f.', 'n.'], ['masculine', 'feminine', 'neuter'], [mf(nom.m), mf(nom.f), neut]);
}

/** A comparative: altior, altius. Third declension, not an i-stem. */
export function comparative(base: Omit<Paradigm, 'kind' | 'rows' | 'names' | 'cols'>, stem: string): Paradigm {
  const s = `${stem}iōr`;
  const mf = [`${stem}i|or`, `${s}|is`, `${s}|ī`, `${s}|em`, `${s}|e`, `${s}|ēs`, `${s}|um`, `${s}|ibus`, `${s}|ēs`, `${s}|ibus`];
  const n = [`${stem}i|us`, `${s}|is`, `${s}|ī`, `${stem}i|us`, `${s}|e`, `${s}|a`, `${s}|um`, `${s}|ibus`, `${s}|a`, `${s}|ibus`];
  return adjective(base, ['m./f.', 'n.'], ['masculine or feminine', 'neuter'], [mf, n]);
}

/** A pronoun or irregular adjective written out by hand, in the adjective layout. */
export function declinedByHand(
  base: Omit<Paradigm, 'kind' | 'rows' | 'names' | 'cols'>,
  kind: ParadigmKind,
  columns: { m: string[]; f: string[]; n: string[] },
): Paradigm {
  return { ...adjective(base, ['m.', 'f.', 'n.'], ['masculine', 'feminine', 'neuter'], [columns.m, columns.f, columns.n]), kind };
}

/* ------------------------------------------------------------------ */
/* Verbs                                                               */
/* ------------------------------------------------------------------ */

export type Conjugation = '1' | '2' | '3' | '3io' | '4';

const PERSONS = ['1st sg.', '2nd sg.', '3rd sg.', '1st pl.', '2nd pl.', '3rd pl.'];
const PERSON_NAMES = [
  '1st person singular', '2nd person singular', '3rd person singular',
  '1st person plural', '2nd person plural', '3rd person plural',
];

export interface VerbSpec {
  /** "amo" */
  id: string;
  /** "amō, amāre, amāvī, amātum" */
  lemma: string;
  gloss: string;
  conj: Conjugation;
  /** The present stem without its vowel: "am", "mon", "reg", "cap", "aud". */
  root: string;
  /** The present infinitive: "amāre". */
  inf: string;
  /** The perfect stem: "amāv". */
  perf?: string;
  /** The fourth principal part without its ending: "amāt". */
  supine?: string;
  /** A deponent: passive forms, active meaning. */
  deponent?: boolean;
}

type Six = [string, string, string, string, string, string];

const PRESENT_ACTIVE: Record<Conjugation, Six> = {
  '1': ['ō', 'ās', 'at', 'āmus', 'ātis', 'ant'],
  '2': ['eō', 'ēs', 'et', 'ēmus', 'ētis', 'ent'],
  '3': ['ō', 'is', 'it', 'imus', 'itis', 'unt'],
  '3io': ['iō', 'is', 'it', 'imus', 'itis', 'iunt'],
  '4': ['iō', 'īs', 'it', 'īmus', 'ītis', 'iunt'],
};

const PRESENT_PASSIVE: Record<Conjugation, Six> = {
  '1': ['or', 'āris', 'ātur', 'āmur', 'āminī', 'antur'],
  '2': ['eor', 'ēris', 'ētur', 'ēmur', 'ēminī', 'entur'],
  '3': ['or', 'eris', 'itur', 'imur', 'iminī', 'untur'],
  '3io': ['ior', 'eris', 'itur', 'imur', 'iminī', 'iuntur'],
  '4': ['ior', 'īris', 'ītur', 'īmur', 'īminī', 'iuntur'],
};

/** The vowel before -ba- in the imperfect. */
const IMPERFECT_VOWEL: Record<Conjugation, string> = { '1': 'ā', '2': 'ē', '3': 'ē', '3io': 'iē', '4': 'iē' };

const prefix = (p: string, six: readonly string[]) => six.map((e) => p + e) as Six;

function futureActive(c: Conjugation): Six {
  if (c === '1') return prefix('ā', ['bō', 'bis', 'bit', 'bimus', 'bitis', 'bunt']);
  if (c === '2') return prefix('ē', ['bō', 'bis', 'bit', 'bimus', 'bitis', 'bunt']);
  return prefix(c === '3' ? '' : 'i', ['am', 'ēs', 'et', 'ēmus', 'ētis', 'ent']);
}

function futurePassive(c: Conjugation): Six {
  if (c === '1') return prefix('ā', ['bor', 'beris', 'bitur', 'bimur', 'biminī', 'buntur']);
  if (c === '2') return prefix('ē', ['bor', 'beris', 'bitur', 'bimur', 'biminī', 'buntur']);
  return prefix(c === '3' ? '' : 'i', ['ar', 'ēris', 'ētur', 'ēmur', 'ēminī', 'entur']);
}

const PRESENT_SUBJ_VOWEL: Record<Conjugation, string> = { '1': 'e', '2': 'ea', '3': 'a', '3io': 'ia', '4': 'ia' };

function presentSubjunctive(c: Conjugation, passive: boolean): Six {
  const v = PRESENT_SUBJ_VOWEL[c];
  const long = v.slice(0, -1) + { e: 'ē', a: 'ā' }[v.slice(-1) as 'e' | 'a'];
  return passive
    ? [`${v}r`, `${long}ris`, `${long}tur`, `${long}mur`, `${long}minī`, `${v}ntur`]
    : [`${v}m`, `${long}s`, `${v}t`, `${long}mus`, `${long}tis`, `${v}nt`];
}

/** The tables a verb gets, and the course lesson that teaches each. */
export interface VerbTables {
  presentActive?: string;
  perfectActive?: string;
  presentPassive?: string;
  perfectPassive?: string;
  subjunctiveActive?: string;
  subjunctivePassive?: string;
}

function verbTable(
  spec: VerbSpec,
  key: string,
  title: string,
  lesson: string | undefined,
  columns: Array<{ label: string; name: string; forms: string[] }>,
): Paradigm {
  return {
    id: `${spec.id}-${key}`,
    kind: 'verb',
    lemma: spec.lemma,
    gloss: spec.gloss,
    title,
    lesson,
    cols: columns.map((c) => c.label),
    rows: PERSONS.map((label, r) => ({ label, cells: columns.map((c) => c.forms[r]) })),
    names: PERSON_NAMES.map((p) => columns.map((c) => `${p}, ${c.name}`)),
  };
}

const withRoot = (root: string, six: readonly string[]) => six.map((e) => `${root}|${e}`);
const compound = (supine: string, sg: string[], pl: string[]) => [
  ...sg.map((s) => `${supine}us ${s}`),
  ...pl.map((s) => `${supine}ī ${s}`),
];

export function verb(spec: VerbSpec, tables: VerbTables): Paradigm[] {
  const { conj: c, root } = spec;
  const out: Paradigm[] = [];
  const act = spec.deponent ? '' : 'active ';
  const pass = spec.deponent ? '' : 'passive ';
  const actOrDep = spec.deponent ? PRESENT_PASSIVE : PRESENT_ACTIVE;

  if ('presentActive' in tables) {
    const v = IMPERFECT_VOWEL[c];
    out.push(
      verbTable(spec, spec.deponent ? 'pres' : 'pres-act', spec.deponent ? 'Present system, indicative' : 'Present system, active indicative', tables.presentActive, [
        { label: 'Present', name: `present ${act}indicative`, forms: withRoot(root, actOrDep[c]) },
        {
          label: 'Imperfect',
          name: `imperfect ${act}indicative`,
          forms: withRoot(root, prefix(v, spec.deponent ? ['bar', 'bāris', 'bātur', 'bāmur', 'bāminī', 'bantur'] : ['bam', 'bās', 'bat', 'bāmus', 'bātis', 'bant'])),
        },
        { label: 'Future', name: `future ${act}indicative`, forms: withRoot(root, spec.deponent ? futurePassive(c) : futureActive(c)) },
      ]),
    );
  }
  if ('perfectActive' in tables && spec.perf) {
    const p = spec.perf;
    out.push(
      verbTable(spec, 'perf-act', 'Perfect system, active indicative', tables.perfectActive, [
        { label: 'Perfect', name: 'perfect active indicative', forms: withRoot(p, ['ī', 'istī', 'it', 'imus', 'istis', 'ērunt']) },
        { label: 'Pluperfect', name: 'pluperfect active indicative', forms: withRoot(p, ['eram', 'erās', 'erat', 'erāmus', 'erātis', 'erant']) },
        { label: 'Future perfect', name: 'future perfect active indicative', forms: withRoot(p, ['erō', 'eris', 'erit', 'erimus', 'eritis', 'erint']) },
      ]),
    );
  }
  if ('presentPassive' in tables && !spec.deponent) {
    out.push(
      verbTable(spec, 'pres-pass', 'Present system, passive indicative', tables.presentPassive, [
        { label: 'Present', name: 'present passive indicative', forms: withRoot(root, PRESENT_PASSIVE[c]) },
        { label: 'Imperfect', name: 'imperfect passive indicative', forms: withRoot(root, prefix(IMPERFECT_VOWEL[c], ['bar', 'bāris', 'bātur', 'bāmur', 'bāminī', 'bantur'])) },
        { label: 'Future', name: 'future passive indicative', forms: withRoot(root, futurePassive(c)) },
      ]),
    );
  }
  if ('perfectPassive' in tables && spec.supine) {
    const s = spec.supine;
    out.push(
      verbTable(spec, spec.deponent ? 'perf' : 'perf-pass', spec.deponent ? 'Perfect system, indicative' : 'Perfect system, passive indicative', tables.perfectPassive, [
        { label: 'Perfect', name: `perfect ${pass}indicative`, forms: compound(s, ['sum', 'es', 'est'], ['sumus', 'estis', 'sunt']) },
        { label: 'Pluperfect', name: `pluperfect ${pass}indicative`, forms: compound(s, ['eram', 'erās', 'erat'], ['erāmus', 'erātis', 'erant']) },
        { label: 'Future perfect', name: `future perfect ${pass}indicative`, forms: compound(s, ['erō', 'eris', 'erit'], ['erimus', 'eritis', 'erunt']) },
      ]),
    );
  }
  if ('subjunctiveActive' in tables && spec.perf) {
    const imp = spec.inf.slice(0, -1);
    const p = spec.perf;
    out.push(
      verbTable(spec, 'subj-act', 'Subjunctive, active', tables.subjunctiveActive, [
        { label: 'Present', name: 'present active subjunctive', forms: withRoot(root, presentSubjunctive(c, false)) },
        { label: 'Imperfect', name: 'imperfect active subjunctive', forms: withRoot(imp, ['em', 'ēs', 'et', 'ēmus', 'ētis', 'ent']) },
        { label: 'Perfect', name: 'perfect active subjunctive', forms: withRoot(p, ['erim', 'erīs', 'erit', 'erīmus', 'erītis', 'erint']) },
        { label: 'Pluperfect', name: 'pluperfect active subjunctive', forms: withRoot(p, ['issem', 'issēs', 'isset', 'issēmus', 'issētis', 'issent']) },
      ]),
    );
  }
  if ('subjunctivePassive' in tables && spec.supine) {
    const imp = spec.inf.slice(0, -1);
    const s = spec.supine;
    out.push(
      verbTable(spec, 'subj-pass', 'Subjunctive, passive', tables.subjunctivePassive, [
        { label: 'Present', name: 'present passive subjunctive', forms: withRoot(root, presentSubjunctive(c, true)) },
        { label: 'Imperfect', name: 'imperfect passive subjunctive', forms: withRoot(imp, ['er', 'ēris', 'ētur', 'ēmur', 'ēminī', 'entur']) },
        { label: 'Perfect', name: 'perfect passive subjunctive', forms: compound(s, ['sim', 'sīs', 'sit'], ['sīmus', 'sītis', 'sint']) },
        { label: 'Pluperfect', name: 'pluperfect passive subjunctive', forms: compound(s, ['essem', 'essēs', 'esset'], ['essēmus', 'essētis', 'essent']) },
      ]),
    );
  }
  return out;
}

/** An irregular verb's table, written out: columns of six forms each. */
export function verbByHand(
  spec: Pick<VerbSpec, 'id' | 'lemma' | 'gloss'>,
  key: string,
  title: string,
  lesson: string | undefined,
  columns: Array<{ label: string; name: string; forms: string[] }>,
): Paradigm {
  return verbTable(spec as VerbSpec, key, title, lesson, columns);
}

/* ------------------------------------------------------------------ */
/* Reading a cell                                                      */
/* ------------------------------------------------------------------ */

/** The forms a cell accepts, without the ending marker: "eī / iī" → ["eī", "iī"]. */
export function cellForms(cell: string): string[] {
  return cell.split(ALT).map((f) => f.replace(/\|/g, '').trim()).filter(Boolean);
}
