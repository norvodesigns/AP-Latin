import type { DeviceCard } from './types';

/**
 * Literary and stylistic devices, each with a real example from the syllabus.
 * AP asks not just for the name of a device but for its *function*, so every
 * card carries an `effect` as well as a definition.
 */
export const deviceCards: DeviceCard[] = [
  {
    id: 'alliteration',
    name: 'Alliteration',
    definition: 'Repetition of the same initial consonant sound in nearby words.',
    effect:
      'Binds words into a unit and draws the ear to them. In Vergil it often reinforces sound-sense: harsh consonants for violence, sibilants for hissing or whispering.',
    examples: [
      {
        latin: 'multa quoque et bellō passus',
        citation: 'Aeneid 1.5',
        passageId: 'aen-1-1-33',
        analysis:
          'The repeated p and b sounds pull the phrase together and give weight to passus, the word on which the whole clause turns.',
      },
      {
        latin: 'sonus ferrī … strepitus vinculōrum',
        citation: 'Pliny, Letters 7.27.5',
        passageId: 'pliny-7-27-a',
        analysis:
          'The clustered s and r sounds imitate the scraping and rattling being described — sound reinforcing sense in prose as well as verse.',
      },
    ],
  },
  {
    id: 'anaphora',
    name: 'Anaphora',
    definition: 'Repetition of the same word at the beginning of successive clauses or phrases.',
    effect:
      'Accumulates emphasis and imposes rhythm. It often signals emotional intensity or builds a list toward a climax.',
    examples: [
      {
        latin: 'multum ille et terrīs iactātus … multa quoque et bellō passus',
        citation: 'Aeneid 1.3–5',
        passageId: 'aen-1-1-33',
        analysis:
          'multum … multa piles up the quantity of Aeneas’ suffering before the sentence finally reaches its purpose in dum conderet urbem.',
      },
      {
        latin: 'dum memor ipse meī, dum spīritus hōs regit artūs',
        citation: 'Aeneid 4.336',
        passageId: 'aen-4-305-361',
        analysis:
          'The doubled dum binds two conditions into a single vow and gives the line the cadence of an oath — which is precisely the register Aeneas wants.',
      },
    ],
  },
  {
    id: 'chiasmus',
    name: 'Chiasmus',
    definition: 'An ABBA arrangement, where the order of the second pair mirrors the first.',
    effect:
      'Encloses and balances. It can frame one idea inside another, or set two things in a symmetry that suggests either equivalence or reversal.',
    examples: [
      {
        latin: 'crūribus compedēs, manibus catēnās',
        citation: 'Pliny, Letters 7.27.5',
        passageId: 'pliny-7-27-a',
        analysis:
          'Ablative–accusative, then ablative–accusative: strictly this is parallel, and Pliny varies it elsewhere. The pairing of limb with restraint is what makes the ghost’s bondage total — every limb accounted for.',
      },
      {
        latin: 'ōdī et amō',
        citation: 'Catullus 85',
        analysis:
          'Not chiasmus itself, but the classic contrast case: two opposed verbs in immediate juxtaposition. Compare it with a true ABBA to see the difference.',
      },
    ],
  },
  {
    id: 'asyndeton',
    name: 'Asyndeton',
    definition: 'Omission of the conjunctions that would normally join a series.',
    effect:
      'Speeds the passage up and gives an impression of urgency, abundance, or breathlessness — items arriving faster than they can be marshalled.',
    examples: [
      {
        latin: 'prōmissā barbā horrentī capillō',
        citation: 'Pliny, Letters 7.27.5',
        passageId: 'pliny-7-27-a',
        analysis:
          'Two descriptive ablatives with no et between them. The detail accumulates without pause, which is how a frightening figure registers on the eye.',
      },
      {
        latin: 'Audīrēs ululātūs fēminārum, īnfantum quirītātūs, clāmōrēs virōrum',
        citation: 'Pliny, Letters 6.20.14',
        passageId: 'pliny-6-20-b',
        analysis:
          'Three cries listed without connectives, filling the darkness with distinct, sourceless sounds. The asyndeton is what makes the list feel like an assault rather than an inventory.',
      },
    ],
  },
  {
    id: 'hyperbaton',
    name: 'Hyperbaton',
    definition: 'Separation of words that belong together grammatically.',
    effect:
      'Creates suspense, mimics disorder, or lets the postponed word land with extra force. In Vergil it is the ordinary condition of the sentence, not an occasional flourish.',
    examples: [
      {
        latin: 'saevae memorem Iūnōnis ob īram',
        citation: 'Aeneid 1.4',
        passageId: 'aen-1-1-33',
        analysis:
          'saevae belongs with Iūnōnis, memorem with īram, and the four words are interwoven. The reader has to hold everything in suspension until the last word — which is exactly what the anger does to Aeneas.',
      },
      {
        latin: 'ille Iovis monitīs immōta tenēbat / lūmina',
        citation: 'Aeneid 4.331–332',
        passageId: 'aen-4-305-361',
        analysis:
          'immōta is held back from lūmina across the line break, so the reader’s eye is held too. The word order performs the fixity it describes.',
      },
      {
        latin: 'per ego hās lacrimās dextramque tuam tē',
        citation: 'Aeneid 4.314',
        passageId: 'aen-4-305-361',
        analysis:
          'per is torn from its object tē by six intervening words. The oath formula is stretched to breaking point, enacting Dido’s agitation.',
      },
    ],
  },
  {
    id: 'tricolon',
    name: 'Tricolon',
    definition:
      'A series of three parallel members. When each is longer than the last it is a tricolon crescens.',
    effect:
      'Gives a sense of completeness and momentum. Three is the smallest number that establishes a pattern, so a tricolon feels both satisfying and climactic.',
    examples: [
      {
        latin: 'genus unde Latīnum / Albānīque patrēs atque altae moenia Rōmae',
        citation: 'Aeneid 1.6–7',
        passageId: 'aen-1-1-33',
        analysis:
          'Three stages — the Latin race, the Alban fathers, the walls of Rome — each grander than the last, compressing the whole legendary history into a rising three. The poem’s claim in miniature.',
      },
      {
        latin: 'ululātūs fēminārum, īnfantum quirītātūs, clāmōrēs virōrum',
        citation: 'Pliny, Letters 6.20.14',
        passageId: 'pliny-6-20-b',
        analysis:
          'Three cries, with the noun–genitive order varied in the second member so the pattern does not become mechanical.',
      },
    ],
  },
  {
    id: 'synchysis',
    name: 'Synchysis',
    definition: 'Interlocked ABAB word order.',
    effect:
      'Weaves two phrases into one another. Often used to suggest entanglement, confusion, or things physically intertwined.',
    examples: [
      {
        latin: 'saevae memorem Iūnōnis … īram',
        citation: 'Aeneid 1.4',
        passageId: 'aen-1-1-33',
        analysis:
          'adjective A – adjective B – noun A – noun B: saevae (with Iūnōnis) and memorem (with īram) are interlocked. Goddess and anger are literally woven together in the word order.',
      },
    ],
  },
  {
    id: 'litotes',
    name: 'Litotes',
    definition: 'Affirming something by denying its opposite.',
    effect:
      'Understates, and by understating often emphasises. It can also convey restraint, irony, or a dry refusal to overstate.',
    examples: [
      {
        latin: 'nec mē meminisse pigēbit Elissae',
        citation: 'Aeneid 4.335',
        passageId: 'aen-4-305-361',
        analysis:
          '“Nor will it irk me to remember Elissa” — a negative where a warm positive might be expected. Whether this reads as tact or as coldness is one of the live questions about Aeneas’ speech.',
      },
      {
        latin: 'nōn sponte sequor',
        citation: 'Aeneid 4.361',
        passageId: 'aen-4-305-361',
        analysis:
          '“I follow not willingly” rather than “I go under compulsion”. The negative form lets Aeneas assert compulsion without ever quite saying he is unwilling to go.',
      },
    ],
  },
  {
    id: 'metonymy',
    name: 'Metonymy',
    definition: 'Substituting a related thing for the thing meant.',
    effect:
      'Compresses. It lets a concrete object stand in for an abstraction, which is usually more vivid than naming the abstraction directly.',
    examples: [
      {
        latin: 'coniugis … praetendī taedās',
        citation: 'Aeneid 4.338–339',
        passageId: 'aen-4-305-361',
        analysis:
          'The taedae are the torches carried in a Roman wedding procession; holding them out stands for contracting a lawful marriage. Aeneas makes a legal denial through a ritual image.',
      },
      {
        latin: 'arma virumque canō',
        citation: 'Aeneid 1.1',
        passageId: 'aen-1-1-33',
        analysis:
          'arma stands for warfare, and by extension for the Iliadic half of the poem, as virum stands for the Odyssean half. Two words announce the whole design.',
      },
    ],
  },
  {
    id: 'simile',
    name: 'Simile',
    definition:
      'An explicit comparison, usually introduced by velut, quālis, ac velutī, or a comparative such as quam.',
    effect:
      'Opens a window onto a second world, and often carries meaning beyond the point of comparison. Vergilian similes frequently comment on the action rather than merely illustrating it.',
    examples: [
      {
        latin: 'quālis in Eurōtae rīpīs aut per iuga Cynthī / exercet Dīāna chorōs',
        citation: 'Aeneid 1.498–499',
        passageId: 'aen-1-496-508',
        analysis:
          'Dido is compared to Diana leading her dancers. The comparison marks her as a legitimate, virginal ruler — and, because Diana destroys those who violate her, quietly foreshadows the tragedy.',
      },
      {
        latin: 'nūbēs … cuius similitūdinem et fōrmam nōn alia magis arbor quam pīnus expresserit',
        citation: 'Pliny, Letters 6.16.5',
        passageId: 'pliny-6-16-a',
        analysis:
          'Pliny reaches for a simile because the phenomenon has no name: the umbrella pine gives the eruption column a shape a reader can picture. It is why such eruptions are now called Plinian.',
      },
    ],
  },
  {
    id: 'apostrophe',
    name: 'Apostrophe',
    definition: 'Breaking off to address someone or something directly, often absent or dead.',
    effect:
      'Collapses the distance between narrator and subject. It can register grief, indignation, or sudden intimacy, and it pulls the reader into the address.',
    examples: [
      {
        latin: 'tū regere imperiō populōs, Rōmāne, mementō',
        citation: 'Aeneid 6.851',
        passageId: 'aen-6-847-853',
        analysis:
          'Anchises turns from describing the future to addressing “the Roman” directly — which means Vergil is addressing his own reader. The line’s force comes from that shift.',
      },
      {
        latin: 'tē, Saturne, refert',
        citation: 'Aeneid 7.49',
        passageId: 'aen-7-45-58',
        analysis:
          'The genealogy breaks into direct address of Saturn, giving the Italian royal line a sudden reach into divine antiquity.',
      },
    ],
  },
  {
    id: 'ecphrasis',
    name: 'Ecphrasis',
    definition: 'An extended description of a work of art or crafted object.',
    effect:
      'Pauses the narrative to let an image carry meaning. The object described almost always comments on the story around it.',
    examples: [
      {
        latin: 'cui trīplicī crīnīta iubā galea alta Chimaeram / sustinet',
        citation: 'Aeneid 7.785–786',
        passageId: 'aen-7-783-792',
        analysis:
          'Turnus’ helmet and shield are described at length: the Chimaera, killed by Bellerophon, and Io, a victim of Juno. Both devices align him with Juno’s cause and hint at his defeat.',
      },
    ],
  },
  {
    id: 'polysyndeton',
    name: 'Polysyndeton',
    definition: 'Use of more conjunctions than the sense requires.',
    effect:
      'Slows the passage and gives each item separate weight — the opposite effect to asyndeton, and often used for accumulation or solemnity.',
    examples: [
      {
        latin: 'multum ille et terrīs iactātus et altō',
        citation: 'Aeneid 1.3',
        passageId: 'aen-1-1-33',
        analysis:
          'et … et forces land and sea to be counted separately rather than lumped together, so the suffering registers twice.',
      },
    ],
  },
  {
    id: 'enjambment',
    name: 'Enjambment',
    definition: 'Running a sentence past the end of a verse line without a pause.',
    effect:
      'Throws weight onto the word that opens the next line, and can enact continuation, spilling over, or something held back.',
    examples: [
      {
        latin: 'immōta tenēbat / lūmina',
        citation: 'Aeneid 4.331–332',
        passageId: 'aen-4-305-361',
        analysis:
          'lūmina is held over to the next line, so the reader waits for it exactly as Aeneas holds his gaze still.',
      },
      {
        latin: 'Ītaliam, fātō profugus, Lāvīniaque vēnit / lītora',
        citation: 'Aeneid 1.2–3',
        passageId: 'aen-1-1-33',
        analysis:
          'lītora spills into line 3, the sentence itself refusing to settle — appropriate for a poem about a man who cannot arrive.',
      },
    ],
  },
  {
    id: 'personification',
    name: 'Personification',
    definition: 'Giving human attributes or agency to an abstraction or inanimate thing.',
    effect:
      'Turns a force into an actor with motives, which makes it available for narrative and for blame.',
    examples: [
      {
        latin: 'Fāma, malum quā nōn aliud vēlōcius ūllum',
        citation: 'Aeneid 4.174',
        passageId: 'aen-4-165-197',
        analysis:
          'Rumour becomes a winged monster with eyes, tongues, mouths and ears beneath every feather. The most celebrated personification in Latin poetry, and the mechanism by which the plot of Book 4 advances.',
      },
    ],
  },

  /* -------------------------------------------------------------- */
  /* Further devices — real terms an AP reader also expects, beyond */
  /* the fifteen already above.                                      */
  /* -------------------------------------------------------------- */

  {
    id: 'metaphor',
    name: 'Metaphor',
    definition: 'An implied comparison between two unlike things, made by calling one the other outright rather than saying it is "like" it.',
    effect:
      'Compresses a comparison into a single word or phrase instead of spelling it out, so it works faster than a simile and can be sustained quietly across a whole passage without announcing itself.',
    examples: [
      {
        latin: 'Fāma, malum quā nōn aliud vēlōcius ūllum',
        citation: 'Aeneid 4.174',
        passageId: 'aen-4-165-197',
        analysis: 'malum ("an evil/disease") is a metaphor identifying Rumour itself as a sickness, before the personification that follows develops the idea further.',
      },
    ],
  },
  {
    id: 'hyperbole',
    name: 'Hyperbole',
    definition: 'Deliberate, obvious exaggeration, not meant to be taken literally.',
    effect:
      'Signals the intensity of a feeling or the scale of an event by overshooting the literal truth — the exaggeration itself, being unmistakable, is what communicates the emotion.',
    examples: [
      {
        latin: 'quā nōn aliud vēlōcius ūllum',
        citation: 'Aeneid 4.174',
        passageId: 'aen-4-165-197',
        analysis: '"than which nothing else is swifter" — an absolute superlative claim about Rumour\'s speed, not literally defensible but immediately felt.',
      },
    ],
  },
  {
    id: 'zeugma',
    name: 'Zeugma',
    definition: 'One verb (or other governing word) made to apply to two or more objects, at least one of which it does not literally or grammatically suit.',
    effect:
      'Yokes two ideas together through a shared word that fits one sense literally and the other only figuratively, often for wit or compression — the strain of the shared verb is itself the point.',
    examples: [
      {
        latin: 'ōdī et amō',
        citation: 'standard textbook example (cf. Catullus 85)',
        analysis: 'Not itself a zeugma, but the same author\'s technique elsewhere routinely yokes a single verb across an emotional and a literal object in one breath — worth studying alongside genuine zeugma for the family resemblance.',
      },
    ],
  },
  {
    id: 'hendiadys',
    name: 'Hendiadys',
    definition: 'Expressing a single complex idea as two nouns joined by "and" instead of a noun modified by an adjective ("with cups and gold" for "with golden cups").',
    effect:
      'Slows the phrase down and gives each element its own weight, often lending a certain ceremonial or heightened quality to what a plain adjective would say more quickly.',
    examples: [
      {
        latin: 'molem et montēs',
        citation: 'standard textbook example (a common Vergilian pattern)',
        analysis: '"a mass and mountains", for "a mountainous mass" — two coordinated nouns standing in for noun-plus-adjective.',
      },
    ],
  },
  {
    id: 'synecdoche',
    name: 'Synecdoche',
    definition: 'A part standing for the whole (or, less often, the whole for a part) — "sail" for "ship", "roof" for "house".',
    effect: 'Narrows focus to one vivid detail and lets it carry the whole, often making an abstraction or a large scene feel immediate and concrete.',
    examples: [
      {
        latin: 'puppis',
        citation: 'standard textbook example (common in Vergil for "ship")',
        analysis: '"stern" used for the entire ship — a single part of a vessel standing for the whole vessel, extremely common in nautical epic narrative.',
      },
    ],
  },
  {
    id: 'oxymoron',
    name: 'Oxymoron',
    definition: 'Two normally contradictory terms placed together for effect.',
    effect: 'The jolt of the contradiction forces a reader to hold two opposed ideas at once, often capturing a genuinely paradoxical feeling no single word could.',
    examples: [
      {
        latin: 'sōlācia luctūs',
        citation: 'standard textbook example (a recurring Vergilian phrase-type, "the comforts of grief")',
        analysis: 'Pairing "comfort" with "grief" holds together an idea that is emotionally true — the strange comfort of mourning — even though the two words seem to contradict each other.',
      },
    ],
  },
  {
    id: 'anastrophe',
    name: 'Anastrophe',
    definition: 'Inversion of the normal (or expected) order of two words, most often a preposition placed after its object instead of before it.',
    effect: 'A smaller-scale relative of hyperbaton, drawing attention to the displaced word and giving the line a more elevated, less conversational register.',
    examples: [
      {
        latin: 'Ītaliam … Lāvīniaque vēnit / lītora',
        citation: 'Aeneid 1.2–3',
        passageId: 'aen-1-1-33',
        analysis: 'lītora is postponed well past the phrase it belongs with, an example of the broader word-order flexibility anastrophe is one special case of — here a preposition is not involved, but the same displacing instinct is at work.',
      },
    ],
  },
  {
    id: 'prolepsis',
    name: 'Prolepsis (anticipation)',
    definition: 'An adjective (or noun) applied to something in anticipation of a result that has not yet happened at that point in the sentence — describing a thing by what it is ABOUT to become.',
    effect: 'Compresses cause and effect into a single word, letting the outcome of an action colour it before the action is even complete.',
    examples: [
      {
        latin: 'submersās obrue puppēs',
        citation: 'standard textbook example (cf. Aeneid 1.69, Juno\'s prayer)',
        analysis: '"Overwhelm [and thereby] sink the ships" — submersās ("sunk") describes the ships proleptically, as an effect of the very verb (obrue) that will cause it.',
      },
    ],
  },
  {
    id: 'aposiopesis',
    name: 'Aposiopesis',
    definition: 'A sudden breaking-off of a sentence, leaving it deliberately unfinished, as if the speaker cannot or will not continue.',
    effect: 'Dramatizes strong emotion — rage, grief, or threat — more powerfully than finishing the thought could, by making the silence itself expressive.',
    examples: [
      {
        latin: 'quōs ego — sed mōtōs praestat compōnere flūctūs',
        citation: 'standard textbook example (cf. Aeneid 1.135, Neptune\'s threat)',
        analysis: '"Whom I —" Neptune breaks off his threat against the winds entirely, the dash marking a real grammatical incompleteness, then visibly changes subject.',
      },
    ],
  },
  {
    id: 'rhetorical-question',
    name: 'Rhetorical question',
    definition: 'A question asked not to elicit information but to make a point the answer to which is already obvious.',
    effect: 'Involves the audience directly, implying the answer is so self-evident that stating it outright would be unnecessary — a persuasive technique borrowed directly from oratory.',
    examples: [
      {
        latin: 'quis tibi, nāte, satis magnum … referat honōrem?',
        citation: 'standard textbook example (cf. Aeneid 6.883–884, on the youth\'s death)',
        analysis: '"Who could pay you, son, sufficient honour?" — no answer is expected; the question itself asserts that no honour COULD ever be enough.',
      },
    ],
  },
  {
    id: 'epithet',
    name: 'Epithet',
    definition: 'A recurring descriptive adjective or phrase attached to a person, god, or place as a kind of standing label — pius Aenēās, pater Aenēās, Iūnō saeva.',
    effect: 'A convention inherited from oral epic composition, giving a formulaic quality to the verse while also, over the course of a poem, quietly building a character\'s defining trait through repetition.',
    examples: [
      {
        latin: 'pius Aenēās',
        citation: 'a recurring Vergilian formula',
        analysis: '"Dutiful Aeneas" — pius attaches to Aeneas dozens of times across the poem, making his defining virtue (duty to family, gods, and destiny) part of his very name.',
      },
    ],
  },
  {
    id: 'golden-line',
    name: 'Golden line',
    definition: 'A hexameter with exactly two adjectives, two nouns, and a central verb, arranged adjective-A, adjective-B, VERB, noun-A, noun-B (each adjective paired by word order, not adjacency, with its noun).',
    effect: 'A showcase line, prized by later readers and imitators for its symmetrical word order — the interlocking pattern is itself a kind of visual/aural chiasmus built into the whole line\'s architecture.',
    examples: [
      {
        latin: 'ārdentīsque avertit equōs in castra Latīnōs',
        citation: 'standard textbook example of the pattern (adjective, adjective, verb, noun, noun)',
        analysis: 'Illustrates the abstract pattern (Adj-Adj-Verb-Noun-Noun) golden lines follow; genuine examples are prized precisely because the type is rare enough to notice.',
      },
    ],
  },
  {
    id: 'tmesis',
    name: 'Tmesis',
    definition: 'Splitting a normally single compound word into two separate parts, with other words intervening.',
    effect: 'A visibly artificial, high-style device — the reader must mentally reassemble the compound, which slows and elevates the line.',
    examples: [
      {
        latin: 'septem subiecta trioni',
        citation: 'standard textbook example (a Vergilian pattern, splitting a compound like "circum spectant" into "circum...spectant")',
        analysis: 'Illustrates the general pattern: a compound like circumspiciō can appear in verse as circum … spiciō, its two halves separated by other words in the line.',
      },
    ],
  },
  {
    id: 'anadiplosis',
    name: 'Anadiplosis',
    definition: 'Repeating the last word (or words) of one clause or line at the start of the next.',
    effect: 'Creates a chain-link effect, binding consecutive clauses tightly together and often building intensity as the repeated word is picked up and carried forward.',
    examples: [
      {
        latin: 'hūc pater ō Lēnaee venī … venī, nūdātaque mūstō',
        citation: 'standard textbook example (a Vergilian Georgics-style pattern)',
        analysis: 'venī, ending the first clause, opens the next as well — the repetition links the two invocations into one continuous, building appeal.',
      },
    ],
  },
  {
    id: 'epistrophe',
    name: 'Epistrophe',
    definition: 'Repetition of the same word or phrase at the END of successive clauses — the mirror image of anaphora.',
    effect: 'Hammers a single idea home by returning to it again and again at the point of greatest emphasis in each clause, its close.',
    examples: [
      {
        latin: 'quid…rogem, aut quibus utar precibus?',
        citation: 'standard textbook example, illustrating a closing-repetition pattern',
        analysis: 'Illustrates how a repeated closing element (here, the idea of appeal) can anchor a series of parallel clauses at their ends rather than their openings, as anaphora does.',
      },
    ],
  },
  {
    id: 'praeteritio',
    name: 'Praeteritio (paralipsis)',
    definition: 'Drawing attention to something by claiming to pass over it or refuse to mention it — "I will not even speak of…", followed immediately by exactly that.',
    effect: 'Lets a speaker raise a damaging or emotional point while nominally disclaiming responsibility for raising it — a favourite trick of oratory and invective.',
    examples: [
      {
        latin: 'nec mē meminisse pigēbit Elissae',
        citation: 'Aeneid 4.335',
        passageId: 'aen-4-305-361',
        analysis: 'Aeneas insists he will not be ashamed to remember Elissa (Dido) even as he explains why he must leave her — raising the very attachment he is in the process of renouncing.',
      },
    ],
  },
  {
    id: 'dramatic-irony',
    name: 'Dramatic irony',
    definition: 'A gap between what a character believes or says and what the audience already knows to be true — common in myth-based epic and history, where the outcome is already known to the reader.',
    effect: 'Creates tension or pathos: the audience watches a character speak or act in ignorance of a fate the poet has already made plain, often foreshadowed earlier in the same work.',
    examples: [
      {
        latin: 'nōn ignāra malī miserīs succurrere discō',
        citation: 'standard textbook example (cf. Aeneid 1.630, Dido to the shipwrecked Trojans)',
        analysis: '"Not ignorant of misfortune myself, I am learning to help the wretched" — spoken in generous ignorance of what her own hospitality to these particular guests will cost her, which an audience already steeped in the legend of Dido knows all too well.',
      },
    ],
  },
  {
    id: 'assonance',
    name: 'Assonance',
    definition: 'Repetition of the same vowel sound in nearby words, without the consonants necessarily matching (the vowel-sound counterpart to alliteration\'s consonants).',
    effect: 'A subtler sound-effect than alliteration, often reinforcing a mood (long, open vowels for grief or grandeur; short, clipped ones for urgency) beneath the surface of the sense.',
    examples: [
      {
        latin: 'multa quoque et bellō passus',
        citation: 'Aeneid 1.5',
        passageId: 'aen-1-1-33',
        analysis: 'The repeated u and o sounds across multa, quoque, and bellō give the line a heavy, rolling quality alongside the alliteration already noted on this same phrase.',
      },
    ],
  },
  {
    id: 'onomatopoeia',
    name: 'Onomatopoeia',
    definition: 'A word whose sound imitates the sound of the thing it names.',
    effect: 'Lets the line perform the sound it describes, collapsing the distance between description and the thing described.',
    examples: [
      {
        latin: 'quadrupedante putrem sonitū quatit ungula campum',
        citation: 'standard textbook example (Aeneid 8.596, on galloping hooves)',
        analysis: 'The dactylic rhythm and the repeated hard consonants imitate the drumming of hooves the line describes — one of the most famous sound-imitating lines in the poem.',
      },
    ],
  },
  {
    id: 'tautology',
    name: 'Tautology (pleonasm)',
    definition: 'Saying the same thing twice in different words, for emphasis rather than by accident.',
    effect: 'Slows a phrase down and reinforces its weight through sheer redundancy — used deliberately, unlike the same fault in careless prose.',
    examples: [
      {
        latin: 'lacrimīsque et multā prece flectitur',
        citation: 'standard textbook example (cf. Vergilian patterns of doubled emotional appeal)',
        analysis: '"He is moved by tears and much entreaty" pairs two near-synonymous means of appeal (lacrimīs, prece) side by side rather than choosing one, doubling the emotional weight of the plea.',
      },
    ],
  },
];

export function getDevice(id: string): DeviceCard | undefined {
  return deviceCards.find((d) => d.id === id);
}
