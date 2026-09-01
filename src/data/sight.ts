import type { SightPassage, Question } from './types';

/**
 * Vetted sight-reading passages.
 *
 * Every Latin text here is reproduced verbatim from The Latin Library (public
 * domain) and is checked against the source by scripts/verify-content.mjs.
 * Authors are drawn from the CED's recommended range for sight reading.
 *
 * Machine-generated passages (from the AI sight generator) are never written
 * into this file; they are cached separately and always carry a
 * "machine-selected" badge in the UI.
 */
export const sightPassages: SightPassage[] = [
  {
    id: 'sight-catullus-85',
    author: 'Catullus',
    work: 'Carmina',
    citation: 'Catullus 85',
    genre: 'poetry',
    latin: `Odi et amo. quare id faciam, fortasse requiris.
nescio, sed fieri sentio et excrucior.`,
    gloss: [{ word: 'excrucior, -ari', meaning: 'to be tortured, tormented' }],
    summary:
      'The speaker states that he both hates and loves. Asked why, he answers that he does not know — he only feels it happening, and is tortured by it.',
    questionIds: ['sight-v1', 'sight-v2', 'sight-v3'],
    source: 'The Latin Library (public domain)',
  },
  {
    id: 'sight-catullus-5',
    author: 'Catullus',
    work: 'Carmina',
    citation: 'Catullus 5.1–6',
    genre: 'poetry',
    latin: `Vivamus mea Lesbia, atque amemus,
rumoresque senum severiorum
omnes unius aestimemus assis!
soles occidere et redire possunt:
nobis cum semel occidit brevis lux,
nox est perpetua una dormienda.`,
    gloss: [
      { word: 'as, assis (m.)', meaning: 'a small coin, a penny' },
      { word: 'aestimo, -are', meaning: 'to value, reckon (+ gen. of value)' },
    ],
    summary:
      'Let us live and love, and value all the talk of stern old men at a single penny. Suns can set and return; for us, once our brief light has set, there is one everlasting night to be slept through.',
    questionIds: ['sight-cat5-1', 'sight-cat5-2', 'sight-cat5-3'],
    source: 'The Latin Library (public domain)',
  },
  {
    id: 'sight-ovid-met-1',
    author: 'Ovid',
    work: 'Metamorphoses',
    citation: 'Metamorphoses 1.1–4',
    genre: 'poetry',
    latin: `In nova fert animus mutatas dicere formas
corpora; di, coeptis (nam vos mutastis et illas)
adspirate meis primaque ab origine mundi
ad mea perpetuum deducite tempora carmen!`,
    gloss: [
      { word: 'adspiro, -are', meaning: 'to breathe upon, favour, be favourable to' },
      { word: 'mutastis', meaning: '= mutavistis' },
    ],
    summary:
      'Ovid announces his subject — forms changed into new bodies — and asks the gods, who themselves made those changes, to favour his undertaking and draw down an unbroken poem from the world’s first origin to his own times.',
    questionIds: ['sight-ovid-1', 'sight-ovid-2'],
    source: 'The Latin Library (public domain)',
  },
  {
    id: 'sight-seneca-ep-1',
    author: 'Seneca',
    work: 'Epistulae Morales ad Lucilium',
    citation: 'Epistulae 1.1',
    genre: 'prose',
    latin: `Ita fac, mi Lucili: vindica te tibi, et tempus quod adhuc aut auferebatur aut subripiebatur aut excidebat collige et serva. Persuade tibi hoc sic esse ut scribo: quaedam tempora eripiuntur nobis, quaedam subducuntur, quaedam effluunt. Turpissima tamen est iactura quae per neglegentiam fit.`,
    gloss: [
      { word: 'vindico, -are', meaning: 'to claim, lay claim to, reclaim' },
      { word: 'subripio, -ere', meaning: 'to snatch away secretly, steal' },
      { word: 'iactura, -ae (f.)', meaning: 'loss, throwing away' },
    ],
    summary:
      'Seneca urges Lucilius to claim himself for himself, and to gather and keep the time that until now was being taken, stolen or slipping away. Some time is snatched from us, some withdrawn, some simply flows off — but the most shameful loss is the one that happens through carelessness.',
    questionIds: ['sight-sen-1', 'sight-sen-2', 'sight-sen-3'],
    source: 'The Latin Library (public domain)',
  },
  {
    id: 'sight-nepos-hannibal',
    author: 'Nepos',
    work: 'De Viris Illustribus',
    citation: 'Hannibal 1.2–3',
    genre: 'prose',
    latin: `Nam quotienscumque cum eo congressus est in Italia, semper discessit superior. Quod nisi domi civium suorum invidia debilitatus esset, Romanos videtur superare potuisse. Sed multorum obtrectatio devicit unius virtutem.`,
    gloss: [
      { word: 'congredior, -i, -gressus sum', meaning: 'to meet, engage (in battle)' },
      { word: 'debilito, -are', meaning: 'to weaken, disable' },
      { word: 'obtrectatio, -onis (f.)', meaning: 'detraction, disparagement, envy' },
    ],
    summary:
      'Whenever Hannibal engaged the Roman people in Italy he always came off the better. Had he not been weakened by the envy of his own fellow citizens at home, he seems to have been able to defeat the Romans — but the disparagement of many overcame the excellence of one man.',
    questionIds: ['sight-nep-1', 'sight-nep-2', 'sight-nep-3'],
    source: 'The Latin Library (public domain)',
  },
  {
    id: 'sight-livy-praef',
    author: 'Livy',
    work: 'Ab Urbe Condita',
    citation: 'Praefatio 1',
    genre: 'prose',
    latin: `Facturusne operae pretium sim si a primordio urbis res populi Romani perscripserim nec satis scio nec, si sciam, dicere ausim, quippe qui cum veterem tum volgatam esse rem videam, dum novi semper scriptores aut in rebus certius aliquid allaturos se aut scribendi arte rudem vetustatem superaturos credunt.`,
    gloss: [
      { word: 'operae pretium', meaning: 'worth the effort, worthwhile' },
      { word: 'primordium, -i (n.)', meaning: 'first beginning, origin' },
      { word: 'volgatus, -a, -um', meaning: '(= vulgatus) commonly known, hackneyed' },
      { word: 'ausim', meaning: 'archaic perfect subjunctive of audeo, "I would dare"' },
    ],
    summary:
      'Livy says he does not know whether he will do anything worth the effort if he writes up the history of Rome from the city’s beginning — and, even if he did know, would not dare say so, since he sees the subject is both old and much handled, while new writers keep believing they will either bring greater certainty to the facts or surpass the rough style of an earlier age.',
    questionIds: ['sight-livy-1', 'sight-livy-2'],
    source: 'The Latin Library (public domain)',
  },
];

/** Questions attached to the vetted sight passages (beyond those in questions.ts). */
export const sightQuestions: Question[] = [
  {
    id: 'sight-cat5-1', type: 'grammar-syntax', skill: '1.B', skillCategory: '1', unit: '1',
    prompt: 'In line 1, Vivamus and amemus are best identified as',
    options: [
      { id: 'a', text: 'hortatory subjunctives' },
      { id: 'b', text: 'future indicatives' },
      { id: 'c', text: 'present indicatives' },
      { id: 'd', text: 'subjunctives in a purpose clause' },
    ],
    answerId: 'a',
    explanation:
      'Both are first person plural present subjunctives in a main clause with no introducing conjunction, which makes them hortatory: “let us live … and let us love”. aestimemus in line 3 is a third. A purpose clause would need ut or ne.',
    difficulty: 1,
  },
  {
    id: 'sight-cat5-2', type: 'grammar-syntax', skill: '1.B', skillCategory: '1', unit: '1',
    prompt: 'In line 3, assis is',
    options: [
      { id: 'a', text: 'genitive of value with aestimemus' },
      { id: 'b', text: 'accusative plural' },
      { id: 'c', text: 'ablative of price' },
      { id: 'd', text: 'nominative singular' },
    ],
    answerId: 'a',
    explanation:
      'Verbs of valuing take a genitive of value, so unius assis is “at a single penny”. Ablative of price is used for actual buying and selling; here nothing is bought, so the genitive is the construction. omnes agrees with rumores, not with assis.',
    difficulty: 3,
  },
  {
    id: 'sight-cat5-3', type: 'literary-device', skill: '2.A', skillCategory: '2', unit: '1',
    prompt: 'The contrast between soles occidere et redire possunt (4) and nox est perpetua una dormienda (6) chiefly conveys that',
    options: [
      { id: 'a', text: 'human life, unlike the sun, does not return once it has set' },
      { id: 'b', text: 'the speaker fears the disapproval of the old men' },
      { id: 'c', text: 'night is more beautiful than day' },
      { id: 'd', text: 'the lovers should sleep rather than talk' },
    ],
    answerId: 'a',
    explanation:
      'The sun sets and comes back; our brevis lux does not. That asymmetry is the whole argument for seizing the moment, and the gerundive dormienda (“must be slept through”) makes the one everlasting night an obligation there is no escaping.',
    difficulty: 2,
  },

  {
    id: 'sight-ovid-1', type: 'grammar-syntax', skill: '1.B', skillCategory: '1', unit: '1',
    prompt: 'In lines 1–2, mutatas … formas / corpora is best understood as',
    options: [
      { id: 'a', text: 'formas as the object of dicere, with in nova … corpora as the goal of the change' },
      { id: 'b', text: 'corpora as the subject of fert' },
      { id: 'c', text: 'formas and corpora as an ablative absolute' },
      { id: 'd', text: 'nova corpora as the direct object of mutatas' },
    ],
    answerId: 'a',
    explanation:
      'animus is the subject of fert, dicere the infinitive after it, and mutatas formas its object; in nova corpora gives what the forms were changed INTO. The interlocking is deliberate: Ovid begins his poem about transformation with a sentence whose own words are rearranged.',
    difficulty: 3,
  },
  {
    id: 'sight-ovid-2', type: 'form-identification', skill: '1.B', skillCategory: '1', unit: '1',
    prompt: 'In line 3, adspirate and in line 4 deducite are',
    options: [
      { id: 'a', text: 'present active imperatives, plural' },
      { id: 'b', text: 'present active indicatives, second person plural' },
      { id: 'c', text: 'perfect active indicatives' },
      { id: 'd', text: 'present subjunctives' },
    ],
    answerId: 'a',
    explanation:
      'Both are plural imperatives addressed to the di of line 2: “breathe favour on my undertakings … and draw down my poem”. The vocative di and the exclamation mark of the invocation confirm it — this is a prayer, the standard epic move of asking divine help.',
    difficulty: 2,
  },

  {
    id: 'sight-sen-1', type: 'grammar-syntax', skill: '1.B', skillCategory: '1', unit: '1',
    prompt: 'In the first sentence, collige and serva are',
    options: [
      { id: 'a', text: 'singular imperatives governing tempus' },
      { id: 'b', text: 'first person singular presents' },
      { id: 'c', text: 'infinitives after fac' },
      { id: 'd', text: 'perfect participles' },
    ],
    answerId: 'a',
    explanation:
      'Both are second person singular imperatives, matching fac and vindica: Seneca is issuing a string of commands to Lucilius. Their shared object is tempus, which is separated from them by the whole relative clause quod adhuc … excidebat.',
    difficulty: 2,
  },
  {
    id: 'sight-sen-2', type: 'grammar-syntax', skill: '1.B', skillCategory: '1', unit: '1',
    prompt: 'In Persuade tibi hoc sic esse ut scribo, the phrase hoc … esse is',
    options: [
      { id: 'a', text: 'an indirect statement after persuade' },
      { id: 'b', text: 'a purpose construction' },
      { id: 'c', text: 'an ablative absolute' },
      { id: 'd', text: 'a complementary infinitive with persuade' },
    ],
    answerId: 'a',
    explanation:
      'persuadeo takes a dative of the person (tibi) and here introduces an indirect statement: hoc is the accusative subject and esse the infinitive — “convince yourself that this is so”. Note that persuadeo governs the dative, not the accusative, of the person persuaded.',
    difficulty: 3,
  },
  {
    id: 'sight-sen-3', type: 'inference', skill: '3.A', skillCategory: '3', unit: '1',
    prompt: 'Seneca singles out the loss quae per neglegentiam fit because it is',
    options: [
      { id: 'a', text: 'the only kind of loss of time that is entirely our own fault' },
      { id: 'b', text: 'the largest in quantity' },
      { id: 'c', text: 'the hardest to notice' },
      { id: 'd', text: 'the one that old age brings' },
    ],
    answerId: 'a',
    explanation:
      'The three preceding verbs are all passive or intransitive — eripiuntur, subducuntur, effluunt — so that time is taken from us. Carelessness is the one case where we do it to ourselves, which is why it is turpissima, “most shameful” rather than merely greatest.',
    difficulty: 2,
  },

  {
    id: 'sight-nep-1', type: 'grammar-syntax', skill: '1.B', skillCategory: '1', unit: '1',
    prompt: 'In Quod nisi … debilitatus esset, Romanos videtur superare potuisse, the condition is',
    options: [
      { id: 'a', text: 'past contrary to fact' },
      { id: 'b', text: 'future less vivid' },
      { id: 'c', text: 'simple present' },
      { id: 'd', text: 'future more vivid' },
    ],
    answerId: 'a',
    explanation:
      'The pluperfect subjunctive debilitatus esset marks a past contrary-to-fact protasis: he WAS weakened by envy, so he did not defeat Rome. Nepos varies the expected apodosis by using videtur with a perfect infinitive — “he seems to have been able” — which softens the claim into an assessment.',
    difficulty: 3,
  },
  {
    id: 'sight-nep-2', type: 'vocabulary-in-context', skill: '1.A', skillCategory: '1', unit: '1',
    prompt: 'In this passage, discessit superior means',
    options: [
      { id: 'a', text: 'he came away the winner' },
      { id: 'b', text: 'he departed to higher ground' },
      { id: 'c', text: 'he was a superior commander' },
      { id: 'd', text: 'he withdrew from his superiors' },
    ],
    answerId: 'a',
    explanation:
      'discedere superior is an idiom for coming off better in an engagement; superior is a predicate nominative describing the subject’s state on leaving. The context — quotienscumque … congressus est, “whenever he engaged” — makes the military sense certain.',
    difficulty: 2,
  },
  {
    id: 'sight-nep-3', type: 'literary-device', skill: '2.A', skillCategory: '2', unit: '1',
    prompt: 'The contrast in multorum obtrectatio devicit unius virtutem is sharpened chiefly by',
    options: [
      { id: 'a', text: 'the juxtaposition of multorum and unius' },
      { id: 'b', text: 'anaphora' },
      { id: 'c', text: 'litotes' },
      { id: 'd', text: 'asyndeton' },
    ],
    answerId: 'a',
    explanation:
      'Two genitives, “of many” and “of one”, are set at opposite ends of a short balanced clause, so the numerical contrast carries the moral judgement: pettiness in quantity defeats excellence in a single man. It is the closing verdict of the chapter, and Nepos gives it maximum compression.',
    difficulty: 2,
  },

  {
    id: 'sight-livy-1', type: 'grammar-syntax', skill: '1.B', skillCategory: '1', unit: '1',
    prompt: 'Facturusne operae pretium sim … is best identified as',
    options: [
      { id: 'a', text: 'an indirect question dependent on scio' },
      { id: 'b', text: 'a direct question' },
      { id: 'c', text: 'a result clause' },
      { id: 'd', text: 'a relative clause of characteristic' },
    ],
    answerId: 'a',
    explanation:
      'The enclitic -ne makes it a question, and the subjunctive sim with the following nec satis scio shows it is indirect: “whether I shall do something worthwhile … I do not sufficiently know”. Livy front-loads the question before the verb that governs it, which is why the sentence is hard on first reading.',
    difficulty: 3,
  },
  {
    id: 'sight-livy-2', type: 'inference', skill: '3.A', skillCategory: '3', unit: '1',
    prompt: 'In this opening sentence Livy presents his undertaking as',
    options: [
      { id: 'a', text: 'doubtful in value, because the subject is old and much written about' },
      { id: 'b', text: 'certain to surpass all previous histories' },
      { id: 'c', text: 'a task he has been compelled to take up' },
      { id: 'd', text: 'a short work he expects to finish quickly' },
    ],
    answerId: 'a',
    explanation:
      'He says outright that he does not know whether it is worth the effort, and gives the reason: the material is both vetus and volgata. The remark about new writers always believing they will do better is quietly sceptical — including about himself. This is a modesty topos, a conventional opening move rather than genuine despair.',
    difficulty: 2,
  },
];

export function getSightPassage(id: string): SightPassage | undefined {
  return sightPassages.find((p) => p.id === id);
}

/** The authors the CED names as the range for sight-reading practice. */
export const SIGHT_AUTHORS = [
  'Nepos', 'Cicero', 'Livy', 'Seneca', 'Ovid', 'Martial', 'Tibullus', 'Catullus',
] as const;
