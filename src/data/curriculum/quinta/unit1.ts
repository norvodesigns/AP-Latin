import type { CurriculumUnit } from '../types';

/** Quīnta, Unit 1: how to take apart hard poetry, with a full lesson on syncope. */
export const unit: CurriculumUnit = {
  id: 'quinta-1',
  n: 1,
  title: 'Reading hard poetry',
  blurb: 'A method for the sentences that will not come out, a full lesson on syncope and the other shortened forms, the constructions poets prefer, and how the exam wants a reading written up.',
  lessons: [
    /* ------------------------------------------------------------ */
    {
      id: 'quinta-1-1',
      title: 'A method for hard sentences',
      summary: 'Read to the full stop first, find the frame, sort by endings, and keep a list of open questions until the sentence answers them.',
      minutes: 14,
      objectives: [
        'Take apart a long sentence of Vergil without translating word by word',
        'Pair adjectives and nouns across a line break',
        'Use open questions to predict what the sentence still owes you',
      ],
      words: [],
      steps: [
        {
          kind: 'teach',
          title: 'Five moves',
          body: [
            'You have read the syllabus once, with a guide. This level is for the sentences that still will not come out, and for knowing each passage well enough to answer anything the exam asks about it. It starts with a method you can use on any line.',
            '**1. Read to the full stop, aloud, in Latin order.** Don’t translate yet. Vergil’s sentences run over the ends of lines, so the sense is in the sentence, not the line.',
            '**2. Find the frame.** Mark every finite verb: each one is a clause. The verb with no conjunction or relative in front of it is the main one. Then find its subject (it may be inside the verb) and its object, if it takes one.',
            '**3. Sort by endings, not by position.** Pair each adjective with its noun by gender, number and case, wherever the two sit. In poetry they are often a line apart, and the gap is deliberate.',
            '**4. Keep a list of open questions.** A genitive is waiting for its noun, a transitive verb for its object, *quī* for its antecedent, *ut* or *cum* for its verb, *-que* for its partner. A question you can’t close yet tells you what is coming.',
            '**5. Check it.** Read the Latin again with your English in mind. A word left over means the English is wrong somewhere. So does a line that will not scan (Lesson 2 shows how the meter checks a form).',
          ],
          tip: 'When a sentence stalls, stop translating and go back to move 2. Most mistakes on hard lines are a wrong main verb or a wrong pairing.',
        },
        {
          kind: 'teach',
          title: 'The method on Aeneid 2.203–205',
          body: [
            'Aeneas is telling Dido how Troy fell. Laocoön is sacrificing at the shore when this sentence arrives.',
            '**Frame.** The finite verbs are *horrēscō* (inside brackets, an aside), *incumbunt* and *tendunt*, joined by *-que*. Both main verbs are third person plural, so the subject is a plural nominative: *geminī … anguēs*, the first and last words of the first two lines.',
            '**Pairs.** *tranquilla* goes with *alta* after *per*: “across the calm deep”. *immēnsīs* goes with *orbibus*, an ablative of manner: “in huge coils”. *pelagō* is dative with the compound *incumbunt*: “they lean on the sea”.',
            '**Effect.** The serpents enclose the whole picture, as they will enclose Laocoön, and the reader is kept waiting a line and a half to learn what is coming across the water.',
          ],
          examples: [
            { la: 'Ecce autem geminī ā Tenedō tranquilla per alta / (horrēscō referēns) immēnsīs orbibus anguēs / incumbunt pelagō pariterque ad lītora tendunt;', en: 'But look! From Tenedos, across the calm deep, twin serpents (I shudder as I tell it) in huge coils lean on the sea and make side by side for the shore;' },
          ],
        },
        {
          kind: 'choice',
          prompt: 'Which word does *geminī* agree with?',
          latin: 'Ecce autem geminī ā Tenedō tranquilla per alta / (horrēscō referēns) immēnsīs orbibus anguēs',
          options: ['*Tenedō*', '*alta*', '*anguēs*', '*orbibus*'],
          answer: 2,
          explain: 'Both are masculine nominative plural: “twin serpents”. The adjective opens the first line and the noun closes the second, with the whole approach across the sea between them.',
        },
        {
          kind: 'choice',
          prompt: 'What case and number is *tranquilla*?',
          options: ['Ablative singular, “calmly”', 'Accusative plural neuter, with *alta* after *per*', 'Nominative singular feminine, with *Tenedō*', 'Nominative plural neuter, a second subject'],
          answer: 1,
          explain: '*Per* takes the accusative: *tranquilla per alta*, “across the calm deep”. Poets often put the adjective before the preposition and the noun after it. The meter agrees: the *-a* of *tranquilla* falls in the short part of a dactyl, and an ablative *-ā* would be long.',
        },
        {
          kind: 'choice',
          prompt: 'Why is *pelagō* dative?',
          options: ['It is the indirect object of *tendunt*', 'Dative of possession', 'Dative of agent', 'It goes with the compound verb *incumbunt*, “lean on”'],
          answer: 3,
          explain: 'Compounds of prepositions (*in-cumbō*, *sub-eō*, *prae-sum*) often take a dative. Here the serpents lie on the sea as they swim.',
        },
        {
          kind: 'choice',
          prompt: 'What does the aside *(horrēscō referēns)* add?',
          options: [
            'It tells us when the serpents arrived',
            'It is the main clause of the sentence',
            'It reminds us that Aeneas is telling this to Dido, and that he still shudders at it',
            'It addresses the serpents directly',
          ],
          answer: 2,
          explain: 'Book 2 is Aeneas’s own story at Dido’s banquet. The first person and the present tense break into the narrative: an eyewitness reliving it. That is good evidence for an essay on how the scene is made vivid.',
        },
        {
          kind: 'teach',
          title: 'Open questions on Aeneid 1.8–11',
          body: [
            'Read the four lines below and watch what each word asks for. *Memorā* is an imperative: “recall to me”. *Quō nūmine laesō* opens an indirect question, so a subjunctive verb is owed. *Volvere* and *adīre* are infinitives with nothing yet to depend on. *Virum* is an accusative waiting for a verb.',
            'Every one of those questions is answered by a single word, and Vergil holds it back to the start of line 11: *impulerit*, “drove”. The goddess drove a man to undergo so many misfortunes. When a sentence seems to be missing its verb, it is usually still coming.',
          ],
          examples: [
            { la: 'Mūsa, mihī causās memorā, quō nūmine laesō, / quidve dolēns, rēgīna deum tot volvere cāsūs / īnsīgnem pietāte virum, tot adīre labōrēs / impulerit.', en: 'Muse, recall to me the causes: with what divine will of hers offended, or grieving at what, the queen of the gods drove a man outstanding in piety to roll through so many misfortunes, to face so many labors.' },
          ],
          tip: 'A word that ends a sentence at the start of a line, after enjambment, carries weight. *Impulerit* lands like a blow. On the exam, that placement is a style point you can quote.',
        },
        {
          kind: 'choice',
          prompt: 'Why is *impulerit* subjunctive?',
          latin: 'Mūsa, mihī causās memorā, quō nūmine laesō … impulerit.',
          options: [
            'It is a jussive: “let her drive”',
            'It is perfect subjunctive in an indirect question after *memorā*',
            'It is in a result clause',
            'It is contrary to fact',
          ],
          answer: 1,
          explain: '*Quō … quidve*, “by what … or at what”, introduce an indirect question depending on *memorā*, “tell me”. The perfect subjunctive shows the action came before the asking.',
        },
        {
          kind: 'choice',
          prompt: 'What do the infinitives *volvere* and *adīre* depend on?',
          options: ['*memorā*', '*dolēns*', '*laesō*', '*impulerit*: she drove the man to undergo and to face'],
          answer: 3,
          explain: '*Impellō* with an infinitive: “drive someone to do”. Prose would use *ut* with the subjunctive. Poetry uses the infinitive freely after verbs of urging and striving (Lesson 3).',
        },
        {
          kind: 'choice',
          prompt: 'In *quō nūmine laesō*, what construction is *nūmine laesō*?',
          options: ['Ablative of agent', 'Ablative absolute: “her divinity having been offended”', 'Dative of reference', 'Ablative of comparison'],
          answer: 1,
          explain: 'A noun and a participle in the ablative, loose from the rest of the sentence: “with what divine will of hers offended”. The *quō* makes the whole phrase part of the question.',
        },
        {
          kind: 'translate',
          latin: 'Ecce autem geminī ā Tenedō tranquilla per alta immēnsīs orbibus anguēs incumbunt pelagō.',
          answers: [
            'But look, twin serpents from Tenedos across the calm deep lean on the sea in huge coils.',
            'But look, twin serpents from Tenedos lean on the sea with immense coils across the calm deep.',
            'But behold, twin serpents from Tenedos through the calm deep lean upon the sea with immense coils.',
            'But look! Twin snakes from Tenedos across the calm sea lean on the sea in huge coils.',
          ],
          explain: 'Every word counts: *autem* (“but”), *geminī* with *anguēs*, *per* with *tranquilla … alta*, *immēnsīs orbibus* as an ablative, *pelagō* as a dative.',
        },
      ],
    },

    /* ------------------------------------------------------------ */
    {
      id: 'quinta-1-2',
      title: 'Syncope: finding the missing letters',
      summary: 'Shortened forms like *spērāstī*, *ululārunt*, *audierat* and *repostum*: what drops out, how to spot it, and how to put it back.',
      minutes: 16,
      objectives: [
        'Recognize syncopated perfects and pluperfects and write their full forms',
        'Spot syncope inside a word',
        'Tell a perfect in *-ēre* from an infinitive or an imperative',
        'Tell a genitive plural in *-um* from an accusative singular',
        'Use the meter to check a shortened form',
      ],
      words: [],
      steps: [
        {
          kind: 'teach',
          title: 'What syncope is',
          body: [
            '**Syncope** (*SIN-ko-pee*, Greek for “a cutting short”) is the loss of a sound from inside a word. Romans did it in speech all the time, and poets use it freely, because the shorter word fits the hexameter where the full one will not.',
            'The exam likes it. “*Spērāstī* (line 305) is equivalent to …” is a standard multiple-choice question, and a translation that misses a syncopated form loses its segment. The good news is that a few patterns cover almost every case.',
            'The commonest are perfect-system verbs. In the perfects that end in *-āvī*, *-ēvī* and *-īvī*, the *v*, often with the vowel after it, drops out before an *s* or an *r*.',
          ],
          table: {
            caption: 'Syncopated perfects: the v and its vowel drop out',
            cols: ['Shortened', 'Full', 'Meaning'],
            rows: [
              { label: '-āvistī → -āstī', cells: ['spēr|āstī (4.305)', 'spēr|āvistī', 'you hoped'] },
              { label: '-āvērunt → -ārunt', cells: ['ulul|ārunt (4.168)', 'ulul|āvērunt', 'they wailed'] },
              { label: '-āverit → -ārit', cells: ['viol|ārit (11.591)', 'viol|āverit', 'will have violated'] },
              { label: '-āvisse → -āsse', cells: ['am|āsse', 'am|āvisse', 'to have loved'] },
              { label: '-ēv- → -ē-', cells: ['n|ōrat, n|ōstī', 'n|ōverat, n|ōvistī', 'he knew, you know'] },
              { label: '-īv- → -i-', cells: ['aud|ierat (1.20)', 'aud|īverat', 'she had heard'] },
            ],
          },
          tip: 'A perfect that seems a syllable short, ending *-āsse*, *-āstī*, *-ārunt*, *-ārat* or *-ārit*: put back *v* and the vowel the full ending needs.',
        },
        {
          kind: 'choice',
          prompt: 'Dido’s first words to Aeneas. What is *spērāstī*?',
          latin: 'dissimulāre etiam spērāstī, perfide, tantum / posse nefās',
          options: ['*spērābās*, imperfect: “you were hoping”', '*spērāre*, infinitive', '*spērāverās*, pluperfect: “you had hoped”', '*spērāvistī*, perfect: “did you hope”'],
          answer: 3,
          explain: '*-āstī* is *-āvistī* with *-vi-* gone. “Did you even hope, traitor, that you could hide so great a crime?” The perfect makes it a single settled intention, not a passing thought.',
        },
        {
          kind: 'type',
          prompt: 'Write *ululārunt* (4.168, the Nymphs at the “wedding” in the cave) in its full form.',
          answers: ['ululāvērunt'],
          explain: '*-ārunt* is *-āvērunt*: “they wailed”. The Nymphs’ cry can be a wedding shout or a funeral wail, and Vergil means both.',
        },
        {
          kind: 'choice',
          prompt: 'Diana orders vengeance on Camilla’s killer. What is *violārit*?',
          latin: 'hāc, quīcumque sacrum violārit vulnere corpus, / Trōs Italusque, mihī pariter det sanguine poenās.',
          options: ['*violāverit*, future perfect: “whoever shall have violated”', '*violāret*, imperfect subjunctive', '*violātur*, present passive', '*violārī*, passive infinitive'],
          answer: 0,
          explain: '*-ārit* is *-āverit*. The future perfect looks ahead to a killing that has not happened yet, which makes Diana’s order a prophecy too.',
        },
        {
          kind: 'teach',
          title: 'Syncope inside a word',
          body: [
            'A short vowel between two consonants can drop out of any word, not only verbs. Look for a word that is one syllable shorter than a word you know.',
            'In perfects whose stem ends in *-s* or *-x*, the *-is-* of the ending can go: *dīxtī* for *dīxistī*, *surrēxe* for *surrēxisse*, *exstīnxtī* for *exstīnxistī* (Dido to her sister, 4.682).',
          ],
          examples: [
            { la: 'manet altā mente repostum / iūdicium Paridis', en: 'there remains, stored deep in her mind, the judgment of Paris', note: '*Repostum* = *repositum*, the perfect participle of *repōnō*. Aeneid 1.26.' },
            { la: 'vinc(u)la, perīc(u)lum, saec(u)la', en: 'chains, danger, ages', note: 'The *u* of *-culum* drops out; Vergil writes *vincla* (6.395), *perīclum*, *saecla*.' },
          ],
        },
        {
          kind: 'type',
          prompt: 'Juno’s grievance is *altā mente repostum*, “stored deep in her mind” (1.26). Write *repostum* in full.',
          answers: ['repositum'],
          explain: 'The short *i* between *s* and *t* drops out: *repos(i)tum*. Three syllables where the line had room for three.',
        },
        {
          kind: 'teach',
          title: 'Four things that end in -ēre or -ere',
          body: [
            'This ending is the one that catches the most students, because it can be four different forms. Look at the **stem** first, then at the sentence.',
            'The poets’ perfect in *-ēre* (for *-ērunt*) is built on the **perfect stem**, its *ē* is long, and its subject is plural: *Tyriī tenuēre colōnī* (1.12), *fulsēre ignēs* (4.167), *iussa deum … ēgēre* (6.461–463), *Ausoniī vīdēre* (12.937). It is not syncope, strictly, but an older ending, and it hides in exactly the same way.',
          ],
          table: {
            caption: 'Same ending, four forms',
            cols: ['Example', 'How to tell', 'What it is'],
            rows: [
              { label: 'Infinitive', cells: ['vid|ēre, reg|ere', 'present stem', 'present active infinitive'] },
              { label: 'Perfect', cells: ['vīd|ēre (12.937)', 'perfect stem, plural subject', 'perfect, = vīdērunt'] },
              { label: 'Imperative', cells: ['miser|ēre (12.934), ūt|ere (12.932)', 'a deponent verb, a command', 'singular imperative'] },
              { label: 'Passive, 2nd sing.', cells: ['praeterlāb|ēre (6.874)', 'a deponent or passive, “you”', '= praeterlābēris'] },
            ],
          },
        },
        {
          kind: 'choice',
          prompt: 'Turnus, beaten, speaks to Aeneas. What is *vīdēre*?',
          latin: 'vīcistī, et victum tendere palmās / Ausoniī vīdēre',
          options: ['Present infinitive: “to see”', 'Imperative: “see!”', 'Perfect, = *vīdērunt*: “the Ausonians have seen”', 'Future passive: “you will be seen”'],
          answer: 2,
          explain: '*Vīd-* is the perfect stem, *Ausoniī* is a plural subject with no other verb, and the meter needs a long *ī* (the infinitive *vidēre* has a short one). “You have won, and the Ausonians have seen me, beaten, stretch out my hands.”',
        },
        {
          kind: 'choice',
          prompt: 'Three lines earlier: what is *miserēre*?',
          latin: 'Daunī miserēre senectae',
          options: ['Perfect: “they pitied”', 'Imperative of the deponent *misereor*: “pity the old age of Daunus”', 'Present infinitive: “to pity”', 'Future passive: “you will be pitied”'],
          answer: 1,
          explain: '*Misereor*, “pity”, is deponent and takes the genitive (*senectae*). Its imperative looks passive: *miserēre*, “have pity!”. So do *ūtere*, “use!” (12.932) and *lābere*, “glide down!” (11.588).',
        },
        {
          kind: 'choice',
          prompt: 'Which is a perfect, = *-ērunt*?',
          options: ['*condere*, in *Rōmānam condere gentem* (1.33)', '*ēgēre*, in *iussa deum … imperiīs ēgēre suīs* (6.461–463)', '*miserēre*, in *Daunī miserēre senectae* (12.934)', '*volvere*, in *sīc volvere Parcās* (1.22)'],
          answer: 1,
          explain: '*Ēg-* is the perfect stem of *agō*, and the subject is the neuter plural *iussa*: “the commands of the gods drove me with their power”. *Condere* and *volvere* are present infinitives (*volvere* in indirect statement: “that the Fates were unrolling it”), and *miserēre* is an imperative.',
        },
        {
          kind: 'teach',
          title: 'The genitive plural in -um',
          body: [
            'The second declension has an old genitive plural in *-um* beside *-ōrum*: *superum* (1.4), *deum* (1.9), *dīvum* (2.241), *Danaum* (1.30). Greek names of the first declension do it too: *Dardanidum* (2.242) for *Dardanidārum*. Books often call these syncopated as well.',
            'They look exactly like an accusative singular. Test them: does the sentence already have its object, or does it need an “of”? Is there a noun beside it that it could belong to? *Rēliquiās Danaum* (1.30) is “the leavings of the Greeks”: the Trojans who survived them.',
          ],
          examples: [
            { la: 'īnsīgnem pietāte virum', en: 'a man outstanding in piety', note: 'Accusative singular, the object of *impulerit*. Aeneid 1.10.' },
            { la: 'haec passim dea foeda virum diffundit in ōra', en: 'these things the foul goddess spreads everywhere into the mouths of men', note: 'Genitive plural, = *virōrum*, with *ōra*. Aeneid 4.195.' },
          ],
        },
        {
          kind: 'choice',
          prompt: 'Which *virum* is a genitive plural?',
          options: ['*Arma virumque canō* (1.1)', '*īnsīgnem pietāte virum* (1.10)', '*dea foeda virum diffundit in ōra* (4.195)'],
          answer: 2,
          explain: '*In ōra virum*, “into the mouths of men”: *ōra* needs an “of”, and Rumor speaks to many people, not one. The other two are objects: “the man”.',
        },
        {
          kind: 'teach',
          title: 'Let the meter check you',
          body: [
            'Every shortened form exists because the line needed it. If you scan the line, the full form usually will not fit, and that is your proof.',
            '*Spērāstī* (4.305) is three long syllables. *Spērāvistī* would add a fourth, half a foot more than the line has room for.',
            '*Audierat* (1.20) opens its line with a dactyl, *au-di-e*, because a vowel before another vowel is short. *Audīverat* would begin *au-dī*, two longs, and the line would not scan.',
            'And the long *ī* of *vīdēre* (12.937) fills a spondee, *-ī vī-*, that the infinitive *vidĕre*, with its short *i*, never could.',
          ],
          tip: 'A checklist for any strange form: (1) Is it a perfect a syllable short? Put back *-v-*. (2) Does it end *-ēre* on a perfect stem? Read *-ērunt*. (3) Does an *-um* need an “of”? Read *-ōrum*. (4) Is a word one syllable short of one you know? Put back the vowel. (5) Scan the line to confirm.',
        },
        {
          kind: 'match',
          prompt: 'Match each shortened form to its full one.',
          pairs: [
            ['spērāstī', 'spērāvistī'],
            ['ululārunt', 'ululāvērunt'],
            ['audierat', 'audīverat'],
            ['repostum', 'repositum'],
            ['vīdēre', 'vīdērunt'],
            ['Danaum', 'Danaōrum'],
          ],
        },
        {
          kind: 'type',
          prompt: 'Write *nōrant*, “they knew”, in its full form.',
          answers: ['nōverant'],
          explain: 'The pluperfect of *nōscō*, with *-ve-* gone. Like *nōvī*, it means “I know” in the perfect and “I knew” in the pluperfect.',
        },
      ],
    },

    /* ------------------------------------------------------------ */
    {
      id: 'quinta-1-3',
      title: 'Poets’ grammar',
      summary: 'The constructions Vergil uses where prose would not: the Greek accusative, places without prepositions, the dative of direction, the poetic infinitive and the historical present.',
      minutes: 14,
      objectives: [
        'Translate an accusative of respect',
        'Recognize places to and at without a preposition, and the dative of direction',
        'Explain an infinitive where prose would use a clause',
        'Say what a switch into the present tense does',
      ],
      words: [],
      steps: [
        {
          kind: 'teach',
          title: 'The Greek accusative',
          body: [
            'Greek uses an accusative to say in what respect something is true, and Latin poets borrowed it. It sits most often beside a passive participle or an adjective, and names the part of the body affected.',
            'Translate it with “in”, “as to”, or by making the part the subject: *perfūsus vittās*, “drenched as to his ribbons”, is better English as “his ribbons drenched”.',
          ],
          examples: [
            { la: 'ārdentīsque oculōs suffectī sanguine et ignī', en: 'their blazing eyes shot with blood and fire', note: 'Literally “suffused as to their eyes”. Aeneid 2.210.' },
            { la: 'perfūsus saniē vittās ātrōque venēnō', en: 'his priest’s ribbons drenched with gore and black venom', note: '*Vittās* is the accusative of respect with *perfūsus*. Aeneid 2.221.' },
          ],
        },
        {
          kind: 'choice',
          prompt: 'What is *oculōs* doing in 2.210?',
          latin: 'ārdentīsque oculōs suffectī sanguine et ignī',
          options: ['Accusative of respect: suffused “as to their eyes”', 'Object of *suffectī*', 'Accusative of place to which', 'Accusative of time'],
          answer: 0,
          explain: '*Suffectī* is passive, so it takes no object. The accusative says where the serpents are suffused with blood and fire: in their eyes.',
        },
        {
          kind: 'teach',
          title: 'Places without prepositions',
          body: [
            '**Place to which**: the plain accusative, where prose needs *ad* or *in*: *Ītaliam … vēnit* (1.2–3), “came to Italy”.',
            '**Place where**: the plain ablative: *terrīs … et altō* (1.3), “on land and on the deep”; *altā mente repostum* (1.26), “stored in her deep mind”.',
            '**Dative of direction**: a dative for the goal of motion: *īnferretque deōs Latiō* (1.6), “and bring his gods into Latium”.',
          ],
          tip: 'If a noun of place has no preposition, ask what the verb means. A verb of motion wants a “to”; a verb of being or happening wants an “in” or “on”.',
        },
        {
          kind: 'choice',
          prompt: 'What is *Latiō* in *īnferretque deōs Latiō*?',
          options: ['Ablative of place from which', 'Dative of possession', 'Ablative of means', 'Dative of direction: “into Latium”'],
          answer: 3,
          explain: '*Īnferō* is a verb of motion, so the dative names its goal. Prose would write *in Latium*.',
        },
        {
          kind: 'choice',
          prompt: 'How should *multum ille et terrīs iactātus et altō* (1.3) be translated?',
          options: ['“that man much tossed both from lands and from the deep”', '“that man much tossed both on land and on the deep”', '“that man tossed many lands and much of the deep”', '“that man, tossed by lands and by the deep”'],
          answer: 1,
          explain: 'Place where, with no *in*. The *et … et* is “both … and”, and *multum* is adverbial: “much”.',
        },
        {
          kind: 'teach',
          title: 'Infinitives where prose has clauses',
          body: [
            'After verbs of urging, striving and wanting, prose often uses *ut* with the subjunctive. Poets prefer the infinitive.',
            'Vergil also omits *esse* and *est* freely, especially in indirect statement and rhetorical questions: *Tantaene animīs caelestibus īrae?* (1.11), “(Are there) such angers in heavenly minds?”',
          ],
          examples: [
            { la: 'tot volvere cāsūs … impulerit', en: 'drove him to roll through so many misfortunes', note: 'Aeneid 1.9–11.' },
            { la: 'ille simul manibus tendit dīvellere nōdōs', en: 'at the same moment he strains with his hands to tear the knots apart', note: '*Tendō*, “strive”, with an infinitive. Aeneid 2.220.' },
            { la: 'hinc populum lātē rēgem … ventūrum excidiō Libyae', en: 'that from this would come a people ruling widely, for the destruction of Libya', note: '*Ventūrum (esse)*, indirect statement after *audierat*, with *esse* left out. Aeneid 1.21–22.' },
          ],
        },
        {
          kind: 'choice',
          prompt: 'What is missing from *ventūrum excidiō Libyae* (1.22)?',
          options: ['*esse*: it is a future infinitive in indirect statement', '*ad*: “to the destruction”', '*est*: “he is coming”', 'Nothing: *ventūrum* is a noun'],
          answer: 0,
          explain: 'Juno had heard that a people *ventūrum (esse)*, “would come”. *Excidiō* is a dative of purpose: “for the destruction”.',
        },
        {
          kind: 'teach',
          title: 'Tense for effect',
          body: [
            'Vergil narrates in the past and slips into the **historical present** for the moments he wants us to watch: the serpents *incumbunt*, *tendunt*, *petunt*, *implicat* (2.205–215). Translate it as a present or as a past, but keep it consistent and notice it, because the exam asks why.',
            'He also uses the **imperfect** for actions drawn out or repeated: *arcēbat* (1.31), “she kept them away”, year after year; and the **pluperfect** for the background: *audierat* (1.20), *exciderant* (1.26).',
          ],
        },
        {
          kind: 'choice',
          prompt: 'Why does Vergil switch to the present in 2.205–215 (*incumbunt, tendunt, petunt, implicat*)?',
          options: ['The events are still happening when Aeneas speaks', 'Latin has no past tense for these verbs', 'To make the attack vivid, as if it were happening before our eyes', 'To show the events are imagined'],
          answer: 2,
          explain: 'The historical present puts the reader at the shore beside Aeneas. Quote two of the verbs and say so in an essay.',
        },
        {
          kind: 'choice',
          prompt: 'What does the imperfect *arcēbat* (1.31) add?',
          latin: 'Trōas … arcēbat longē Latiō, multōsque per annōs / errābant',
          options: ['A single sudden act', 'Juno kept the Trojans away again and again, for years', 'Something that never happened', 'An action finished before the poem began'],
          answer: 1,
          explain: 'The imperfect of continued action, made explicit by *multōs per annōs*, “through many years”. *Errābant* is imperfect for the same reason.',
        },
      ],
    },

    /* ------------------------------------------------------------ */
    {
      id: 'quinta-1-4',
      title: 'From reading to writing',
      summary: 'What the exam asks about a passage of poetry, and how to answer it: the literal translation, the short answer, and the essay point.',
      minutes: 12,
      objectives: [
        'Translate a line of poetry the way the exam scores it',
        'Answer a short-answer question with cited and translated Latin',
        'Write an essay point that names, quotes, translates and explains',
      ],
      words: [],
      steps: [
        {
          kind: 'teach',
          title: 'Translation: every word, exactly',
          body: [
            'The translation question is scored in segments of a few words. A segment scores only if every word in it is there, in the right tense, voice, person and number, and with its case doing the right job.',
            'Poetry adds traps: a syncopated form must be expanded (*tenuēre* is “they held”), a genitive in *-um* is still “of” (*Danaum*, “of the Greeks”), *-que* and *et … et* must show, and an adjective far from its noun must still be joined to it.',
            'Supply only what the Latin implies, and put it in brackets if you like: *Tantaene animīs caelestibus īrae [sunt]?*',
          ],
        },
        {
          kind: 'choice',
          prompt: 'Which translation of *Urbs antīqua fuit, Tyriī tenuēre colōnī* (1.12) scores every segment?',
          options: [
            '“There is an ancient city; Tyrian settlers hold it.”',
            '“There was an ancient city; Tyrian settlers held it.”',
            '“It was an ancient city, to hold the Tyrian settlers.”',
            '“An ancient city had been held by settlers.”',
          ],
          answer: 1,
          explain: '*Fuit* and *tenuēre* are both perfect, and *Tyriī* must be there. The third misreads *tenuēre* as an infinitive; the last drops *Tyriī* and makes the verb passive.',
        },
        {
          kind: 'teach',
          title: 'The short answer',
          body: [
            'Short-answer questions on a syllabus passage ask about context (what has just happened, who is speaking), about meaning (what a phrase says), and about evidence (“cite and translate the Latin that shows …”).',
            'When a question says **cite and translate**, it wants both: the Latin words, with line numbers, and an accurate English version of exactly those words. A paraphrase without Latin scores nothing, and so does Latin without English.',
            'Asked for the Latin that shows Juno has not forgotten her grievances, answer: *necdum etiam causae īrārum … exciderant animō* (lines 25–26), “not yet had the causes of her anger fallen from her mind”.',
          ],
        },
        {
          kind: 'choice',
          prompt: 'A question asks: “Cite and translate the Latin that shows the serpents were frightening to look at.” Which answer earns full credit?',
          options: [
            '“The serpents had blood-red crests and burning eyes.”',
            '“*sanguineae … iubae*”',
            '“*ārdentīsque oculōs suffectī sanguine et ignī* (2.210): with their blazing eyes shot with blood and fire.”',
            '“*sībila lambēbant linguīs vibrantibus ōra*: this shows alliteration.”',
          ],
          answer: 2,
          explain: 'The Latin, its place, and an accurate English version. The first has no Latin, the second no translation, and the last names a device instead of answering.',
        },
        {
          kind: 'teach',
          title: 'The essay point',
          body: [
            'An essay on a passage is an argument, and each point in it has four parts: **name** what Vergil does, **quote** the Latin with its line numbers, **translate** it, and **explain** how it supports your claim.',
            'The explanation is where the marks are. “This is alliteration” scores nothing. “The hissing *s* and lapping *l* of *sībila lambēbant linguīs* (2.211), ‘they licked their hissing mouths with their tongues’, make us hear the serpents before they strike, so the horror reaches the Trojans through the ear” is an argument.',
          ],
          tip: 'One well-explained point is worth three named devices. Choose the Latin that proves your claim, and say how.',
        },
        {
          kind: 'choice',
          prompt: 'Which sentence makes the strongest essay point that Vergil presents Juno’s anger as permanent?',
          options: [
            '“Juno is angry in lines 25–28 because of many reasons.”',
            '“Vergil uses synchysis in line 4.”',
            '“In *saevae memorem Iūnōnis ob īram* (1.4), ‘because of savage Juno’s unforgetting anger’, Vergil gives the anger itself a memory: *memorem* agrees with *īram*, so the anger, not only the goddess, refuses to forget.”',
            '“Juno remembers the judgment of Paris, which was unfair.”',
          ],
          answer: 2,
          explain: 'It names the effect, quotes and translates, and explains how the grammar (the agreement of *memorem* with *īram*) proves the claim.',
        },
        {
          kind: 'match',
          prompt: 'Match each multiple-choice question to the skill it tests.',
          pairs: [
            ['“The case of Latiō (line 6) is explained by …”', 'grammar in context'],
            ['“In line 12, colōnī refers to …”', 'reference'],
            ['“Lines 16–17 contain an example of …”', 'figures of speech'],
            ['“The metrical pattern of line 1 is …”', 'scansion'],
            ['“The tone of lines 8–11 is best described as …”', 'interpretation'],
          ],
        },
      ],
    },
  ],
};
