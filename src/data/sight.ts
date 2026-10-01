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
  {
    id: 'sight-martial-1-32',
    author: 'Martial',
    work: 'Epigrammata',
    citation: 'Epigrams 1.32',
    genre: 'poetry',
    latin: `Non amo te, Sabidi, nec possum dicere quare:
hoc tantum possum dicere, non amo te.`,
    gloss: [
      { word: 'Sabidius, -i (m.)', meaning: 'Sabidius, a man’s name (vocative Sabidi)' },
      { word: 'quare', meaning: 'why' },
    ],
    summary:
      'I don’t like you, Sabidius, and I can’t say why. All I can say is this: I don’t like you.',
    questionIds: ['sight-mart-1', 'sight-mart-2', 'sight-mart-3'],
    source: 'The Latin Library (public domain)',
  },
  {
    id: 'sight-ovid-met-8',
    author: 'Ovid',
    work: 'Metamorphoses',
    citation: 'Metamorphoses 8.183–187',
    genre: 'poetry',
    latin: `Daedalus interea Creten longumque perosus
exilium tactusque loci natalis amore
clausus erat pelago. 'terras licet' inquit 'et undas
obstruat: et caelum certe patet; ibimus illac:
omnia possideat, non possidet aera Minos.'`,
    gloss: [
      { word: 'Crete, -es (f.)', meaning: 'Crete (Greek accusative Creten)' },
      { word: 'perosus, -a, -um', meaning: 'hating, weary of (+ acc.)' },
      { word: 'obstruo, -ere', meaning: 'to block, shut off' },
      { word: 'illac', meaning: 'that way' },
      { word: 'aer, aeris (m.)', meaning: 'air (Greek accusative aera)' },
      { word: 'Minos, -ois (m.)', meaning: 'Minos, king of Crete' },
    ],
    summary:
      'Daedalus, sick of Crete and his long exile and longing for the land of his birth, was shut in by the sea. “Minos may block the lands and the waves,” he said, “but the sky at least is open: that is the way we will go. Let him own everything; he does not own the air.”',
    questionIds: ['sight-ovid8-1', 'sight-ovid8-2', 'sight-ovid8-3'],
    source: 'The Latin Library (public domain)',
  },
  {
    id: 'sight-catullus-101',
    author: 'Catullus',
    work: 'Carmina',
    citation: 'Catullus 101',
    genre: 'poetry',
    latin: `Multas per gentes et multa per aequora vectus
advenio has miseras, frater, ad inferias,
ut te postremo donarem munere mortis
et mutam nequiquam alloquerer cinerem.
quandoquidem fortuna mihi tete abstulit ipsum.
heu miser indigne frater adempte mihi,
nunc tamen interea haec, prisco quae more parentum
tradita sunt tristi munere ad inferias,
accipe fraterno multum manantia fletu,
atque in perpetuum, frater, ave atque vale.`,
    gloss: [
      { word: 'inferiae, -arum (f. pl.)', meaning: 'offerings to the dead' },
      { word: 'nequiquam', meaning: 'in vain' },
      { word: 'tete', meaning: 'emphatic form of te' },
      { word: 'adimo, -ere, -emi, -emptus', meaning: 'to take away' },
      { word: 'mano, -are', meaning: 'to flow, drip' },
    ],
    summary:
      'Carried through many peoples and over many seas, the poet comes to his brother’s grave to give him the last gift owed to the dead and to speak, in vain, to his silent ashes, since fortune has taken the brother himself. He offers the gifts handed down by ancestral custom, wet with a brother’s tears, and says hail and farewell for ever.',
    questionIds: ['sight-cat101-1', 'sight-cat101-2', 'sight-cat101-3'],
    source: 'The Latin Library (public domain)',
  },
  {
    id: 'sight-tibullus-1-1',
    author: 'Tibullus',
    work: 'Elegiae',
    citation: 'Tibullus 1.1.1–6',
    genre: 'poetry',
    latin: `Divitias alius fulvo sibi congerat auro
Et teneat culti iugera multa soli,
Quem labor adsiduus vicino terreat hoste,
Martia cui somnos classica pulsa fugent:
Me mea paupertas vita traducat inerti,
Dum meus adsiduo luceat igne focus.`,
    gloss: [
      { word: 'congero, -ere', meaning: 'to heap up, amass' },
      { word: 'iugerum, -i (n.)', meaning: 'an acre (of land)' },
      { word: 'classicum, -i (n.)', meaning: 'war trumpet' },
      { word: 'traduco, -ere', meaning: 'to lead through, spend (a life)' },
      { word: 'iners, inertis', meaning: 'idle, quiet' },
      { word: 'focus, -i (m.)', meaning: 'hearth' },
    ],
    summary:
      'Let another man heap up riches of tawny gold and hold many acres of farmland, a man whom constant toil frightens with the enemy close by, whose sleep the war trumpet’s blast drives away. As for me, let my poverty lead me through a quiet life, so long as my hearth glows with a fire that never goes out.',
    questionIds: ['sight-tib-1', 'sight-tib-2', 'sight-tib-3'],
    source: 'The Latin Library (public domain)',
  },
  {
    id: 'sight-cicero-cat-1',
    author: 'Cicero',
    work: 'In Catilinam',
    citation: 'In Catilinam 1.1',
    genre: 'prose',
    latin: `Quo usque tandem abutere, Catilina, patientia nostra? quam diu etiam furor iste tuus nos eludet? quem ad finem sese effrenata iactabit audacia? Nihilne te nocturnum praesidium Palati, nihil urbis vigiliae, nihil timor populi, nihil concursus bonorum omnium, nihil hic munitissimus habendi senatus locus, nihil horum ora voltusque moverunt? Patere tua consilia non sentis, constrictam iam horum omnium scientia teneri coniurationem tuam non vides? Quid proxima, quid superiore nocte egeris, ubi fueris, quos convocaveris, quid consilii ceperis, quem nostrum ignorare arbitraris?`,
    gloss: [
      { word: 'abutor, -i, abusus sum', meaning: 'to abuse, exploit (+ abl.)' },
      { word: 'eludo, -ere', meaning: 'to mock, make a game of' },
      { word: 'effrenatus, -a, -um', meaning: 'unbridled' },
      { word: 'sese iactare', meaning: 'to run riot, show off' },
      { word: 'Palatium, -i (n.)', meaning: 'the Palatine Hill' },
      { word: 'constringo, -ere, -strinxi, -strictus', meaning: 'to bind fast' },
    ],
    summary:
      'How long, Catiline, will you abuse our patience? How long will this madness of yours make fools of us? To what end will your unbridled boldness run riot? Have the night guard on the Palatine, the watches of the city, the people’s fear, the gathering of all good men, this fortified meeting place of the senate, the faces of these men here — has none of this moved you? Do you not realize your plans are exposed, your conspiracy held fast by everyone’s knowledge? Which of us do you think does not know what you did last night and the night before, where you were, whom you called together, what plan you made?',
    questionIds: ['sight-cat1-1', 'sight-cat1-2', 'sight-cat1-3'],
    source: 'The Latin Library (public domain)',
  },
  {
    id: 'sight-cicero-archia',
    author: 'Cicero',
    work: 'Pro Archia',
    citation: 'Pro Archia 16',
    genre: 'prose',
    latin: `Nam ceterae neque temporum sunt neque aetatum omnium neque locorum: haec studia adulescentiam alunt, senectutem oblectant, secundas res ornant, adversis perfugium ac solacium praebent, delectant domi, non impediunt foris, pernoctant nobiscum, peregrinantur, rusticantur.`,
    gloss: [
      { word: 'ceterae (sc. animi adversiones)', meaning: 'other pursuits of the mind' },
      { word: 'alo, -ere', meaning: 'to nourish' },
      { word: 'oblecto, -are', meaning: 'to delight' },
      { word: 'perfugium, -i (n.)', meaning: 'refuge' },
      { word: 'pernocto, -are', meaning: 'to spend the night' },
      { word: 'peregrinor, -ari', meaning: 'to travel abroad' },
      { word: 'rusticor, -ari', meaning: 'to stay in the country' },
    ],
    summary:
      'Other pursuits do not suit every time, age and place; but these studies nourish youth and delight old age, adorn good fortune and give refuge and comfort in bad, delight us at home and are no hindrance abroad; they spend the night with us, travel with us, and come with us to the country.',
    questionIds: ['sight-arch-1', 'sight-arch-2', 'sight-arch-3'],
    source: 'The Latin Library (public domain)',
  },
  {
    id: 'sight-seneca-ep-47',
    author: 'Seneca',
    work: 'Epistulae Morales ad Lucilium',
    citation: 'Epistulae 47.1',
    genre: 'prose',
    latin: `Libenter ex iis qui a te veniunt cognovi familiariter te cum servis tuis vivere: hoc prudentiam tuam, hoc eruditionem decet. 'Servi sunt.' Immo homines. 'Servi sunt.' Immo contubernales. 'Servi sunt.' Immo humiles amici. 'Servi sunt.' Immo conservi, si cogitaveris tantundem in utrosque licere fortunae.`,
    gloss: [
      { word: 'familiariter', meaning: 'on friendly terms' },
      { word: 'immo', meaning: 'no, rather' },
      { word: 'contubernalis, -is (m.)', meaning: 'tent-mate, companion' },
      { word: 'conservus, -i (m.)', meaning: 'fellow slave' },
      { word: 'tantundem', meaning: 'just as much' },
    ],
    summary:
      'Seneca is glad to hear from visitors that Lucilius lives on friendly terms with his slaves; it suits his good sense and his learning. To each objection, “They are slaves,” he answers: no, they are human beings; no, companions; no, humble friends; no, fellow slaves, if you consider that fortune has as much power over both.',
    questionIds: ['sight-sen47-1', 'sight-sen47-2', 'sight-sen47-3'],
    source: 'The Latin Library (public domain)',
  },
  {
    id: 'sight-livy-2-10',
    author: 'Livy',
    work: 'Ab Urbe Condita',
    citation: 'Ab Urbe Condita 2.10.9–11',
    genre: 'prose',
    latin: `Quae cum in obiecto cuncta scuto haesissent, neque ille minus obstinatus ingenti pontem obtineret gradu, iam impetu conabantur detrudere virum, cum simul fragor rupti pontis, simul clamor Romanorum, alacritate perfecti operis sublatus, pavore subito impetum sustinuit. Tum Cocles "Tiberine pater" inquit, "te sancte precor, haec arma et hunc militem propitio flumine accipias." Ita sic armatus in Tiberim desiluit multisque superincidentibus telis incolumis ad suos tranavit, rem ausus plus famae habituram ad posteros quam fidei.`,
    gloss: [
      { word: 'obiectus, -a, -um', meaning: 'held in the way' },
      { word: 'detrudo, -ere', meaning: 'to push off, dislodge' },
      { word: 'fragor, -oris (m.)', meaning: 'crash' },
      { word: 'alacritas, -atis (f.)', meaning: 'eagerness, joy' },
      { word: 'sustineo, -ere', meaning: '(here) to check, halt' },
      { word: 'trano, -are', meaning: 'to swim across' },
    ],
    summary:
      'All the enemy’s spears stuck in Horatius Cocles’ shield, and as he held the bridge as stubbornly as before, they were trying to shove him off when the crash of the broken bridge and the shout of the Romans, raised in joy at the finished work, stopped their charge with sudden fear. Then Cocles prayed, “Father Tiber, receive these arms and this soldier with a kindly stream,” leapt fully armed into the river and swam back to his side unhurt through a shower of spears, a deed that would win more fame than belief with later generations.',
    questionIds: ['sight-livy210-1', 'sight-livy210-2', 'sight-livy210-3'],
    source: 'The Latin Library (public domain)',
  },
  {
    id: 'sight-nepos-hannibal-2',
    author: 'Nepos',
    work: 'De Viris Illustribus',
    citation: 'Hannibal 2.3–4',
    genre: 'prose',
    latin: `'Pater meus' inquit 'Hamilcar puerulo me, utpote non amplius VIIII annos nato, in Hispaniam imperator proficiscens Carthagine, Iovi optimo maximo hostias immolavit. Quae divina res dum conficiebatur, quaesivit a me, vellemne secum in castra proficisci. Id cum libenter accepissem atque ab eo petere coepissem, ne dubitaret ducere, tum ille 'Faciam', inquit 'si mihi fidem, quam postulo, dederis.' Simul me ad aram adduxit, apud quam sacrificare instituerat, eamque ceteris remotis tenentem iurare iussit numquam me in amicitia cum Romanis fore.`,
    gloss: [
      { word: 'puerulus, -i (m.)', meaning: 'little boy' },
      { word: 'utpote', meaning: 'as being, since (he was)' },
      { word: 'VIIII', meaning: '= novem, nine' },
      { word: 'immolo, -are', meaning: 'to sacrifice' },
      { word: 'ara, -ae (f.)', meaning: 'altar' },
    ],
    summary:
      'Hannibal tells how his father Hamilcar, setting out from Carthage for Spain as commander when Hannibal was a boy of no more than nine, sacrificed to Jupiter Best and Greatest. During the rite he asked his son whether he wanted to come to camp with him. When the boy eagerly accepted and begged him not to hesitate, Hamilcar said he would take him if the boy gave him the pledge he asked for. He led him to the altar and, sending the others away, had him swear with his hand on it that he would never be on friendly terms with the Romans.',
    questionIds: ['sight-han2-1', 'sight-han2-2', 'sight-han2-3'],
    source: 'The Latin Library (public domain)',
  },
];

/** A question on one of the passages above, with that passage as its stimulus. */
function sq(
  passageId: string,
  id: string,
  type: Question['type'],
  skill: Question['skill'],
  prompt: string,
  options: string[],
  answer: number,
  explanation: string,
  difficulty: Question['difficulty'],
): Question {
  const p = sightPassages.find((s) => s.id === passageId);
  if (!p) throw new Error(`sight question ${id}: no passage ${passageId}`);
  return {
    id,
    type,
    skill,
    skillCategory: skill[0] as Question['skillCategory'],
    unit: '1',
    stimulus: { latin: p.latin, citation: p.citation, genre: p.genre, gloss: p.gloss },
    prompt,
    options: options.map((text, i) => ({ id: 'abcd'[i], text })),
    answerId: 'abcd'[answer],
    explanation,
    difficulty,
  };
}

/** Questions attached to the vetted sight passages (beyond those in questions.ts). */
export const sightQuestions: Question[] = [
  {
    id: 'sight-cat5-1', type: 'grammar-syntax', skill: '1.B', skillCategory: '1', unit: '1',
    stimulus: {
      latin: `Vivamus mea Lesbia, atque amemus,
rumoresque senum severiorum
omnes unius aestimemus assis!
soles occidere et redire possunt:
nobis cum semel occidit brevis lux,
nox est perpetua una dormienda.`,
      citation: 'Catullus 5.1–6',
      genre: 'poetry',
      gloss: [
        { word: 'as, assis (m.)', meaning: 'a small coin, a penny' },
        { word: 'aestimo, -are', meaning: 'to value, reckon (+ gen. of value)' },
      ],
    },
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
    stimulus: {
      latin: `Vivamus mea Lesbia, atque amemus,
rumoresque senum severiorum
omnes unius aestimemus assis!
soles occidere et redire possunt:
nobis cum semel occidit brevis lux,
nox est perpetua una dormienda.`,
      citation: 'Catullus 5.1–6',
      genre: 'poetry',
      gloss: [
        { word: 'as, assis (m.)', meaning: 'a small coin, a penny' },
        { word: 'aestimo, -are', meaning: 'to value, reckon (+ gen. of value)' },
      ],
    },
    prompt: 'In line 3, assis is',
    options: [
      { id: 'a', text: 'accusative plural' },
      { id: 'b', text: 'ablative of price' },
      { id: 'c', text: 'genitive of value with aestimemus' },
      { id: 'd', text: 'nominative singular' },
    ],
    answerId: 'c',
    explanation:
      'Verbs of valuing take a genitive of value, so unius assis is “at a single penny”. Ablative of price is used for actual buying and selling; here nothing is bought, so the genitive is the construction. omnes agrees with rumores, not with assis.',
    difficulty: 3,
  },
  {
    id: 'sight-cat5-3', type: 'literary-device', skill: '2.A', skillCategory: '2', unit: '1',
    stimulus: {
      latin: `Vivamus mea Lesbia, atque amemus,
rumoresque senum severiorum
omnes unius aestimemus assis!
soles occidere et redire possunt:
nobis cum semel occidit brevis lux,
nox est perpetua una dormienda.`,
      citation: 'Catullus 5.1–6',
      genre: 'poetry',
      gloss: [
        { word: 'as, assis (m.)', meaning: 'a small coin, a penny' },
        { word: 'aestimo, -are', meaning: 'to value, reckon (+ gen. of value)' },
      ],
    },
    prompt: 'The contrast between soles occidere et redire possunt (4) and nox est perpetua una dormienda (6) chiefly conveys that',
    options: [
      { id: 'a', text: 'the speaker fears the disapproval of the old men' },
      { id: 'b', text: 'human life, unlike the sun, does not return once it has set' },
      { id: 'c', text: 'night is more beautiful than day' },
      { id: 'd', text: 'the lovers should sleep rather than talk' },
    ],
    answerId: 'b',
    explanation:
      'The sun sets and comes back; our brevis lux does not. That asymmetry is the whole argument for seizing the moment, and the gerundive dormienda (“must be slept through”) makes the one everlasting night an obligation there is no escaping.',
    difficulty: 2,
  },

  {
    id: 'sight-ovid-1', type: 'grammar-syntax', skill: '1.B', skillCategory: '1', unit: '1',
    stimulus: {
      latin: `In nova fert animus mutatas dicere formas
corpora; di, coeptis (nam vos mutastis et illas)
adspirate meis primaque ab origine mundi
ad mea perpetuum deducite tempora carmen!`,
      citation: 'Metamorphoses 1.1–4',
      genre: 'poetry',
      gloss: [
        { word: 'adspiro, -are', meaning: 'to breathe upon, favour, be favourable to' },
        { word: 'mutastis', meaning: '= mutavistis' },
      ],
    },
    prompt: 'In lines 1–2, mutatas … formas / corpora is best understood as',
    options: [
      { id: 'a', text: 'corpora as the subject of fert' },
      { id: 'b', text: 'formas and corpora as an ablative absolute' },
      { id: 'c', text: 'nova corpora as the direct object of mutatas' },
      { id: 'd', text: 'formas as the object of dicere, with in nova … corpora as the goal of the change' },
    ],
    answerId: 'd',
    explanation:
      'animus is the subject of fert, dicere the infinitive after it, and mutatas formas its object; in nova corpora gives what the forms were changed INTO. The interlocking is deliberate: Ovid begins his poem about transformation with a sentence whose own words are rearranged.',
    difficulty: 3,
  },
  {
    id: 'sight-ovid-2', type: 'form-identification', skill: '1.B', skillCategory: '1', unit: '1',
    stimulus: {
      latin: `In nova fert animus mutatas dicere formas
corpora; di, coeptis (nam vos mutastis et illas)
adspirate meis primaque ab origine mundi
ad mea perpetuum deducite tempora carmen!`,
      citation: 'Metamorphoses 1.1–4',
      genre: 'poetry',
      gloss: [
        { word: 'adspiro, -are', meaning: 'to breathe upon, favour, be favourable to' },
        { word: 'mutastis', meaning: '= mutavistis' },
      ],
    },
    prompt: 'In line 3, adspirate and in line 4 deducite are',
    options: [
      { id: 'a', text: 'present active indicatives, second person plural' },
      { id: 'b', text: 'perfect active indicatives' },
      { id: 'c', text: 'present active imperatives, plural' },
      { id: 'd', text: 'present subjunctives' },
    ],
    answerId: 'c',
    explanation:
      'Both are plural imperatives addressed to the di of line 2: “breathe favour on my undertakings … and draw down my poem”. The vocative di and the exclamation mark of the invocation confirm it — this is a prayer, the standard epic move of asking divine help.',
    difficulty: 2,
  },

  {
    id: 'sight-sen-1', type: 'grammar-syntax', skill: '1.B', skillCategory: '1', unit: '1',
    stimulus: {
      latin: `Ita fac, mi Lucili: vindica te tibi, et tempus quod adhuc aut auferebatur aut subripiebatur aut excidebat collige et serva. Persuade tibi hoc sic esse ut scribo: quaedam tempora eripiuntur nobis, quaedam subducuntur, quaedam effluunt. Turpissima tamen est iactura quae per neglegentiam fit.`,
      citation: 'Epistulae 1.1',
      genre: 'prose',
      gloss: [
        { word: 'vindico, -are', meaning: 'to claim, lay claim to, reclaim' },
        { word: 'subripio, -ere', meaning: 'to snatch away secretly, steal' },
        { word: 'iactura, -ae (f.)', meaning: 'loss, throwing away' },
      ],
    },
    prompt: 'In the first sentence, collige and serva are',
    options: [
      { id: 'a', text: 'first person singular presents' },
      { id: 'b', text: 'singular imperatives governing tempus' },
      { id: 'c', text: 'infinitives after fac' },
      { id: 'd', text: 'perfect participles' },
    ],
    answerId: 'b',
    explanation:
      'Both are second person singular imperatives, matching fac and vindica: Seneca is issuing a string of commands to Lucilius. Their shared object is tempus, which is separated from them by the whole relative clause quod adhuc … excidebat.',
    difficulty: 2,
  },
  {
    id: 'sight-sen-2', type: 'grammar-syntax', skill: '1.B', skillCategory: '1', unit: '1',
    stimulus: {
      latin: `Ita fac, mi Lucili: vindica te tibi, et tempus quod adhuc aut auferebatur aut subripiebatur aut excidebat collige et serva. Persuade tibi hoc sic esse ut scribo: quaedam tempora eripiuntur nobis, quaedam subducuntur, quaedam effluunt. Turpissima tamen est iactura quae per neglegentiam fit.`,
      citation: 'Epistulae 1.1',
      genre: 'prose',
      gloss: [
        { word: 'vindico, -are', meaning: 'to claim, lay claim to, reclaim' },
        { word: 'subripio, -ere', meaning: 'to snatch away secretly, steal' },
        { word: 'iactura, -ae (f.)', meaning: 'loss, throwing away' },
      ],
    },
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
    stimulus: {
      latin: `Ita fac, mi Lucili: vindica te tibi, et tempus quod adhuc aut auferebatur aut subripiebatur aut excidebat collige et serva. Persuade tibi hoc sic esse ut scribo: quaedam tempora eripiuntur nobis, quaedam subducuntur, quaedam effluunt. Turpissima tamen est iactura quae per neglegentiam fit.`,
      citation: 'Epistulae 1.1',
      genre: 'prose',
      gloss: [
        { word: 'vindico, -are', meaning: 'to claim, lay claim to, reclaim' },
        { word: 'subripio, -ere', meaning: 'to snatch away secretly, steal' },
        { word: 'iactura, -ae (f.)', meaning: 'loss, throwing away' },
      ],
    },
    prompt: 'Seneca singles out the loss quae per neglegentiam fit because it is',
    options: [
      { id: 'a', text: 'the largest in quantity' },
      { id: 'b', text: 'the hardest to notice' },
      { id: 'c', text: 'the one that old age brings' },
      { id: 'd', text: 'the only kind of loss of time that is entirely our own fault' },
    ],
    answerId: 'd',
    explanation:
      'The three preceding verbs are all passive or intransitive — eripiuntur, subducuntur, effluunt — so that time is taken from us. Carelessness is the one case where we do it to ourselves, which is why it is turpissima, “most shameful” rather than merely greatest.',
    difficulty: 2,
  },

  {
    id: 'sight-nep-1', type: 'grammar-syntax', skill: '1.B', skillCategory: '1', unit: '1',
    stimulus: {
      latin: `Nam quotienscumque cum eo congressus est in Italia, semper discessit superior. Quod nisi domi civium suorum invidia debilitatus esset, Romanos videtur superare potuisse. Sed multorum obtrectatio devicit unius virtutem.`,
      citation: 'Hannibal 1.2–3',
      genre: 'prose',
      gloss: [
        { word: 'congredior, -i, -gressus sum', meaning: 'to meet, engage (in battle)' },
        { word: 'debilito, -are', meaning: 'to weaken, disable' },
        { word: 'obtrectatio, -onis (f.)', meaning: 'detraction, disparagement, envy' },
      ],
    },
    prompt: 'In Quod nisi … debilitatus esset, Romanos videtur superare potuisse, the condition is',
    options: [
      { id: 'a', text: 'future less vivid' },
      { id: 'b', text: 'past contrary to fact' },
      { id: 'c', text: 'simple present' },
      { id: 'd', text: 'future more vivid' },
    ],
    answerId: 'b',
    explanation:
      'The pluperfect subjunctive debilitatus esset marks a past contrary-to-fact protasis: he WAS weakened by envy, so he did not defeat Rome. Nepos varies the expected apodosis by using videtur with a perfect infinitive — “he seems to have been able” — which softens the claim into an assessment.',
    difficulty: 3,
  },
  {
    id: 'sight-nep-2', type: 'vocabulary-in-context', skill: '1.A', skillCategory: '1', unit: '1',
    stimulus: {
      latin: `Nam quotienscumque cum eo congressus est in Italia, semper discessit superior. Quod nisi domi civium suorum invidia debilitatus esset, Romanos videtur superare potuisse. Sed multorum obtrectatio devicit unius virtutem.`,
      citation: 'Hannibal 1.2–3',
      genre: 'prose',
      gloss: [
        { word: 'congredior, -i, -gressus sum', meaning: 'to meet, engage (in battle)' },
        { word: 'debilito, -are', meaning: 'to weaken, disable' },
        { word: 'obtrectatio, -onis (f.)', meaning: 'detraction, disparagement, envy' },
      ],
    },
    prompt: 'In this passage, discessit superior means',
    options: [
      { id: 'a', text: 'he departed to higher ground' },
      { id: 'b', text: 'he was a superior commander' },
      { id: 'c', text: 'he came away the winner' },
      { id: 'd', text: 'he withdrew from his superiors' },
    ],
    answerId: 'c',
    explanation:
      'discedere superior is an idiom for coming off better in an engagement; superior is a predicate nominative describing the subject’s state on leaving. The context — quotienscumque … congressus est, “whenever he engaged” — makes the military sense certain.',
    difficulty: 2,
  },
  {
    id: 'sight-nep-3', type: 'literary-device', skill: '2.A', skillCategory: '2', unit: '1',
    stimulus: {
      latin: `Nam quotienscumque cum eo congressus est in Italia, semper discessit superior. Quod nisi domi civium suorum invidia debilitatus esset, Romanos videtur superare potuisse. Sed multorum obtrectatio devicit unius virtutem.`,
      citation: 'Hannibal 1.2–3',
      genre: 'prose',
      gloss: [
        { word: 'congredior, -i, -gressus sum', meaning: 'to meet, engage (in battle)' },
        { word: 'debilito, -are', meaning: 'to weaken, disable' },
        { word: 'obtrectatio, -onis (f.)', meaning: 'detraction, disparagement, envy' },
      ],
    },
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
    stimulus: {
      latin: `Facturusne operae pretium sim si a primordio urbis res populi Romani perscripserim nec satis scio nec, si sciam, dicere ausim, quippe qui cum veterem tum volgatam esse rem videam, dum novi semper scriptores aut in rebus certius aliquid allaturos se aut scribendi arte rudem vetustatem superaturos credunt.`,
      citation: 'Praefatio 1',
      genre: 'prose',
      gloss: [
        { word: 'operae pretium', meaning: 'worth the effort, worthwhile' },
        { word: 'primordium, -i (n.)', meaning: 'first beginning, origin' },
        { word: 'volgatus, -a, -um', meaning: '(= vulgatus) commonly known, hackneyed' },
        { word: 'ausim', meaning: 'archaic perfect subjunctive of audeo, "I would dare"' },
      ],
    },
    prompt: 'Facturusne operae pretium sim … is best identified as',
    options: [
      { id: 'a', text: 'a direct question' },
      { id: 'b', text: 'a result clause' },
      { id: 'c', text: 'a relative clause of characteristic' },
      { id: 'd', text: 'an indirect question dependent on scio' },
    ],
    answerId: 'd',
    explanation:
      'The enclitic -ne makes it a question, and the subjunctive sim with the following nec satis scio shows it is indirect: “whether I shall do something worthwhile … I do not sufficiently know”. Livy front-loads the question before the verb that governs it, which is why the sentence is hard on first reading.',
    difficulty: 3,
  },
  {
    id: 'sight-livy-2', type: 'inference', skill: '3.A', skillCategory: '3', unit: '1',
    stimulus: {
      latin: `Facturusne operae pretium sim si a primordio urbis res populi Romani perscripserim nec satis scio nec, si sciam, dicere ausim, quippe qui cum veterem tum volgatam esse rem videam, dum novi semper scriptores aut in rebus certius aliquid allaturos se aut scribendi arte rudem vetustatem superaturos credunt.`,
      citation: 'Praefatio 1',
      genre: 'prose',
      gloss: [
        { word: 'operae pretium', meaning: 'worth the effort, worthwhile' },
        { word: 'primordium, -i (n.)', meaning: 'first beginning, origin' },
        { word: 'volgatus, -a, -um', meaning: '(= vulgatus) commonly known, hackneyed' },
        { word: 'ausim', meaning: 'archaic perfect subjunctive of audeo, "I would dare"' },
      ],
    },
    prompt: 'In this opening sentence Livy presents his undertaking as',
    options: [
      { id: 'a', text: 'certain to surpass all previous histories' },
      { id: 'b', text: 'a task he has been compelled to take up' },
      { id: 'c', text: 'doubtful in value, because the subject is old and much written about' },
      { id: 'd', text: 'a short work he expects to finish quickly' },
    ],
    answerId: 'c',
    explanation:
      'He says outright that he does not know whether it is worth the effort, and gives the reason: the material is both vetus and volgata. The remark about new writers always believing they will do better is quietly sceptical — including about himself. This is a modesty topos, a conventional opening move rather than genuine despair.',
    difficulty: 2,
  },
  sq(
    'sight-martial-1-32', 'sight-mart-1', 'grammar-syntax', '1.B',
    'In line 1, Sabidi is',
    [
      'genitive: “of Sabidius”',
      'nominative plural',
      'locative: “at Sabidius’s house”',
      'vocative: the poet speaks to Sabidius',
    ],
    3,
    'Second-declension names in -ius have a vocative in -ī: Sabidius, Sabidī. The whole epigram is said to his face.',
    1,
  ),
  sq(
    'sight-martial-1-32', 'sight-mart-2', 'literary-device', '2.A',
    'The words non amo te open line 1 and close line 2. The effect is',
    [
      'a simile comparing Sabidius to something hateful',
      'a frame: the poem ends exactly where it began',
      'litotes, softening the insult',
      'tmesis, splitting a word in two',
    ],
    1,
    'The repeated words enclose the poem, and the second line, which promises an explanation (hoc tantum possum dicere), just says the first thing again.',
    1,
  ),
  sq(
    'sight-martial-1-32', 'sight-mart-3', 'inference', '3.A',
    'The joke of the epigram is that',
    [
      'the only thing the speaker can say is what he said at the start',
      'the speaker explains his reasons at length',
      'Sabidius turns out to be a famous poet',
      'the speaker admits at the end that he likes Sabidius',
    ],
    0,
    'nec possum dicere quare sets up a reason, and hoc tantum possum dicere seems to deliver one; the punch line is that there is none. The dislike needs no explanation.',
    1,
  ),
  sq(
    'sight-ovid-met-8', 'sight-ovid8-1', 'translation-choice', '1.D',
    'In lines 3–4, terras licet … et undas obstruat is best translated',
    [
      'It is allowed to block the lands and waves',
      'He has blocked the lands and the waves',
      'Minos may block the lands and the waves',
      'Let us block the lands and the waves',
    ],
    2,
    'licet with a subjunctive is concessive: “granted that he blocks”, “he may block”. The subject is Minos, named at the end of line 5. The concession prepares the turn: et caelum certe patet.',
    2,
  ),
  sq(
    'sight-ovid-met-8', 'sight-ovid8-2', 'literary-device', '2.A',
    'In line 5, omnia possideat, non possidet aera Minos, the two forms of possideo set side by side',
    [
      'set a grudging concession against a flat denial',
      'describe two different kings',
      'contrast the past with the future',
      'repeat the same command twice',
    ],
    0,
    'possideat is a subjunctive of concession, “let him own everything”; possidet is a plain indicative, “he does not own the air”. Polyptoton, the same verb in two forms, makes the escape route sound like a logical certainty.',
    2,
  ),
  sq(
    'sight-ovid-met-8', 'sight-ovid8-3', 'inference', '3.A',
    'Daedalus turns to the sky because',
    [
      'Minos has ordered him to fly',
      'Minos controls land and sea, so only the air is left',
      'he wants to visit the gods',
      'he is tired of building things by hand',
    ],
    1,
    'clausus erat pelago: the sea shuts him in, and Minos can block land and waves. The sky is the one way left open, which is why ibimus illac follows at once.',
    1,
  ),
  sq(
    'sight-catullus-101', 'sight-cat101-1', 'grammar-syntax', '1.B',
    'In line 3, ut te postremo donarem munere mortis is',
    [
      'a result clause',
      'an indirect command',
      'a temporal clause',
      'a purpose clause',
    ],
    3,
    'It says why he has come (advenio, line 2): “so that I might present you with the last gift owed to death”. advenio is felt as “I have come”, a past, so the subjunctives are imperfect.',
    2,
  ),
  sq(
    'sight-catullus-101', 'sight-cat101-2', 'literary-device', '2.A',
    'Multas per gentes et multa per aequora (line 1) is an example of',
    [
      'litotes',
      'simile',
      'anaphora',
      'zeugma',
    ],
    2,
    'multas … multa repeated at the head of each phrase stretches out the long journey before the poet arrives at the grave. Each preposition also sits between adjective and noun.',
    1,
  ),
  sq(
    'sight-catullus-101', 'sight-cat101-3', 'inference', '3.A',
    'ave atque vale in the last line is best understood as',
    [
      'a greeting to a living friend',
      'a prayer to the gods of the underworld',
      'a promise to come back soon',
      'a final farewell, said once and for ever',
    ],
    3,
    'in perpetuum, “for ever”, makes the ritual words a last goodbye. Addressing the dead man as frater for the third time, the poem ends on what can no longer be said to his face.',
    1,
  ),
  sq(
    'sight-tibullus-1-1', 'sight-tib-1', 'grammar-syntax', '1.B',
    'congerat (line 1), teneat (line 2) and traducat (line 5) are',
    [
      'jussive subjunctives: “let him heap up …”, “let my poverty lead me …”',
      'future indicatives',
      'subjunctives in purpose clauses',
      'present indicatives',
    ],
    0,
    'Present subjunctives in main clauses with no introducing word: wishes or permissions. The poet grants the rich man his wealth and asks only for his own modest life.',
    2,
  ),
  sq(
    'sight-tibullus-1-1', 'sight-tib-2', 'inference', '3.A',
    'Divitias alius (line 1) and Me mea paupertas (line 5) each stand first in their sentences in order to',
    [
      'show that both men are soldiers',
      'contrast the rich man’s anxious life with the poet’s quiet one',
      'describe the same man twice',
      'list the gods of the countryside',
    ],
    1,
    'alius and me lead off the two halves of the comparison. The rich man’s wealth brings labor, danger and sleepless nights; the poor man’s little brings rest and a warm hearth.',
    2,
  ),
  sq(
    'sight-tibullus-1-1', 'sight-tib-3', 'translation-choice', '1.D',
    'Martia cui somnos classica pulsa fugent (line 4) is best translated',
    [
      'who drives away sleep with war trumpets',
      'whose war trumpets lull him to sleep',
      'whose sleep the blast of war trumpets drives away',
      'whom the war trumpets struck as he slept',
    ],
    2,
    'cui is a dative of reference (“for whom”, here “whose”); classica pulsa, “the sounded trumpets”, is the subject of fugent, and somnos its object.',
    3,
  ),
  sq(
    'sight-cicero-cat-1', 'sight-cat1-1', 'form-identification', '1.B',
    'abutere in the first sentence is',
    [
      'second person singular future of a deponent (= abuteris)',
      'a present infinitive',
      'an imperative',
      'third person plural perfect',
    ],
    0,
    'abūtor is deponent; -re is the other ending for -ris, and quo usque tandem looks forward: “how long will you abuse”. It takes the ablative, patientia nostra.',
    3,
  ),
  sq(
    'sight-cicero-cat-1', 'sight-cat1-2', 'literary-device', '2.A',
    'The repeated nihil … nihil … nihil in the second sentence is an example of',
    [
      'chiasmus',
      'litotes',
      'hendiadys',
      'anaphora',
    ],
    3,
    'Six times nihil begins a clause, each naming a defense of the city Catiline has ignored, before the verb moverunt finally arrives. The piling up is the point.',
    1,
  ),
  sq(
    'sight-cicero-cat-1', 'sight-cat1-3', 'inference', '3.A',
    'The questions in this opening suggest that',
    [
      'Cicero is unsure whether there is a plot',
      'Catiline’s plot is already known to everyone present',
      'the senate supports Catiline',
      'Catiline has already left the city',
    ],
    1,
    'Patere tua consilia non sentis … quem nostrum ignorare arbitraris? The questions are rhetorical: Cicero tells Catiline, in front of the senate, that his plans are exposed.',
    2,
  ),
  sq(
    'sight-cicero-archia', 'sight-arch-1', 'literary-device', '2.A',
    'haec studia adulescentiam alunt, senectutem oblectant, secundas res ornant … is a string of short clauses without conjunctions, an example of',
    [
      'asyndeton',
      'polysyndeton',
      'litotes',
      'hyperbaton',
    ],
    0,
    'No et or -que joins them: the clauses tumble out one after another, so the benefits of literature seem endless. The last three verbs, pernoctant, peregrinantur, rusticantur, are a single word each.',
    1,
  ),
  sq(
    'sight-cicero-archia', 'sight-arch-2', 'grammar-syntax', '1.B',
    'In adversis perfugium ac solacium praebent, adversis (sc. rebus) is',
    [
      'ablative absolute',
      'accusative plural',
      'genitive of description',
      'dative, the indirect object of praebent',
    ],
    3,
    'Studies give refuge and comfort to adverse circumstances, i.e. in hard times; secundas res … adversis balances good fortune with bad.',
    2,
  ),
  sq(
    'sight-cicero-archia', 'sight-arch-3', 'inference', '3.A',
    'The point of the passage is that literary studies',
    [
      'distract a public man from his duties',
      'are only for the young',
      'suit every age, place and circumstance',
      'are best kept for holidays in the country',
    ],
    2,
    'The opening contrast (ceterae neque temporum … neque aetatum … neque locorum) is answered clause by clause: youth and age, good times and bad, home, abroad, night, travel, countryside.',
    1,
  ),
  sq(
    'sight-seneca-ep-47', 'sight-sen47-1', 'grammar-syntax', '1.B',
    'In cognovi familiariter te cum servis tuis vivere, vivere is',
    [
      'a complementary infinitive',
      'an infinitive in indirect statement after cognovi',
      'an infinitive of purpose',
      'a historical infinitive',
    ],
    1,
    '“I have learned that you live on friendly terms with your slaves”: te is the subject accusative, vivere the infinitive of the reported fact.',
    1,
  ),
  sq(
    'sight-seneca-ep-47', 'sight-sen47-2', 'literary-device', '2.A',
    'The repeated Servi sunt … Immo … is',
    [
      'a simile comparing slaves to friends',
      'chiasmus',
      'litotes',
      'anaphora, in a dialogue with an imagined objector',
    ],
    3,
    'Seneca stages an argument: each time the objector says “they are slaves”, he answers with a closer word, homines, contubernales, humiles amici, conservi. The repetition builds to the last and strongest.',
    2,
  ),
  sq(
    'sight-seneca-ep-47', 'sight-sen47-3', 'inference', '3.A',
    'conservi, si cogitaveris tantundem in utrosque licere fortunae means that',
    [
      'master and slave are equally at the mercy of fortune',
      'slaves should be freed at once',
      'fortune favors masters over slaves',
      'Lucilius was once a slave',
    ],
    0,
    'If fortune has as much power over both (utrosque), master and slave are fellow slaves of fortune. Seneca argues from shared humanity, not from law.',
    2,
  ),
  sq(
    'sight-livy-2-10', 'sight-livy210-1', 'grammar-syntax', '1.B',
    'iam impetu conabantur detrudere virum, cum simul fragor rupti pontis … sustinuit: this cum clause',
    [
      'gives the reason they were attacking',
      'states a condition',
      'tells of the sudden event that cut short what they were trying to do',
      'expresses purpose',
    ],
    2,
    'cum with the indicative after a main clause in the imperfect (“they were already trying … when suddenly …”) is the so-called inverse cum: the real news is in the cum clause.',
    3,
  ),
  sq(
    'sight-livy-2-10', 'sight-livy210-2', 'grammar-syntax', '1.B',
    'In propitio flumine accipias, accipias is',
    [
      'a purpose clause',
      'a subjunctive after precor, with ut left out: “I pray that you receive”',
      'a future indicative',
      'an indirect question',
    ],
    1,
    'te sancte precor governs it as a request, ut understood: “I solemnly pray you to receive these arms and this soldier with a kindly stream.” Prayers often drop the ut.',
    2,
  ),
  sq(
    'sight-livy-2-10', 'sight-livy210-3', 'inference', '3.A',
    'rem ausus plus famae habituram ad posteros quam fidei shows that Livy',
    [
      'doubts that Horatius existed at all',
      'thinks later readers will admire the deed more than believe it',
      'is sure every detail is true',
      'blames Horatius for disobeying orders',
    ],
    1,
    'The feat would have “more fame than credibility” with posterity: Livy reports the story and in the same breath signals his reserve about it.',
    2,
  ),
  sq(
    'sight-nepos-hannibal-2', 'sight-han2-1', 'grammar-syntax', '1.B',
    'puerulo me, utpote non amplius VIIII annos nato is',
    [
      'an ablative absolute: “when I was a little boy, no more than nine years old”',
      'a dative of reference',
      'an ablative of comparison',
      'an ablative of means',
    ],
    0,
    'Noun, pronoun and participle in the ablative, apart from the main clause: the circumstance of the sacrifice. annos is accusative of extent of time with natus.',
    2,
  ),
  sq(
    'sight-nepos-hannibal-2', 'sight-han2-2', 'grammar-syntax', '1.B',
    'vellemne secum in castra proficisci is',
    [
      'a purpose clause',
      'a result clause',
      'an indirect question introduced by -ne',
      'a fear clause',
    ],
    2,
    'It is what Hamilcar asked (quaesivit a me): “whether I wanted to set out to camp with him”. -ne marks the question; vellem is subjunctive in secondary sequence.',
    1,
  ),
  sq(
    'sight-nepos-hannibal-2', 'sight-han2-3', 'inference', '3.A',
    'The details of the oath (at the altar, the others sent away, the boy holding the altar) stress',
    [
      'that Hamilcar was ashamed of it',
      'that the oath was a game',
      'that the gods opposed the war',
      'how solemn and binding the promise was',
    ],
    3,
    'A sacrifice under way, a private moment, a hand on the altar: everything makes the vow sacred. Hannibal tells the story to show that his hatred of Rome is a lifelong religious duty.',
    1,
  ),
];

export function getSightPassage(id: string): SightPassage | undefined {
  return sightPassages.find((p) => p.id === id);
}

/** The authors the CED names as the range for sight-reading practice. */
export const SIGHT_AUTHORS = [
  'Nepos', 'Cicero', 'Livy', 'Seneca', 'Ovid', 'Martial', 'Tibullus', 'Catullus',
] as const;
