import type { CurriculumUnit } from '../types';

/** Prīma, Unit 6: the perfect system. */
export const unit: CurriculumUnit = {
  id: 'prima-6',
  n: 6,
  title: 'The perfect system',
  blurb: 'Principal parts, and three tenses built on the perfect stem: *vēnī, vīdī, vīcī*.',
  lessons: [
    /* ------------------------------------------------------------ */
    {
      id: 'prima-6-1',
      title: 'Principal parts',
      summary: 'The four forms every Latin verb is learned by.',
      minutes: 8,
      objectives: [
        'Name a verb’s four principal parts',
        'Find the perfect stem from the third principal part',
        'Recognize the regular patterns of the first and fourth conjugations',
      ],
      words: [
        { latin: 'videō, vidēre, vīdī, vīsum', english: 'to see', vocabId: 'video' },
        { latin: 'veniō, venīre, vēnī, ventum', english: 'to come', vocabId: 'venio' },
        { latin: 'dūcō, dūcere, dūxī, ductum', english: 'to lead', vocabId: 'duco' },
        { latin: 'mittō, mittere, mīsī, missum', english: 'to send', vocabId: 'mitto' },
        { latin: 'faciō, facere, fēcī, factum', english: 'to make, do', vocabId: 'facio' },
      ],
      steps: [
        {
          kind: 'teach',
          title: 'Four forms',
          body: [
            'Until now you have learned verbs by two forms. A dictionary gives four, the **principal parts**: “I love”, “to love”, “I loved”, and the **supine**, a form you will use later.',
            'The third part is the perfect, “I loved”. Take off its *-ī* and you have the **perfect stem**, which three tenses are built on.',
          ],
          table: {
            cols: ['1st', '2nd', '3rd (perfect)', '4th'],
            rows: [
              { label: 'love', cells: ['amō', 'amāre', 'amāv|ī', 'amātum'] },
              { label: 'warn', cells: ['moneō', 'monēre', 'monu|ī', 'monitum'] },
              { label: 'rule', cells: ['regō', 'regere', 'rēx|ī', 'rēctum'] },
              { label: 'take', cells: ['capiō', 'capere', 'cēp|ī', 'captum'] },
              { label: 'hear', cells: ['audiō', 'audīre', 'audīv|ī', 'audītum'] },
              { label: 'be', cells: ['sum', 'esse', 'fu|ī', 'futūrus'] },
            ],
          },
          tip: 'First- and fourth-conjugation verbs are nearly all regular: *-āvī, -ātum* and *-īvī, -ītum*. The second and third are less predictable, so learn their parts with the word.',
        },
        {
          kind: 'choice',
          prompt: 'What is the perfect stem of *dūcō, dūcere, dūxī, ductum*?',
          latin: 'dūxī',
          options: ['dūc-', 'dūx-', 'duct-'],
          answer: 1,
          explain: 'Take *-ī* off the third part: *dūx-*.',
        },
        {
          kind: 'choice',
          prompt: 'What is the perfect stem of *veniō*?',
          latin: 'veniō, venīre, vēnī, ventum',
          options: ['ven-', 'vēn-', 'vent-'],
          answer: 1,
          explain: '*Vēnī* minus *-ī*: *vēn-*, with a long *ē* that the present does not have.',
        },
        {
          kind: 'type',
          prompt: 'Give the third principal part of the regular verb *portō, portāre*.',
          answers: ['portāvī'],
          explain: 'First conjugation: *portāvī*.',
        },
        {
          kind: 'type',
          prompt: 'Give the third principal part of the regular verb *dormiō, dormīre*.',
          answers: ['dormīvī'],
          explain: 'Fourth conjugation: *dormīvī*.',
        },
        {
          kind: 'match',
          prompt: 'Match each present to its perfect.',
          pairs: [
            ['videō', 'vīdī'],
            ['mittō', 'mīsī'],
            ['faciō', 'fēcī'],
            ['capiō', 'cēpī'],
            ['sum', 'fuī'],
          ],
        },
        {
          kind: 'choice',
          prompt: 'Which verb’s perfect is *vīcī*?',
          latin: 'vīcī',
          options: ['videō, “see”', 'vincō, “conquer”', 'veniō, “come”'],
          answer: 1,
          explain: '*Vincō, vincere, vīcī, victum*: *vīcī* “I conquered”, as in Caesar’s *vēnī, vīdī, vīcī*.',
        },
      ],
    },

    /* ------------------------------------------------------------ */
    {
      id: 'prima-6-2',
      title: 'Vēnī, vīdī, vīcī: the perfect',
      summary: 'What happened, once and for all.',
      minutes: 8,
      objectives: [
        'Form the perfect tense of any verb from its perfect stem',
        'Translate the perfect as “I did” or “I have done”',
      ],
      words: [
        { latin: 'vincō, vincere, vīcī, victum', english: 'to conquer, defeat', vocabId: 'vinco', derivatives: ['victory', 'invincible'] },
        { latin: 'dō, dare, dedī, datum', english: 'to give', vocabId: 'do' },
        { latin: 'stō, stāre, stetī, statum', english: 'to stand', vocabId: 'sto', derivatives: ['station', 'status'] },
      ],
      steps: [
        {
          kind: 'teach',
          title: 'Perfect endings',
          body: [
            'The perfect has its own set of endings, the same for every verb. Add them to the perfect stem.',
          ],
          table: {
            caption: 'The perfect',
            cols: ['amō', 'regō', 'sum'],
            rows: [
              { label: 'I', cells: ['amāv|ī', 'rēx|ī', 'fu|ī'] },
              { label: 'you', cells: ['amāv|istī', 'rēx|istī', 'fu|istī'] },
              { label: 'he, she, it', cells: ['amāv|it', 'rēx|it', 'fu|it'] },
              { label: 'we', cells: ['amāv|imus', 'rēx|imus', 'fu|imus'] },
              { label: 'you (all)', cells: ['amāv|istis', 'rēx|istis', 'fu|istis'] },
              { label: 'they', cells: ['amāv|ērunt', 'rēx|ērunt', 'fu|ērunt'] },
            ],
          },
          tip: 'The perfect can be “I loved” or “I have loved”. Caesar’s *vēnī, vīdī, vīcī* is “I came, I saw, I conquered”.',
        },
        {
          kind: 'choice',
          prompt: 'What does *vīdērunt* mean?',
          latin: 'vīdērunt',
          options: ['they see', 'they saw', 'they will see'],
          answer: 1,
          explain: 'Perfect stem *vīd-* and the ending *-ērunt*: “they saw”.',
        },
        {
          kind: 'type',
          prompt: 'Type the Latin for “we came”.',
          answers: ['vēnimus'],
          explain: '*Vēn-* plus *-imus*.',
        },
        {
          kind: 'type',
          prompt: 'Type the Latin for “you (one person) sent”.',
          answers: ['mīsistī'],
          explain: '*Mīs-* plus *-istī*.',
        },
        {
          kind: 'type',
          prompt: 'Type the Latin for “he was” in the perfect.',
          answers: ['fuit'],
          explain: '*Fuit*: he was, he has been.',
        },
        {
          kind: 'translate',
          latin: 'Vēnī, vīdī, vīcī.',
          answers: ['I came, I saw, I conquered.', 'I came, saw, conquered.', 'I came, I saw, I won.'],
        },
        {
          kind: 'translate',
          latin: 'Mīlitēs hostēs vīcērunt.',
          answers: ['The soldiers defeated the enemy.', 'The soldiers conquered the enemies.', 'The soldiers have defeated the enemy.', 'The soldiers beat the enemy.'],
        },
        {
          kind: 'translate',
          latin: 'Pater fīliō dōnum dedit.',
          answers: ['The father gave his son a gift.', 'The father gave a gift to his son.', 'The father has given his son a gift.', 'Father gave his son a gift.'],
        },
        {
          kind: 'build',
          prompt: 'Translate into Latin.',
          source: 'The king led the soldiers to the sea.',
          lang: 'la',
          answer: ['rēx', 'mīlitēs', 'ad mare', 'dūxit'],
          extra: ['dūcit', 'dūxērunt', 'in marī'],
          anyOrder: true,
        },
        {
          kind: 'match',
          prompt: 'Match each form to its meaning.',
          pairs: [
            ['stetit', 'he stood'],
            ['dedistī', 'you gave'],
            ['fēcimus', 'we made'],
            ['cēpērunt', 'they took'],
            ['audīvī', 'I heard'],
          ],
        },
      ],
    },

    /* ------------------------------------------------------------ */
    {
      id: 'prima-6-3',
      title: 'Was doing, or did?',
      summary: 'The imperfect and the perfect side by side: the background and the event.',
      minutes: 8,
      objectives: [
        'Choose between the imperfect and the perfect',
        'Read a past-tense narrative as background and events',
      ],
      words: [
        { latin: 'subitō', english: 'suddenly' },
        { latin: 'tum', english: 'then', vocabId: 'tum' },
        { latin: 'saepe', english: 'often', vocabId: 'saepe' },
      ],
      steps: [
        {
          kind: 'teach',
          title: 'Background and event',
          body: [
            'Latin has two main past tenses, and a story uses both. The **imperfect** paints the scene: what was going on, what used to happen. The **perfect** moves the story: what happened next, once.',
          ],
          examples: [
            { la: 'Puerī in agrō ambulā|bant, cum subitō equum vīd|ērunt.', en: 'The boys were walking in the field when suddenly they saw a horse.', note: 'The walking is the background; seeing the horse is the event.' },
            { la: 'Saepe ad urbem nāvigā|bat; tum semel ad īnsulam nāvigāv|it.', en: 'He often used to sail to the city; then, once, he sailed to the island.', note: '*Semel*: once.' },
          ],
          tip: 'Words like *saepe*, *semper* and *cotīdiē* suit the imperfect. *Subitō* and *tum* usually bring a perfect.',
        },
        {
          kind: 'choice',
          prompt: 'Which fits best? “Suddenly the soldier ___ a voice.”',
          latin: 'Subitō mīles vōcem ___.',
          options: ['audiēbat', 'audīvit'],
          answer: 1,
          explain: 'One sudden event: the perfect *audīvit*.',
        },
        {
          kind: 'choice',
          prompt: 'Which fits best? “Every day the farmer ___ in the field.”',
          latin: 'Cotīdiē agricola in agrō ___.',
          options: ['labōrābat', 'labōrāvit'],
          answer: 0,
          explain: 'A repeated habit: the imperfect *labōrābat*.',
        },
        {
          kind: 'choice',
          prompt: 'In this sentence, which verb is the background?',
          latin: 'Dum nautae dormiēbant, tempestās vēnit.',
          options: ['*dormiēbant*', '*vēnit*'],
          answer: 0,
          explain: 'The sailors were sleeping (imperfect, the scene) when the storm came (perfect, the event). *Dum*: while.',
        },
        {
          kind: 'translate',
          latin: 'Puella in viā stābat; tum amīcum vīdit.',
          answers: ['The girl was standing in the road; then she saw her friend.', 'The girl was standing in the street; then she saw a friend.', 'The girl stood in the road; then she saw her friend.'],
        },
        {
          kind: 'translate',
          latin: 'Rōmānī saepe pugnābant, sed hodiē nōn pugnāvērunt.',
          answers: ['The Romans often used to fight, but today they did not fight.', "The Romans often fought, but today they didn't fight.", 'The Romans used to fight often, but today they did not fight.'],
        },
        {
          kind: 'match',
          prompt: 'Match each form to its meaning.',
          pairs: [
            ['vidēbat', 'he was seeing'],
            ['vīdit', 'he saw'],
            ['veniēbant', 'they used to come'],
            ['vēnērunt', 'they came'],
          ],
        },
        {
          kind: 'build',
          prompt: 'Translate into English.',
          source: 'Dum ambulābam, subitō clāmāvit.',
          lang: 'en',
          answer: ['While', 'I', 'was', 'walking,', 'suddenly', 'he', 'shouted'],
          extra: ['shouts', 'walked', 'they'],
        },
      ],
    },

    /* ------------------------------------------------------------ */
    {
      id: 'prima-6-4',
      title: 'Had done, will have done',
      summary: 'The pluperfect and the future perfect.',
      minutes: 8,
      objectives: [
        'Form the pluperfect: perfect stem + *eram*',
        'Form the future perfect: perfect stem + *erō*',
        'Place three past tenses in order',
      ],
      words: [],
      steps: [
        {
          kind: 'teach',
          title: 'The pluperfect: had done',
          body: [
            'The **pluperfect** says what had already happened before another past event. Build it from the perfect stem and the endings of *eram*.',
          ],
          table: {
            cols: ['Latin', 'English'],
            rows: [
              { label: 'I', cells: ['amāv|eram', 'I had loved'] },
              { label: 'you', cells: ['amāv|erās', 'you had loved'] },
              { label: 'he, she, it', cells: ['amāv|erat', 'he had loved'] },
              { label: 'we', cells: ['amāv|erāmus', 'we had loved'] },
              { label: 'you (all)', cells: ['amāv|erātis', 'you had loved'] },
              { label: 'they', cells: ['amāv|erant', 'they had loved'] },
            ],
          },
        },
        {
          kind: 'teach',
          title: 'The future perfect: will have done',
          body: [
            'The **future perfect** says what will already have happened by some point in the future. It uses the perfect stem and endings like *erō*, except that “they” is *-erint*.',
            'Latin uses it more strictly than English: “When you come, I will tell you” is, in Latin, “When you will have come”: *Cum vēneris, tibi dīcam*.',
          ],
          table: {
            cols: ['Latin', 'English'],
            rows: [
              { label: 'I', cells: ['amāv|erō', 'I will have loved'] },
              { label: 'you', cells: ['amāv|eris', 'you will have loved'] },
              { label: 'he, she, it', cells: ['amāv|erit', 'he will have loved'] },
              { label: 'we', cells: ['amāv|erimus', 'we will have loved'] },
              { label: 'you (all)', cells: ['amāv|eritis', 'you will have loved'] },
              { label: 'they', cells: ['amāv|erint', 'they will have loved'] },
            ],
          },
        },
        {
          kind: 'choice',
          prompt: 'What does *vēnerant* mean?',
          latin: 'vēnerant',
          options: ['they came', 'they had come', 'they will have come'],
          answer: 1,
          explain: 'Perfect stem *vēn-* plus *-erant*: pluperfect, “they had come”.',
        },
        {
          kind: 'choice',
          prompt: 'What does *vīcerit* mean?',
          latin: 'vīcerit',
          options: ['he had conquered', 'he will have conquered', 'he conquered'],
          answer: 1,
          explain: '*-erit* on the perfect stem is the future perfect.',
        },
        {
          kind: 'type',
          prompt: 'Type the Latin for “we had seen”.',
          answers: ['vīderāmus'],
          explain: '*Vīd-* plus *-erāmus*.',
        },
        {
          kind: 'type',
          prompt: 'Type the Latin for “I will have done”, from *faciō, fēcī*.',
          answers: ['fēcerō'],
          explain: '*Fēc-* plus *-erō*.',
        },
        {
          kind: 'translate',
          latin: 'Mīlitēs urbem cēperant, sed rēx nōn vēnerat.',
          answers: ['The soldiers had taken the city, but the king had not come.', 'The soldiers had captured the city, but the king had not come.', "The soldiers had taken the city, but the king hadn't come."],
        },
        {
          kind: 'match',
          prompt: 'Put each form with its tense.',
          pairs: [
            ['mīsit', 'he sent'],
            ['mīserat', 'he had sent'],
            ['mīserit', 'he will have sent'],
            ['mittēbat', 'he was sending'],
          ],
        },
      ],
    },

    /* ------------------------------------------------------------ */
    {
      id: 'prima-6-5',
      title: 'Reading: Arīōn et delphīnus',
      summary: 'A famous singer, greedy sailors, and a dolphin.',
      minutes: 9,
      objectives: ['Read a story told in the perfect and imperfect', 'Tell background from event as you read'],
      words: [],
      steps: [
        {
          kind: 'read',
          title: 'Arīōn et delphīnus',
          intro: 'A Greek legend the Romans loved. Arion was a famous singer and poet.',
          lines: [
            { la: 'Ōlim Arīōn, poēta clārus, in Italiā cantābat.', en: 'Once upon a time Arion, a famous poet, was singing in Italy.' },
            { la: 'Ibi multam pecūniam habuit.', en: 'There he gained a great deal of money.' },
            { la: 'Tum nāvem cōnscendit et ad Graeciam nāvigāvit.', en: 'Then he boarded a ship and sailed for Greece.' },
            { la: 'Sed nautae malī pecūniam poētae cupīvērunt.', en: 'But the wicked sailors wanted the poet’s money.' },
            { la: '“Tē necābimus,” dīxērunt.', en: '“We will kill you,” they said.' },
            { la: 'Arīōn ultimum carmen cantāvit et in mare dēsiluit.', en: 'Arion sang a last song and leapt into the sea.' },
            { la: 'Delphīnus poētam in tergō cēpit et ad terram portāvit.', en: 'A dolphin took the poet on its back and carried him to land.' },
            { la: 'Nautae, ubi ad Graeciam vēnērunt, poētam vīvum vīdērunt!', en: 'When the sailors reached Greece, they saw the poet alive!' },
          ],
          gloss: [
            { word: 'clārus, -a, -um', meaning: 'famous' },
            { word: 'cantābat, cantāvit', meaning: 'was singing, sang' },
            { word: 'ibi', meaning: 'there' },
            { word: 'pecūnia, -ae, f.', meaning: 'money' },
            { word: 'cōnscendit', meaning: 'boarded' },
            { word: 'cupīvērunt', meaning: 'desired, wanted' },
            { word: 'tē', meaning: 'you (accusative)' },
            { word: 'necābimus', meaning: 'we will kill' },
            { word: 'ultimus, -a, -um', meaning: 'last' },
            { word: 'carmen, -inis, n.', meaning: 'song' },
            { word: 'dēsiluit', meaning: 'leapt down' },
            { word: 'delphīnus, -ī, m.', meaning: 'dolphin' },
            { word: 'tergum, -ī, n.', meaning: 'back' },
            { word: 'ubi', meaning: 'when' },
            { word: 'vīvus, -a, -um', meaning: 'alive' },
          ],
        },
        {
          kind: 'choice',
          prompt: 'Why does the story open with the imperfect *cantābat*?',
          options: ['It is a single sudden event', 'It sets the scene: what he was doing', 'It is in the future'],
          answer: 1,
          explain: 'The imperfect paints the background before the events begin.',
        },
        {
          kind: 'choice',
          prompt: 'What did the sailors want?',
          options: ['the poet’s songs', 'the poet’s money', 'the ship'],
          answer: 1,
          explain: '*Pecūniam poētae*: the poet’s money.',
        },
        {
          kind: 'choice',
          prompt: 'What tense is *necābimus*?',
          latin: '“Tē necābimus,” dīxērunt.',
          options: ['perfect', 'imperfect', 'future'],
          answer: 2,
          explain: '*-bimus* is the future: “we will kill”.',
        },
        {
          kind: 'choice',
          prompt: 'Who saved Arion?',
          options: ['the sailors', 'a dolphin', 'a fisherman'],
          answer: 1,
          explain: '*Delphīnus poētam in tergō cēpit*.',
        },
        {
          kind: 'translate',
          latin: 'Arīōn in mare dēsiluit.',
          answers: ['Arion leapt into the sea.', 'Arion jumped into the sea.', 'Arion jumped down into the sea.'],
          explain: '*In* with the accusative *mare*: into the sea.',
        },
      ],
    },
  ],
};
