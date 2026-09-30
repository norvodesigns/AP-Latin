import type { CurriculumUnit } from '../types';

/** Tertia, Unit 5: dactylic hexameter — quantity, elision, the six feet, scanning. */
export const unit: CurriculumUnit = {
  id: 'tertia-5',
  n: 5,
  title: 'The dactylic hexameter',
  blurb: 'The rhythm of Vergil: long and short syllables, elision, the six feet, and scanning real lines of the *Aeneid*.',
  lessons: [
    /* ------------------------------------------------------------ */
    {
      id: 'tertia-5-1',
      title: 'Long and short syllables',
      summary: 'Long by nature, long by position, and the few exceptions.',
      minutes: 9,
      objectives: [
        'Mark a syllable long by nature or by position',
        'Know what counts as one consonant and what counts as two',
      ],
      words: [],
      steps: [
        {
          kind: 'teach',
          title: 'Rhythm from length',
          body: [
            'Latin verse is built on the length of syllables, not on stress. A syllable is **long** if:',
            '**by nature**, its vowel is long (the ones with macrons) or it is a diphthong: *ae, au, oe*, and rarely *eu, ei*;',
            '**by position**, its vowel is followed by two consonants, even across a gap between words, or by *x* or *z*, which count as two. *Arma*: the *a* is short, but *ar-* is long, because *r* and *m* follow.',
            'Otherwise it is **short**.',
          ],
          tip: '*H* does not count as a consonant. *Qu* counts as one. A short vowel before a stop and *l* or *r* (*pl, tr, cr, gr*…) can be either: *patrem* may be *pă-trem* or *păt-rem*. And *i* before a vowel at the start of a word is a consonant, like English *y*: *Iūnō*, *iam*.',
        },
        {
          kind: 'choice',
          prompt: 'Is the first syllable of *arma* long or short?',
          latin: 'arma',
          options: ['long, by position (r and m follow)', 'short', 'long, by nature'],
          answer: 0,
          explain: 'The *a* is short by nature, but two consonants follow, so the syllable is long.',
        },
        {
          kind: 'choice',
          prompt: 'Is *ae* in *saevae* long or short?',
          latin: 'saevae',
          options: ['long: a diphthong', 'short', 'either'],
          answer: 0,
          explain: 'Diphthongs are always long.',
        },
        {
          kind: 'choice',
          prompt: 'In *et terrīs*, is the syllable *et* long or short?',
          latin: 'et terrīs',
          options: ['long, by position across the words', 'short'],
          answer: 0,
          explain: '*t* then *t*: two consonants, even though one starts the next word.',
        },
        {
          kind: 'choice',
          prompt: 'What is the second syllable of *domina*?',
          latin: 'domina',
          options: ['short: a short *i* before one consonant', 'long by position', 'long by nature'],
          answer: 0,
          explain: '*Do-mi-na*: short, short, short.',
        },
        {
          kind: 'choice',
          prompt: 'The first syllable of *patrem* is…',
          latin: 'patrem',
          options: ['either: a short vowel before *tr*', 'always long', 'always short'],
          answer: 0,
          explain: 'A stop plus *r* or *l* may count as one consonant or two; the poet chooses.',
        },
        {
          kind: 'match',
          prompt: 'Match the rule to the example.',
          pairs: [
            ['long by nature', 'Rōmā'],
            ['a diphthong', 'Trōiae'],
            ['long by position', 'arma'],
            ['x counts as two', 'rēx'],
          ],
        },
      ],
    },

    /* ------------------------------------------------------------ */
    {
      id: 'tertia-5-2',
      title: 'Elision',
      summary: 'When one word’s last vowel runs into the next word’s first.',
      minutes: 7,
      objectives: ['Find elisions in a line', 'Scan a line with elided syllables left out'],
      words: [],
      steps: [
        {
          kind: 'teach',
          title: 'Slurred together',
          body: [
            'When a word ends in a vowel, a diphthong, or a vowel plus *m*, and the next word begins with a vowel or *h*, the end of the first word is **elided**: slurred into the next and not counted in the meter.',
          ],
          examples: [
            { la: 'multum ille et terrīs', en: 'read as: mult’ ill’ et terrīs', note: 'Two elisions, *-um* and *-e*. Aeneid 1.3.' },
            { la: 'atque altae moenia Rōmae', en: 'read as: atqu’ altae moenia Rōmae', note: 'Aeneid 1.7.' },
          ],
          tip: 'Mark elided syllables with a curve under the words and skip them when you count feet.',
        },
        {
          kind: 'choice',
          prompt: 'How many elisions are there?',
          latin: 'lītora, multum ille et terrīs iactātus et altō',
          options: ['none', 'one', 'two'],
          answer: 2,
          explain: '*multum ille* (the *-um* goes) and *ille et* (the *-e* goes).',
        },
        {
          kind: 'choice',
          prompt: 'What is elided here?',
          latin: 'atque altae',
          options: ['the *-e* of *atque*', 'the *a-* of *altae*', 'nothing'],
          answer: 0,
          explain: '*Atqu’ altae*: the final vowel of the first word goes.',
        },
        {
          kind: 'choice',
          prompt: 'Is there an elision in *Tantae mōlis erat*?',
          latin: 'Tantae mōlis erat',
          options: ['no', 'yes: *tantae mōlis*', 'yes: *mōlis erat*'],
          answer: 0,
          explain: 'Elision needs a vowel (or vowel + *m*) at the end of one word and a vowel or *h* at the start of the next. *Tantae* is followed by *m*, and *mōlis* ends in *s*.',
        },
        {
          kind: 'choice',
          prompt: 'Which pair elides?',
          options: ['multum ille', 'arma virumque', 'prīmus ab'],
          answer: 0,
          explain: 'A word ending in vowel + *m*, before a vowel: *mult’ ille*. (*Prīmus ab*: *-us* ends in a consonant.)',
        },
      ],
    },

    /* ------------------------------------------------------------ */
    {
      id: 'tertia-5-3',
      title: 'Six feet',
      summary: 'Dactyls and spondees, and how every hexameter ends.',
      minutes: 9,
      objectives: ['Name the dactyl and the spondee', 'Scan Aeneid 1.1'],
      words: [],
      steps: [
        {
          kind: 'teach',
          title: 'The hexameter',
          body: [
            'A **hexameter** has six feet. Each of the first four is either a **dactyl**, long short short (– ∪ ∪), or a **spondee**, long long (– –).',
            'The fifth foot is almost always a dactyl. The sixth has two syllables, the last long or short. So every line ends with the same rhythm, – ∪ ∪ then – x: the “shave and a haircut” of epic.',
            'To scan: mark the long syllables you are sure of, cut elisions, count back from the end (the last five syllables are nearly always – ∪ ∪ – x), then fill in the rest.',
          ],
          examples: [
            { la: 'Arma vi ¦ rumque ca ¦ nō Trō ¦ iae quī ¦ prīmus ab ¦ ōrīs', en: '– ∪ ∪ ¦ – ∪ ∪ ¦ – – ¦ – – ¦ – ∪ ∪ ¦ – –', note: 'Dactyl, dactyl, spondee, spondee, dactyl, spondee: DDSSDS. Aeneid 1.1.' },
          ],
          tip: 'A line can have from 12 syllables (all spondees but the fifth) to 17 (all dactyls).',
        },
        {
          kind: 'choice',
          prompt: 'What is a dactyl?',
          options: ['long, short, short', 'long, long', 'short, long'],
          answer: 0,
          explain: '– ∪ ∪, from the Greek for “finger”: one long joint and two short ones.',
        },
        {
          kind: 'choice',
          prompt: 'Which foot is almost always a dactyl?',
          options: ['the fifth', 'the first', 'the sixth'],
          answer: 0,
          explain: 'The fifth-foot dactyl gives every hexameter its familiar ending.',
        },
        {
          kind: 'choice',
          prompt: 'What is the pattern of Aeneid 1.1?',
          latin: 'Arma virumque canō, Trōiae quī prīmus ab ōrīs',
          options: ['DDSSDS', 'DSDSDS', 'SDSSDS'],
          answer: 0,
          explain: 'Ar-ma-vi ¦ rum-que-ca ¦ nō Trō ¦ iae quī ¦ prī-mus-ab ¦ ō-rīs.',
        },
        {
          kind: 'choice',
          prompt: 'How many syllables does a hexameter of five dactyls have?',
          options: ['12', '15', '17'],
          answer: 2,
          explain: 'Five dactyls of three syllables each, plus the two of the sixth foot: 17.',
        },
        {
          kind: 'choice',
          prompt: 'Why is *nō Trō* a spondee?',
          latin: 'canō, Trōiae',
          options: ['both vowels are long by nature', 'they are long by position', 'elision'],
          answer: 0,
          explain: '*Canō* ends in a long *ō*; *Trō-* has a long *ō*.',
        },
        {
          kind: 'match',
          prompt: 'Match the terms.',
          pairs: [
            ['dactyl', '– ∪ ∪'],
            ['spondee', '– –'],
            ['hexameter', 'six feet'],
            ['elision', 'a vowel slurred away'],
          ],
        },
      ],
    },

    /* ------------------------------------------------------------ */
    {
      id: 'tertia-5-4',
      title: 'Scanning Vergil',
      summary: 'Four more lines from Aeneid 1, and the caesura.',
      minutes: 11,
      objectives: ['Scan real lines of the Aeneid', 'Find the main caesura'],
      words: [],
      steps: [
        {
          kind: 'teach',
          title: 'The caesura',
          body: [
            'A **caesura** is a break between words inside a foot. Most hexameters have a main caesura in the third foot, just after its long syllable, where a reader naturally pauses: *Arma virumque canō ‖ Trōiae quī prīmus ab ōrīs*.',
            'Now scan four more lines. Work from the end, cut the elisions, and check each syllable’s length.',
          ],
          examples: [
            { la: 'vī supe ¦ rum sae ¦ vae memo ¦ rem Iū ¦ nōnis ob ¦ īram', en: 'D S D S D S', note: 'Aeneid 1.4. *Rem Iū*: *m* and the consonant *i* make *rem* long.' },
            { la: 'lītora ¦ mult’ il ¦ l’ et ter ¦ rīs iac ¦ tātus et ¦ altō', en: 'D S S S D S', note: 'Aeneid 1.3, with two elisions.' },
          ],
        },
        {
          kind: 'choice',
          prompt: 'What is the pattern of Aeneid 1.33?',
          latin: 'Tantae mōlis erat Rōmānam condere gentem',
          options: ['SDSSDS', 'DDSSDS', 'DSDSDS'],
          answer: 0,
          explain: 'Tan-tae ¦ mō-lis-e ¦ rat Rō ¦ mā-nam ¦ con-de-re ¦ gen-tem.',
        },
        {
          kind: 'choice',
          prompt: 'What is the pattern of Aeneid 1.7?',
          latin: 'Albānīque patrēs, atque altae moenia Rōmae',
          options: ['SDSSDS', 'DDSSDS', 'SSSSDS'],
          answer: 0,
          explain: 'Al-bā ¦ nī-que-pa ¦ trēs at ¦ qu’ al-tae ¦ moe-ni-a ¦ Rō-mae.',
        },
        {
          kind: 'choice',
          prompt: 'Where is the main caesura in Aeneid 1.1?',
          latin: 'Arma virumque canō, Trōiae quī prīmus ab ōrīs',
          options: ['after *canō*', 'after *arma*', 'after *prīmus*'],
          answer: 0,
          explain: 'In the third foot, *nō ‖ Trō*: a word ends after the foot’s long syllable.',
        },
        {
          kind: 'choice',
          prompt: 'In Aeneid 1.4, why is *rem* in *memorem Iūnōnis* long?',
          options: ['*m* and the consonant *i* of *Iūnōnis* make two consonants', 'the *e* is long by nature', 'elision'],
          answer: 0,
          explain: 'Long by position, across the gap between the words.',
        },
        {
          kind: 'choice',
          prompt: 'Aeneid 1.3 scans DSSSDS. How many spondees is that?',
          latin: 'lītora, multum ille et terrīs iactātus et altō',
          options: ['two', 'three', 'four'],
          answer: 2,
          explain: 'Feet 2, 3, 4 and 6: the slow, heavy spondees suit a man tossed and battered.',
        },
      ],
    },
  ],
};
