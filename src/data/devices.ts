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
];

export function getDevice(id: string): DeviceCard | undefined {
  return deviceCards.find((d) => d.id === id);
}
