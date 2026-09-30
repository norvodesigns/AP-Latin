import { adjective12, adjective3, comparative, declinedByHand, noun, verb, verbByHand, type Paradigm } from './engine.ts';

export { ALT, cellForms, type Paradigm, type ParadigmKind } from './engine.ts';

/**
 * Every table Forms Forge drills, in the order the course teaches them. Each
 * names the lesson that teaches it, so the Forge can offer "what I've
 * learned" to a student in the course.
 */

const NOUNS: Paradigm[] = [
  noun({ id: 'puella', lemma: 'puella, puellae, f.', gloss: 'girl', nom: 'puella', stem: 'puell', decl: '1', title: 'First declension', lesson: 'prima-2-3' }),
  noun({ id: 'servus', lemma: 'servus, servī, m.', gloss: 'slave', nom: 'servus', stem: 'serv', decl: '2', title: 'Second declension', lesson: 'prima-3-1' }),
  noun({ id: 'puer', lemma: 'puer, puerī, m.', gloss: 'boy', nom: 'puer', stem: 'puer', decl: '2', title: 'Second declension, -er', lesson: 'prima-3-2' }),
  noun({ id: 'ager', lemma: 'ager, agrī, m.', gloss: 'field', nom: 'ager', stem: 'agr', decl: '2', title: 'Second declension, -er', lesson: 'prima-3-2' }),
  noun({ id: 'bellum', lemma: 'bellum, bellī, n.', gloss: 'war', nom: 'bellum', stem: 'bell', decl: '2n', title: 'Second declension, neuter', lesson: 'prima-3-2' }),
  noun({ id: 'rex', lemma: 'rēx, rēgis, m.', gloss: 'king', nom: 'rēx', stem: 'rēg', decl: '3', title: 'Third declension', lesson: 'prima-5-1' }),
  noun({ id: 'nomen', lemma: 'nōmen, nōminis, n.', gloss: 'name', nom: 'nōmen', stem: 'nōmin', decl: '3n', title: 'Third declension, neuter', lesson: 'prima-5-1' }),
  noun({ id: 'urbs', lemma: 'urbs, urbis, f.', gloss: 'city', nom: 'urbs', stem: 'urb', decl: '3i', title: 'Third declension, i-stem', lesson: 'prima-5-2' }),
  noun({ id: 'mare', lemma: 'mare, maris, n.', gloss: 'sea', nom: 'mare', stem: 'mar', decl: '3in', title: 'Third declension, neuter i-stem', lesson: 'prima-5-2' }),
  noun({ id: 'manus', lemma: 'manus, manūs, f.', gloss: 'hand', nom: 'manus', stem: 'man', decl: '4', title: 'Fourth declension', lesson: 'prima-8-2' }),
  noun({ id: 'res', lemma: 'rēs, reī, f.', gloss: 'thing', nom: 'rēs', stem: 'r', decl: '5', title: 'Fifth declension', lesson: 'prima-8-2' }),
  noun({ id: 'dies', lemma: 'diēs, diēī, m.', gloss: 'day', nom: 'diēs', stem: 'di', decl: '5', title: 'Fifth declension', lesson: 'prima-8-2' }),
];

const ADJECTIVES: Paradigm[] = [
  adjective12({ id: 'bonus', lemma: 'bonus, bona, bonum', gloss: 'good', title: 'First and second declension', lesson: 'prima-3-3' }, 'bonus', 'bon'),
  adjective12({ id: 'noster', lemma: 'noster, nostra, nostrum', gloss: 'our', title: 'First and second declension, -er', lesson: 'prima-7-1' }, 'noster', 'nostr'),
  adjective3({ id: 'fortis', lemma: 'fortis, forte', gloss: 'brave', title: 'Third declension, two endings', lesson: 'prima-8-1' }, { m: 'fortis', f: 'fortis', n: 'forte' }, 'fort'),
  adjective3({ id: 'acer', lemma: 'ācer, ācris, ācre', gloss: 'sharp, fierce', title: 'Third declension, three endings', lesson: 'prima-8-1' }, { m: 'ācer', f: 'ācris', n: 'ācre' }, 'ācr'),
  adjective3({ id: 'ingens', lemma: 'ingēns, ingentis', gloss: 'huge', title: 'Third declension, one ending', lesson: 'prima-8-1' }, { m: 'ingēns', f: 'ingēns', n: 'ingēns' }, 'ingent'),
  comparative({ id: 'altior', lemma: 'altior, altius', gloss: 'higher', title: 'Comparative', lesson: 'secunda-4-1' }, 'alt'),
];

const PERSONAL: Paradigm = {
  id: 'ego-tu',
  kind: 'pronoun',
  lemma: 'ego, tū, nōs, vōs',
  gloss: 'I, you, we, you (all)',
  title: 'Personal pronouns',
  lesson: 'prima-7-1',
  cols: ['ego', 'tū', 'nōs', 'vōs'],
  rows: [
    { label: 'Nominative', cells: ['ego', 'tū', 'nōs', 'vōs'] },
    { label: 'Genitive', cells: ['meī', 'tuī', 'nostrum / nostrī', 'vestrum / vestrī'] },
    { label: 'Dative', cells: ['mihi', 'tibi', 'nōbīs', 'vōbīs'] },
    { label: 'Accusative', cells: ['mē', 'tē', 'nōs', 'vōs'] },
    { label: 'Ablative', cells: ['mē', 'tē', 'nōbīs', 'vōbīs'] },
  ],
  names: ['nominative', 'genitive', 'dative', 'accusative', 'ablative'].map((c) => ['ego', 'tū', 'nōs', 'vōs'].map((p) => `${c} of ${p}`)),
};

const PRONOUNS: Paradigm[] = [
  PERSONAL,
  declinedByHand({ id: 'is', lemma: 'is, ea, id', gloss: 'he, she, it; this, that', title: 'Demonstrative', lesson: 'prima-7-2' }, 'pronoun', {
    m: ['is', 'eius', 'eī', 'eum', 'eō', 'eī / iī', 'eōrum', 'eīs / iīs', 'eōs', 'eīs / iīs'],
    f: ['ea', 'eius', 'eī', 'eam', 'eā', 'eae', 'eārum', 'eīs / iīs', 'eās', 'eīs / iīs'],
    n: ['id', 'eius', 'eī', 'id', 'eō', 'ea', 'eōrum', 'eīs / iīs', 'ea', 'eīs / iīs'],
  }),
  declinedByHand({ id: 'hic', lemma: 'hic, haec, hoc', gloss: 'this', title: 'Demonstrative', lesson: 'prima-7-3' }, 'pronoun', {
    m: ['hic', 'huius', 'huic', 'hunc', 'hōc', 'hī', 'hōrum', 'hīs', 'hōs', 'hīs'],
    f: ['haec', 'huius', 'huic', 'hanc', 'hāc', 'hae', 'hārum', 'hīs', 'hās', 'hīs'],
    n: ['hoc', 'huius', 'huic', 'hoc', 'hōc', 'haec', 'hōrum', 'hīs', 'haec', 'hīs'],
  }),
  declinedByHand({ id: 'ille', lemma: 'ille, illa, illud', gloss: 'that', title: 'Demonstrative', lesson: 'prima-7-3' }, 'pronoun', {
    m: ['ille', 'illīus', 'illī', 'illum', 'illō', 'illī', 'illōrum', 'illīs', 'illōs', 'illīs'],
    f: ['illa', 'illīus', 'illī', 'illam', 'illā', 'illae', 'illārum', 'illīs', 'illās', 'illīs'],
    n: ['illud', 'illīus', 'illī', 'illud', 'illō', 'illa', 'illōrum', 'illīs', 'illa', 'illīs'],
  }),
  declinedByHand({ id: 'qui', lemma: 'quī, quae, quod', gloss: 'who, which, that', title: 'Relative pronoun', lesson: 'prima-7-4' }, 'pronoun', {
    m: ['quī', 'cuius', 'cui', 'quem', 'quō', 'quī', 'quōrum', 'quibus', 'quōs', 'quibus'],
    f: ['quae', 'cuius', 'cui', 'quam', 'quā', 'quae', 'quārum', 'quibus', 'quās', 'quibus'],
    n: ['quod', 'cuius', 'cui', 'quod', 'quō', 'quae', 'quōrum', 'quibus', 'quae', 'quibus'],
  }),
  declinedByHand({ id: 'ipse', lemma: 'ipse, ipsa, ipsum', gloss: '-self, the very', title: 'Intensive', lesson: 'secunda-4-5' }, 'pronoun', {
    m: ['ipse', 'ipsīus', 'ipsī', 'ipsum', 'ipsō', 'ipsī', 'ipsōrum', 'ipsīs', 'ipsōs', 'ipsīs'],
    f: ['ipsa', 'ipsīus', 'ipsī', 'ipsam', 'ipsā', 'ipsae', 'ipsārum', 'ipsīs', 'ipsās', 'ipsīs'],
    n: ['ipsum', 'ipsīus', 'ipsī', 'ipsum', 'ipsō', 'ipsa', 'ipsōrum', 'ipsīs', 'ipsa', 'ipsīs'],
  }),
  declinedByHand({ id: 'idem', lemma: 'īdem, eadem, idem', gloss: 'the same', title: 'Identifying', lesson: 'secunda-4-5' }, 'pronoun', {
    m: ['īdem', 'eiusdem', 'eīdem', 'eundem', 'eōdem', 'eīdem / īdem', 'eōrundem', 'eīsdem / īsdem', 'eōsdem', 'eīsdem / īsdem'],
    f: ['eadem', 'eiusdem', 'eīdem', 'eandem', 'eādem', 'eaedem', 'eārundem', 'eīsdem / īsdem', 'eāsdem', 'eīsdem / īsdem'],
    n: ['idem', 'eiusdem', 'eīdem', 'idem', 'eōdem', 'eadem', 'eōrundem', 'eīsdem / īsdem', 'eadem', 'eīsdem / īsdem'],
  }),
];

/** Where each regular verb's tables are taught. */
const REGULAR_LESSONS = (presentActive: string) => ({
  presentActive,
  perfectActive: 'prima-6-4',
  presentPassive: 'prima-8-3',
  perfectPassive: 'prima-8-4',
  subjunctiveActive: 'secunda-6-1',
  subjunctivePassive: 'secunda-6-1',
});

const SUM = { id: 'sum', lemma: 'sum, esse, fuī, futūrus', gloss: 'to be' };
const POSSUM = { id: 'possum', lemma: 'possum, posse, potuī', gloss: 'to be able, can' };

const VERBS: Paradigm[] = [
  ...verb({ id: 'amo', lemma: 'amō, amāre, amāvī, amātum', gloss: 'to love', conj: '1', root: 'am', inf: 'amāre', perf: 'amāv', supine: 'amāt' }, REGULAR_LESSONS('prima-4-4')),
  ...verb({ id: 'moneo', lemma: 'moneō, monēre, monuī, monitum', gloss: 'to warn', conj: '2', root: 'mon', inf: 'monēre', perf: 'monu', supine: 'monit' }, REGULAR_LESSONS('prima-4-4')),
  ...verb({ id: 'rego', lemma: 'regō, regere, rēxī, rēctum', gloss: 'to rule', conj: '3', root: 'reg', inf: 'regere', perf: 'rēx', supine: 'rēct' }, REGULAR_LESSONS('prima-5-4')),
  ...verb({ id: 'capio', lemma: 'capiō, capere, cēpī, captum', gloss: 'to take, capture', conj: '3io', root: 'cap', inf: 'capere', perf: 'cēp', supine: 'capt' }, REGULAR_LESSONS('prima-5-4')),
  ...verb({ id: 'audio', lemma: 'audiō, audīre, audīvī, audītum', gloss: 'to hear', conj: '4', root: 'aud', inf: 'audīre', perf: 'audīv', supine: 'audīt' }, REGULAR_LESSONS('prima-5-4')),

  verbByHand(SUM, 'pres', 'Present system, indicative', 'prima-4-4', [
    { label: 'Present', name: 'present indicative', forms: ['sum', 'es', 'est', 'sumus', 'estis', 'sunt'] },
    { label: 'Imperfect', name: 'imperfect indicative', forms: ['eram', 'erās', 'erat', 'erāmus', 'erātis', 'erant'] },
    { label: 'Future', name: 'future indicative', forms: ['erō', 'eris', 'erit', 'erimus', 'eritis', 'erunt'] },
  ]),
  verbByHand(SUM, 'perf', 'Perfect system, indicative', 'prima-6-4', [
    { label: 'Perfect', name: 'perfect indicative', forms: ['fu|ī', 'fu|istī', 'fu|it', 'fu|imus', 'fu|istis', 'fu|ērunt'] },
    { label: 'Pluperfect', name: 'pluperfect indicative', forms: ['fu|eram', 'fu|erās', 'fu|erat', 'fu|erāmus', 'fu|erātis', 'fu|erant'] },
    { label: 'Future perfect', name: 'future perfect indicative', forms: ['fu|erō', 'fu|eris', 'fu|erit', 'fu|erimus', 'fu|eritis', 'fu|erint'] },
  ]),
  verbByHand(SUM, 'subj', 'Subjunctive', 'secunda-6-1', [
    { label: 'Present', name: 'present subjunctive', forms: ['sim', 'sīs', 'sit', 'sīmus', 'sītis', 'sint'] },
    { label: 'Imperfect', name: 'imperfect subjunctive', forms: ['essem', 'essēs', 'esset', 'essēmus', 'essētis', 'essent'] },
    { label: 'Perfect', name: 'perfect subjunctive', forms: ['fu|erim', 'fu|erīs', 'fu|erit', 'fu|erīmus', 'fu|erītis', 'fu|erint'] },
    { label: 'Pluperfect', name: 'pluperfect subjunctive', forms: ['fu|issem', 'fu|issēs', 'fu|isset', 'fu|issēmus', 'fu|issētis', 'fu|issent'] },
  ]),
  verbByHand(POSSUM, 'pres', 'Present system, indicative', 'secunda-1-3', [
    { label: 'Present', name: 'present indicative', forms: ['possum', 'potes', 'potest', 'possumus', 'potestis', 'possunt'] },
    { label: 'Imperfect', name: 'imperfect indicative', forms: ['poteram', 'poterās', 'poterat', 'poterāmus', 'poterātis', 'poterant'] },
    { label: 'Future', name: 'future indicative', forms: ['poterō', 'poteris', 'poterit', 'poterimus', 'poteritis', 'poterunt'] },
  ]),
  verbByHand({ id: 'volo', lemma: 'volō, velle, voluī', gloss: 'to want' }, 'pres', 'Present system, indicative', 'secunda-1-4', [
    { label: 'Present', name: 'present indicative', forms: ['volō', 'vīs', 'vult', 'volumus', 'vultis', 'volunt'] },
    { label: 'Imperfect', name: 'imperfect indicative', forms: ['vol|ēbam', 'vol|ēbās', 'vol|ēbat', 'vol|ēbāmus', 'vol|ēbātis', 'vol|ēbant'] },
    { label: 'Future', name: 'future indicative', forms: ['vol|am', 'vol|ēs', 'vol|et', 'vol|ēmus', 'vol|ētis', 'vol|ent'] },
  ]),
  verbByHand({ id: 'eo', lemma: 'eō, īre, iī, itum', gloss: 'to go' }, 'pres', 'Present system, indicative', 'secunda-1-5', [
    { label: 'Present', name: 'present indicative', forms: ['eō', 'īs', 'it', 'īmus', 'ītis', 'eunt'] },
    { label: 'Imperfect', name: 'imperfect indicative', forms: ['ībam', 'ībās', 'ībat', 'ībāmus', 'ībātis', 'ībant'] },
    { label: 'Future', name: 'future indicative', forms: ['ībō', 'ībis', 'ībit', 'ībimus', 'ībitis', 'ībunt'] },
  ]),
  verbByHand({ id: 'fero', lemma: 'ferō, ferre, tulī, lātum', gloss: 'to carry, bring' }, 'pres', 'Present system, active indicative', 'secunda-1-5', [
    { label: 'Present', name: 'present active indicative', forms: ['ferō', 'fers', 'fert', 'ferimus', 'fertis', 'ferunt'] },
    { label: 'Imperfect', name: 'imperfect active indicative', forms: ['fer|ēbam', 'fer|ēbās', 'fer|ēbat', 'fer|ēbāmus', 'fer|ēbātis', 'fer|ēbant'] },
    { label: 'Future', name: 'future active indicative', forms: ['fer|am', 'fer|ēs', 'fer|et', 'fer|ēmus', 'fer|ētis', 'fer|ent'] },
  ]),
  ...verb({ id: 'hortor', lemma: 'hortor, hortārī, hortātus sum', gloss: 'to encourage', conj: '1', root: 'hort', inf: 'hortārī', supine: 'hortāt', deponent: true }, { presentActive: 'secunda-1-1', perfectPassive: 'secunda-1-1' }),
  ...verb({ id: 'sequor', lemma: 'sequor, sequī, secūtus sum', gloss: 'to follow', conj: '3', root: 'sequ', inf: 'sequī', supine: 'secūt', deponent: true }, { presentActive: 'secunda-1-1', perfectPassive: 'secunda-1-1' }),
];

export const PARADIGMS: Paradigm[] = [...NOUNS, ...ADJECTIVES, ...PRONOUNS, ...VERBS];

export const PARADIGM_KIND_LABELS: Record<Paradigm['kind'], string> = {
  noun: 'Nouns',
  adjective: 'Adjectives',
  pronoun: 'Pronouns',
  verb: 'Verbs',
};
