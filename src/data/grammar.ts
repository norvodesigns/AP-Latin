import type { GrammarTopic } from './types';

/**
 * The constructions AP actually tests, each with examples drawn from the real
 * syllabus passages. Every `citation` points at text that exists in the passage
 * data — nothing here is invented for the sake of an example.
 */
export const grammarTopics: GrammarTopic[] = [
  {
    id: 'ablative-absolute',
    name: 'Ablative absolute',
    category: 'clause',
    summary:
      'A noun (or pronoun) and a participle, both in the ablative, forming a phrase grammatically independent of the rest of the sentence. It sets the circumstances under which the main action happens.',
    recognition: [
      'Two ablatives sitting together, one of them a participle, usually set off by commas.',
      'The noun is NOT the subject or object of the main verb — that is what makes it "absolute".',
      'A form of sum has no participle, so an ablative absolute can be two nouns or a noun and adjective (me duce, "with me as leader").',
    ],
    translation: [
      'Literally: "with X having been Y-ed" — clumsy, but it earns the segment.',
      'Better English: a subordinate clause — "when/since/after/although X was Y-ed".',
      'A present participle is contemporaneous ("while"); a perfect participle is prior ("after").',
    ],
    examples: [
      {
        latin: 'quibus rēbus cognitīs',
        citation: 'common formula',
        analysis:
          'rēbus is ablative, cognitīs is a perfect passive participle agreeing with it: "these things having been learned" → "when this became known". The connecting relative quibus links to the previous sentence and does not affect the construction.',
      },
      {
        latin: 'Vesuvium fuisse posteā cognitum est',
        citation: 'Pliny, Letters 6.16.5',
        passageId: 'pliny-6-16-a',
        analysis:
          'Not an ablative absolute — a useful contrast. Here cognitum est is a genuine passive main verb with an indirect statement (Vesuvium fuisse) as its subject. The lesson: a perfect participle plus a form of sum is a finite passive verb, not an absolute.',
      },
      {
        latin: 'ēlāta in altum quibusdam rāmīs diffundēbātur',
        citation: 'Pliny, Letters 6.16.6',
        passageId: 'pliny-6-16-a',
        analysis:
          'quibusdam rāmīs is ablative but is a means/respect ablative with diffundēbātur ("was spreading out into certain branches"), not an absolute — there is no participle agreeing with rāmīs. Deciding this correctly is exactly the kind of judgement AP tests.',
      },
    ],
  },
  {
    id: 'indirect-statement',
    name: 'Indirect statement',
    category: 'clause',
    summary:
      'After a verb of saying, thinking, knowing, perceiving or showing, the reported clause becomes an accusative subject plus an infinitive. It is the highest-frequency construction in Pliny.',
    recognition: [
      'A "head verb" of speech or perception: dico, puto, scio, video, audio, indico, spero, nego.',
      'An accusative that is not the object of anything, plus an infinitive.',
      'The infinitive tense is relative to the head verb: present = same time, perfect = earlier, future = later.',
    ],
    translation: [
      'Supply "that": "he says THAT the cloud is appearing".',
      'Present infinitive after a past head verb becomes English past: indicat … appārēre = "pointed out that it was appearing".',
      'Perfect infinitive after a past head verb becomes English pluperfect: "that it had been".',
    ],
    examples: [
      {
        latin: 'mater mea indicat eī appārēre nūbem',
        citation: 'Pliny, Letters 6.16.4',
        passageId: 'pliny-6-16-a',
        analysis:
          'indicat is the head verb, nūbem the accusative subject, appārēre the present infinitive: "my mother points out to him that a cloud was appearing." Reading nūbem as the direct object of indicat leaves appārēre with no function.',
      },
      {
        latin: 'ego tē … numquam … negābō prōmeritam',
        citation: 'Aeneid 4.333–335',
        passageId: 'aen-4-305-361',
        analysis:
          'tē is the accusative subject and prōmeritam the perfect participle with esse understood: "I shall never deny that you have deserved well." The whole indirect statement hangs on a participle with its infinitive omitted — a very Vergilian compression.',
      },
      {
        latin: 'neque ego hanc abscondere furtō spērāvī … fugam',
        citation: 'Aeneid 4.337–338',
        passageId: 'aen-4-305-361',
        analysis:
          'spērō here takes a simple complementary infinitive with the same subject, so there is no accusative subject: "nor did I hope to conceal this flight". Distinguishing this from a full indirect statement is a common exam question.',
      },
    ],
  },
  {
    id: 'purpose-result',
    name: 'Purpose and result clauses',
    category: 'clause',
    summary:
      'Both use ut (or nē / ut nōn) with the subjunctive. Purpose gives the goal of the action; result gives what actually followed from it. Telling them apart is a standard AP task.',
    recognition: [
      'Purpose: ut + subjunctive, negative nē. No signpost in the main clause.',
      'Result: ut + subjunctive, negative ut nōn. The main clause usually carries a signpost — tam, ita, sīc, tantus, tālis, adeō.',
      'Purpose can also be expressed by ad + gerundive, causā/grātiā + gerundive, or a relative clause of purpose (quī + subjunctive).',
    ],
    translation: [
      'Purpose: "in order that / so that … may (past: might)", or simply "to …".',
      'Result: "with the result that / so that … actually did".',
      'Result clauses can have a perfect subjunctive to stress that the result really happened.',
    ],
    examples: [
      {
        latin: 'ut aquam habeant',
        citation: 'Pliny, Letters 10.37',
        passageId: 'pliny-10-37',
        analysis:
          'Purpose: the money is to be spent so that the people of Nicomedia may have water. There is no tam or ita in the main clause, and the sense is a goal, not a consequence.',
      },
      {
        latin: 'ut … dēscendere in lītus … statuērent',
        citation: 'Pliny, Letters 6.16.17',
        passageId: 'pliny-6-16-b',
        analysis:
          'A substantive clause after a verb of deciding — closely related to purpose in form, and translated with "to". AP will accept a description of it as an indirect command or a noun clause of purpose.',
      },
      {
        latin: 'dum conderet urbem',
        citation: 'Aeneid 1.5',
        passageId: 'aen-1-1-33',
        analysis:
          'Not ut, but doing purpose-like work: dum with the subjunctive expresses anticipation, "until he might found a city". With the indicative dum would be plain contemporaneous time.',
      },
    ],
  },
  {
    id: 'cum-clauses',
    name: 'cum clauses',
    category: 'clause',
    summary:
      'cum with the indicative marks pure time. cum with the subjunctive is circumstantial ("when, in these circumstances"), causal ("since"), or concessive ("although").',
    recognition: [
      'cum + indicative: temporal, often with a marker like tum in the main clause.',
      'cum + imperfect or pluperfect subjunctive: usually circumstantial or causal in past narrative.',
      'Concessive cum is often confirmed by tamen in the main clause.',
    ],
    translation: [
      'Indicative: "when".',
      'Circumstantial: "when" — but the subjunctive signals the clause sets the scene rather than dating it.',
      'Causal: "since, because". Concessive: "although".',
    ],
    examples: [
      {
        latin: 'statimque timēbō cum lēgerō',
        citation: 'Pliny, Letters 6.4.5',
        passageId: 'pliny-6-4',
        analysis:
          'cum with the future perfect indicative, purely temporal: "and I shall begin to fear again as soon as I have read". The indicative dates the action rather than colouring it, and the future perfect makes the reading prior to the fearing.',
      },
      {
        latin: 'cum apparuit … balteus',
        citation: 'Aeneid 12.941–942',
        passageId: 'aen-12-919-952',
        analysis:
          'Inverse cum with the perfect indicative: the cum clause carries the decisive event, not the background. English needs "when suddenly the baldric appeared", because the main clause is what is being interrupted.',
      },
    ],
  },
  {
    id: 'gerund-gerundive',
    name: 'Gerund and gerundive',
    category: 'verbal',
    summary:
      'The gerund is a verbal noun (-ndum, "the act of X-ing"); the gerundive is a verbal adjective (-ndus, -a, -um) agreeing with a noun. They look alike and are told apart by agreement.',
    recognition: [
      'Gerund: neuter singular only, never agrees with anything, may take an object.',
      'Gerundive: agrees in case, number and gender with a noun.',
      'A gerundive with a form of sum expresses obligation (the passive periphrastic): the person obliged goes in the dative.',
    ],
    translation: [
      'Gerund: "-ing" as a noun — "by speaking", "of ruling".',
      'Gerundive with a noun: usually turn it into a gerund plus object in English.',
      'Passive periphrastic: "must be X-ed"; with a dative, "X must be done BY someone".',
    ],
    examples: [
      {
        latin: 'fandō ēnumerāre valēs',
        citation: 'Aeneid 4.333–334',
        passageId: 'aen-4-305-361',
        analysis:
          'fandō is an ablative gerund of the deponent for, fārī: "in speaking, by speaking". It has no noun to agree with, which is what identifies it as a gerund rather than a gerundive.',
      },
      {
        latin: 'iubet Liburnicam aptārī',
        citation: 'Pliny, Letters 6.16.7',
        passageId: 'pliny-6-16-a',
        analysis:
          'Not a gerundive: aptārī is a present passive infinitive after iubeō. Distinguishing an infinitive in -ārī from a gerundive in -andus is a routine form-identification question.',
      },
    ],
  },
  {
    id: 'subjunctive-uses',
    name: 'Uses of the subjunctive',
    category: 'mood',
    summary:
      'The subjunctive has no single meaning: it is identified by the construction it sits in. Learn the list, then identify by context.',
    recognition: [
      'In subordinate clauses: purpose, result, indirect question, indirect command, cum-circumstantial/causal/concessive, characteristic relative, fear clauses, anticipatory dum/antequam.',
      'In main clauses: jussive/hortatory ("let us"), deliberative ("what am I to do?"), optative ("may it be"), potential ("one would say").',
      'Generalising second person: "if you were to listen" with no unreality implied.',
    ],
    translation: [
      'Do NOT reach for "might/would" automatically — most subordinate subjunctives are translated as ordinary indicatives in English.',
      'Name the construction before you translate; the construction dictates the English.',
    ],
    examples: [
      {
        latin: 'sī attenderēs ācrius',
        citation: 'Pliny, Letters 7.27.5',
        passageId: 'pliny-7-27-a',
        analysis:
          'Generalising second person, not contrary to fact: "if you listened more closely" — anyone who listened did hear it. Treating it as unreal reverses the sense of the ghost story.',
      },
      {
        latin: 'quid virtūs et quid possit',
        citation: 'indirect question pattern',
        analysis:
          'Indirect question: an interrogative word plus the subjunctive, after a verb of asking, knowing or perceiving. English keeps the ordinary indicative: "what courage can do".',
      },
      {
        latin: 'dum conderet urbem',
        citation: 'Aeneid 1.5',
        passageId: 'aen-1-1-33',
        analysis:
          'Anticipatory dum: the subjunctive marks purpose or expectation, "until he might found". This is the single most-tested subjunctive in the proem.',
      },
    ],
  },
  {
    id: 'participles',
    name: 'Participles',
    category: 'participle',
    summary:
      'Latin has four participles: present active (-ns), perfect passive (-tus), future active (-ūrus) and future passive/gerundive (-ndus). Deponent verbs give an active meaning to the perfect participle.',
    recognition: [
      'Present active: -ns, -ntis. Contemporaneous with the main verb.',
      'Perfect passive: fourth principal part. Prior to the main verb.',
      'Deponent perfect participle is ACTIVE in meaning: ūsus = "having used", passus = "having suffered".',
    ],
    translation: [
      'A participle can usually be unpacked into a relative or adverbial clause: "who was X-ing", "when he had been X-ed".',
      'Never turn a participle into a main verb in a literal translation — that loses the segment.',
    ],
    examples: [
      {
        latin: 'multum ille et terrīs iactātus et altō',
        citation: 'Aeneid 1.3',
        passageId: 'aen-1-1-33',
        analysis:
          'iactātus is a perfect passive participle agreeing with ille, not a finite verb: "he, much buffeted". The whole of 1.3–5 hangs on participles, which is why the sentence runs so long.',
      },
      {
        latin: 'multa quoque et bellō passus',
        citation: 'Aeneid 1.5',
        passageId: 'aen-1-1-33',
        analysis:
          'passus is deponent, so active in meaning with multa as its object: "having suffered many things also in war". Translating it passively is the classic deponent error.',
      },
      {
        latin: 'ūsus ille sōle, mox frīgidā',
        citation: 'Pliny, Letters 6.16.5',
        passageId: 'pliny-6-16-a',
        analysis:
          'ūsus is the deponent perfect participle of ūtor, governing the ablative: "having taken a sunbath, then a cold bath". Both the deponent sense and the ablative with ūtor are testable points.',
      },
      {
        latin: 'senex maciē et squālōre cōnfectus',
        citation: 'Pliny, Letters 7.27.5',
        passageId: 'pliny-7-27-a',
        analysis:
          'cōnfectus is a genuine perfect PASSIVE participle in apposition to senex, with two ablatives of means: "an old man worn out by emaciation and squalor".',
      },
    ],
  },
  {
    id: 'conditions',
    name: 'Conditions',
    category: 'mood',
    summary:
      'Three families: simple/factual (indicative), future-less-vivid (present subjunctive, "should…would"), and contrary to fact (imperfect subjunctive for present, pluperfect for past).',
    recognition: [
      'Indicative in both halves: simple fact, whatever the tense.',
      'Present subjunctive in both: future less vivid.',
      'Imperfect subjunctive in both: present contrary to fact. Pluperfect in both: past contrary to fact.',
    ],
    translation: [
      'Present contrary to fact: "if he were … he would".',
      'Past contrary to fact: "if he had … he would have".',
      'Do not read every subjunctive condition as unreal — a generalising second person looks identical in form.',
    ],
    examples: [
      {
        latin: 'sī mēns nōn laeva fuisset',
        citation: 'Aeneid 2.54',
        passageId: 'aen-2-40-56',
        analysis:
          'Past contrary to fact with the pluperfect subjunctive: "if our minds had not been perverse" — and they were, so Troy fell. The apodosis (impulerat) is indicative, a vivid poetic variation on the expected pluperfect subjunctive.',
      },
      {
        latin: 'sī attenderēs ācrius',
        citation: 'Pliny, Letters 7.27.5',
        passageId: 'pliny-7-27-a',
        analysis:
          'Same imperfect-subjunctive form, different construction: this is a generalising "if you listened", not a contrary-to-fact "if you were listening". Context, not form, decides.',
      },
    ],
  },
  {
    id: 'dative-uses',
    name: 'Uses of the dative',
    category: 'case',
    summary:
      'Indirect object, possession, reference/advantage, agent with the passive periphrastic, purpose (double dative), and the dative with special verbs and compounds.',
    recognition: [
      'Special verbs taking the dative: parco, credo, faveo, noceo, persuadeo, impero, servio, studeo, placeo.',
      'Compound verbs in ad-, in-, prae-, sub-, ob- often take a dative.',
      'Dative of possession: a dative with a form of sum — "there is to me" = "I have".',
    ],
    translation: [
      'Indirect object: "to / for".',
      'Possession: turn it round — hae tibi erunt artēs = "these will be YOUR arts".',
      'With special verbs, English usually takes a direct object: parcere subiectīs = "to spare the conquered".',
    ],
    examples: [
      {
        latin: 'parcere subiectīs',
        citation: 'Aeneid 6.853',
        passageId: 'aen-6-847-853',
        analysis:
          'parcō governs the dative, so subiectīs is dative plural even though English makes "the conquered" a direct object. Contrast superbōs in the same line, which is accusative after dēbellāre.',
      },
      {
        latin: 'hae tibi erunt artēs',
        citation: 'Aeneid 6.852',
        passageId: 'aen-6-847-853',
        analysis:
          'Dative of possession with erunt: literally "these will be arts for you", idiomatically "these will be your arts".',
      },
      {
        latin: 'pācīque impōnere mōrem',
        citation: 'Aeneid 6.852',
        passageId: 'aen-6-847-853',
        analysis:
          'pācī is dative with the compound verb impōnere: "to impose the custom UPON peace". Reversing the two nouns is a common error.',
      },
    ],
  },
  {
    id: 'ablative-uses',
    name: 'Uses of the ablative',
    category: 'case',
    summary:
      'Means/instrument, manner, agent (ā/ab + person), cause, respect, description, comparison, separation, place where and time when, plus the ablative with certain verbs and the ablative absolute.',
    recognition: [
      'Means: no preposition, a thing. Agent: ā/ab, a person.',
      'Verbs taking the ablative: ūtor, fruor, fungor, potior, vēscor.',
      'Ablative of description: a noun plus adjective describing a quality — promissā barbā, "with a long beard".',
    ],
    translation: [
      'Means: "by, with". Manner: "with" (usually with cum unless an adjective is present).',
      'Respect: "in respect of, in" — inūsitātā magnitūdine, "unusual IN size".',
      'Never render an ablative of means as an agent: it is "by the violence", not "by the gods" directly.',
    ],
    examples: [
      {
        latin: 'vī superum',
        citation: 'Aeneid 1.4',
        passageId: 'aen-1-1-33',
        analysis:
          'Ablative of means or cause with a syncopated genitive plural: "by the violence of the gods above". Note it is NOT an ablative of agent — there is no ā/ab, and vīs is a thing.',
      },
      {
        latin: 'inūsitātā et magnitūdine et speciē',
        citation: 'Pliny, Letters 6.16.4',
        passageId: 'pliny-6-16-a',
        analysis:
          'Two ablatives of respect joined by et … et, with inūsitātā agreeing across both: "unusual both in size and in appearance".',
      },
      {
        latin: 'promissā barbā horrentī capillō',
        citation: 'Pliny, Letters 7.27.5',
        passageId: 'pliny-7-27-a',
        analysis:
          'Two ablatives of description, asyndetically joined: "with a flowing beard, with bristling hair". They describe the ghost, they are not absolutes — there is no separate subject for a participle to agree with.',
      },
      {
        latin: 'ūsus ille sōle',
        citation: 'Pliny, Letters 6.16.5',
        passageId: 'pliny-6-16-a',
        analysis:
          'sōle is ablative because ūtor takes the ablative, not because it is a means. AP will ask for the reason, so name the verb.',
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* Foundational morphology — the paradigms a course covers before AP.  */
  /* Most examples below are standard textbook paradigms, not claimed as */
  /* quotations from a specific passage, and so carry no passageId; where */
  /* a form is quoted from the actual syllabus text, the citation is      */
  /* checked the same way every other example in this file is.           */
  /* ------------------------------------------------------------------ */

  {
    id: 'first-declension',
    name: 'First declension',
    category: 'morphology',
    level: 'foundational',
    summary:
      'Nouns whose stem ends in -a, almost all feminine (a handful of occupations and river/place names are masculine, e.g. nauta, agricola, poeta, Aenēās).',
    recognition: [
      'Singular: -a, -ae, -ae, -am, -ā, (-a). Plural: -ae, -ārum, -īs, -ās, -īs, (-ae).',
      'Genitive singular and nominative plural are identical in spelling (-ae) — context or a modifying adjective disambiguates.',
      '-ābus instead of -īs in the dative/ablative plural survives only in a few nouns that would otherwise collide with a 2nd-declension masculine (deābus, fīliābus).',
    ],
    translation: [
      'Nominative: subject or predicate noun. Genitive: "of ___" (possession, or partitive after a quantity word).',
      'Dative: indirect object, "to/for ___". Accusative: direct object, or place-to-which with a bare name of a small island/city.',
      'Ablative: usually needs a preposition in prose (in, cum, ā/ab) unless it is functioning as means, manner, or time-when.',
    ],
    examples: [
      {
        latin: 'Trōiae quī prīmus ab ōrīs',
        citation: 'Aeneid 1.1',
        passageId: 'aen-1-1-33',
        analysis:
          'Trōiae is 1st declension: here genitive singular, "of Troy", modifying the unstated antecedent implied before quī ("[he] who [came] first from the shores of Troy").',
      },
      {
        latin: 'rosa, rosae, rosae, rosam, rosā',
        citation: 'standard paradigm',
        analysis: 'The textbook model noun, "rose" — every regular 1st-declension noun follows this pattern exactly.',
      },
    ],
  },
  {
    id: 'second-declension',
    name: 'Second declension',
    category: 'morphology',
    level: 'foundational',
    summary:
      'Nouns whose stem ends in -o: masculine in -us (or -er, -ir), neuter in -um. The single largest source of irregular-looking nominatives in beginning Latin, because the nominative singular often drops or alters the stem vowel.',
    recognition: [
      'Masculine -us: -us, -ī, -ō, -um, -ō / -ī, -ōrum, -īs, -ōs, -īs. Vocative singular is -e (fīlī is the one common exception, from fīlius).',
      'Masculine -er: puer keeps the -er throughout (puerī); ager, magister, liber drop the -e- outside the nominative (agrī, magistrī, librī) — the genitive singular tells you which pattern a new -er noun follows.',
      'Neuter -um: nominative and accusative are always identical, singular -um and plural -a — never -ī or -ōs.',
    ],
    translation: [
      'Functions match the 1st declension exactly — the difference is spelling, not syntax.',
      'A neuter plural subject regularly takes a singular verb in Greek-influenced poetic style, but standard classical prose treats it as a normal plural.',
      'Locative survives productively only in a few 2nd-declension place names: Rōmae ("at Rome"), humī ("on the ground"), a fossil of the old -ī ending.',
    ],
    examples: [
      {
        latin: 'arma virumque canō',
        citation: 'Aeneid 1.1',
        passageId: 'aen-1-1-33',
        analysis:
          'arma is neuter plural (2nd declension -um nouns exist mostly in the plural for this word, "arms/weapons"); virum is masculine accusative singular, "the man" — direct objects of canō, "I sing".',
      },
      {
        latin: 'dominus, dominī, dominō, dominum, dominō',
        citation: 'standard paradigm',
        analysis: '"Master, lord" — the model masculine -us noun; bellum, bellī, bellō, bellum, bellō is the model neuter.',
      },
    ],
  },
  {
    id: 'third-declension-nouns',
    name: 'Third declension nouns',
    category: 'morphology',
    level: 'foundational',
    summary:
      'The largest and least predictable declension: masculine, feminine, and neuter nouns of every stem shape, unified only by genitive singular -is. The nominative singular must simply be memorised with the genitive, since it hides the real stem far more often than not.',
    recognition: [
      'Genitive singular -is is the one constant across every gender. Consonant-stem endings: -is/-ēs (m./f.) or nothing distinctive (n.); i-stems add -ium in the genitive plural instead of -um, and neuter i-stems end in -e/-al/-ar in the nominative singular.',
      'A "hidden" stem change between nominative and genitive is common and must be learned per word: corpus, corporis; homō, hominis; rēx, rēgis; pater, patris.',
      'Neuter nominative and accusative are always identical in both numbers, exactly as in the 2nd declension.',
    ],
    translation: [
      'Functions are identical to the 1st and 2nd declensions — only the endings differ.',
      'An i-stem ablative singular in -ī rather than -e survives in a handful of common nouns (turris, secūris) and in most neuter i-stems (marī, not mare as an ablative form would suggest).',
      'Because the nominative gives so little information, always look up an unfamiliar 3rd-declension noun by its genitive stem, not its nominative spelling.',
    ],
    examples: [
      {
        latin: 'rēx, rēgis (m.) — homō, hominis (m.) — corpus, corporis (n.) — turris, turris (f.)',
        citation: 'standard paradigms',
        analysis:
          'Four representative patterns: a stem consonant shift (rēx/rēg-), a hidden nasal (homō/homin-), rhotacism (corpus/corpor-), and a feminine i-stem with genitive plural in -ium.',
      },
      {
        latin: 'saevae memorem Iūnōnis',
        citation: 'Aeneid 1.4',
        passageId: 'aen-1-1-33',
        analysis:
          'Iūnōnis is 3rd declension (Iūnō, Iūnōnis, f.) genitive singular, with the same hidden -n- stem seen in homō/hominis above; memorem is the one-termination 3rd-declension adjective agreeing with the accusative īram later in the same line, not with Iūnōnis.',
      },
    ],
  },
  {
    id: 'fourth-fifth-declension',
    name: 'Fourth and fifth declensions',
    category: 'morphology',
    level: 'foundational',
    summary:
      'Two small, closed declensions: the 4th (u-stem), mostly masculine nouns in -us built from a verb\'s fourth principal part (adventus, cāsus, exercitus, manus is the common feminine exception); the 5th (ē-stem), only rēs and diēs in everyday use.',
    recognition: [
      '4th declension: -us, -ūs, -uī, -um, -ū (plural -ūs, -uum, -ibus, -ūs, -ibus). Genitive singular -ūs is easy to mistake for a nominative at a glance.',
      '5th declension: -ēs, -eī, -eī, -em, -ē (plural rare except for rēs and diēs). diēs is masculine except when it means a fixed/appointed day, then feminine.',
      'domus mixes 2nd- and 4th-declension endings unpredictably (genitive domūs or domī, locative domī, accusative plural domōs or domūs) — it must simply be memorised as irregular.',
    ],
    translation: [
      'Functions match every other declension; only the spelling differs.',
      'rēs is the single most overworked noun in Latin — "thing, matter, business, property, situation, fact" — and is often best rendered by dropping it and translating its adjective/genitive alone (rēs novae, "revolution", literally "new things").',
      'diē in the ablative regularly means simply "on [that] day" without a preposition, the ordinary ablative of time when.',
    ],
    examples: [
      {
        latin: 'adventus, adventūs (m.) — rēs, reī (f.) — diēs, diēī (m./f.)',
        citation: 'standard paradigms',
        analysis: '"Arrival", "thing", and "day" — the three most common nouns of these two declensions.',
      },
    ],
  },
  {
    id: 'adjectives-1st-2nd',
    name: 'First/second-declension adjectives',
    category: 'morphology',
    level: 'foundational',
    summary:
      'Adjectives declined like 1st-declension nouns in the feminine and 2nd-declension nouns in the masculine and neuter — bonus, bona, bonum being the textbook model.',
    recognition: [
      'Given in the dictionary as three forms (bonus, -a, -um) or, for an -er adjective, as masculine plus feminine (pulcher, pulchra, pulchrum; miser, misera, miserum keeps the -e-).',
      'Agreement is in gender, number, and case with the noun it modifies — NOT in declension: a 1st/2nd-declension adjective can and constantly does modify a 3rd-declension noun (rēx bonus, "a good king").',
      'The nine "pronominal" adjectives (ūnus, sōlus, tōtus, ūllus, nūllus, alius, alter, uter, neuter) follow this pattern everywhere except the genitive singular (-īus for all genders) and dative singular (-ī for all genders).',
    ],
    translation: [
      'Ordinary attributive position in English precedes the noun ("a good king"); Latin word order is far freer and carries no such rule.',
      'An adjective used with no noun expressed is substantive: bonī, "good men"; bona, "good things" (neuter plural is an extremely common way to say "things").',
      'A predicate adjective after sum agrees with the subject but is not translated "of": rēx bonus est, "the king is good," not "of a good king".',
    ],
    examples: [
      {
        latin: 'pius Aenēās',
        citation: 'common Vergilian epithet',
        analysis: 'pius, -a, -um, "dutiful" — a 1st/2nd-declension adjective in the nominative masculine singular, agreeing with Aenēās.',
      },
      {
        latin: 'bonus, bona, bonum',
        citation: 'standard paradigm',
        analysis: 'Declines exactly like dominus/rosa/bellum in every case and number — there is no separate adjective paradigm to learn beyond the noun endings already known.',
      },
    ],
  },
  {
    id: 'adjectives-3rd',
    name: 'Third-declension adjectives',
    category: 'morphology',
    level: 'foundational',
    summary:
      'Adjectives declined entirely on 3rd-declension i-stem endings, sorted by how many distinct nominative singular spellings they show across the three genders: three-termination (ācer, ācris, ācre), two-termination (fortis, forte), and one-termination (fēlīx, gen. fēlīcis, one spelling for all three genders).',
    recognition: [
      'All three types share the same oblique-case endings: -is/-e or -em (m./f./n. accusative), -ī (abl. sing., an i-stem feature adjectives keep even where a matching noun would not), -ium (gen. pl.), -ia (neut. nom./acc. pl.).',
      'One-termination adjectives are the trickiest to spot as adjectives at all, since the nominative singular looks like an ordinary 3rd-declension noun (ingēns, potēns, fēlīx) — the genitive in the dictionary entry is the tell.',
      'A present active participle (amāns, -antis) declines exactly like a one-termination 3rd-declension adjective.',
    ],
    translation: [
      'Functions and agreement rules are identical to 1st/2nd-declension adjectives.',
      'Several very common 3rd-declension adjectives are irregular in the neuter nominative/accusative singular only: an -ns participle keeps -ns, but ingēns/potēns etc. also keep the -s spelling for neuter (a rare case with no separate neuter form at all).',
      'omnis, omne ("every, all") and the comparative degree of every adjective (see comparison) are two-termination.',
    ],
    examples: [
      {
        latin: 'vī superum saevae memorem Iūnōnis ob īram',
        citation: 'Aeneid 1.4',
        passageId: 'aen-1-1-33',
        analysis:
          'memorem is a 3rd-declension one-termination adjective (memor, gen. memoris, "mindful, unforgetting") modifying īram, feminine accusative singular. saevae is 1st/2nd declension (saevus, -a, -um) modifying Iūnōnis.',
      },
    ],
  },
  {
    id: 'adjective-comparison',
    name: 'Comparison of adjectives',
    category: 'morphology',
    level: 'foundational',
    summary:
      'Positive, comparative, and superlative degree. The comparative is always 3rd declension regardless of the positive\'s declension; the superlative is always 1st/2nd declension.',
    recognition: [
      'Comparative: stem + -ior (m./f.), -ius (n.) — altior, altius, "taller". Declines like a 3rd-declension two-termination adjective, but with genitive -ōris, not an i-stem (no -ium, no -ī ablative singular).',
      'Superlative: stem + -issimus, -a, -um for most adjectives (altissimus). Adjectives ending in -er double the -r instead (pulcherrimus, not pulcherissimus); six adjectives in -ilis (facilis, difficilis, similis, dissimilis, gracilis, humilis) take -illimus.',
      'A handful of very common adjectives are irregular all three ways and must be memorised outright: bonus/melior/optimus, malus/peior/pessimus, magnus/maior/maximus, parvus/minor/minimus, multus/plūs/plūrimus.',
    ],
    translation: [
      'Comparative alone: "more ___" or "___-er", or, with quam, "more ___ than". Without an explicit standard of comparison, it can also mean "rather/too ___".',
      'Superlative alone: "most ___" or "___-est"; with quam + a superlative, "as ___ as possible" (quam celerrimē, "as quickly as possible").',
      'The ablative of comparison (no quam, just the ablative) means the same as quam + nominative/accusative: Cicerō est doctior Catōne = doctior quam Catō, "more learned than Cato".',
    ],
    examples: [
      {
        latin: 'altior, altius (comparative) — altissimus, -a, -um (superlative)',
        citation: 'standard paradigm',
        analysis: 'From altus, -a, -um, "high, deep" — a fully regular 1st/2nd-declension adjective forming its degrees the ordinary way.',
      },
    ],
  },
  {
    id: 'first-conjugation',
    name: 'First conjugation',
    category: 'morphology',
    level: 'foundational',
    summary:
      'Verbs whose stem ends in -ā-, principal parts amō, amāre, amāvī, amātum — the most regular and populous conjugation, and the default pattern most new verbs coined in Latin (and named after Latin) still follow.',
    recognition: [
      'Present stem amā- runs through the present, imperfect, and future active and passive indicative, and the present subjunctive (with the thematic ā replaced by an -e-: amem, amēs…).',
      'Perfect stem amāv- (present stem + -v-) runs through the perfect, pluperfect, and future perfect active, and the perfect subjunctive/pluperfect subjunctive.',
      'Present passive infinitive amārī looks superficially like a genitive noun in -ārī but is unmistakable once a verb\'s meaning is known.',
    ],
    translation: [
      'Present: "loves / does love / is loving". Imperfect: "was loving / used to love / kept loving" — always ongoing or repeated past action.',
      'Future -bō/-bis/-bit… Perfect: "loved / has loved" (a completed, one-time past action, contrast with the imperfect).',
      'Passive voice reverses subject and agent: amātur, "he/she/it is loved"; amābātur, "was being loved".',
    ],
    examples: [
      {
        latin: 'amō, amās, amat, amāmus, amātis, amant',
        citation: 'standard paradigm, present active indicative',
        analysis: 'The model verb for the entire conjugation — every regular 1st-conjugation verb inflects exactly this way in every tense.',
      },
      {
        latin: 'multa quoque et bellō passus',
        citation: 'Aeneid 1.5',
        passageId: 'aen-1-1-33',
        analysis: 'Not itself 1st conjugation (passus is from patior, a deponent), but bellō here shows the 2nd-declension noun this construction depends on — worth contrasting with a true 1st-conjugation form in the same line\'s vocabulary.',
      },
    ],
  },
  {
    id: 'second-conjugation',
    name: 'Second conjugation',
    category: 'morphology',
    level: 'foundational',
    summary:
      'Verbs whose stem ends in -ē-, principal parts moneō, monēre, monuī, monitum. The long ē of the infinitive and present-stem forms is the conjugation\'s signature, though it does not show up in unmacronized text.',
    recognition: [
      'Present stem monē- behaves exactly like 1st-conjugation amā- in where it is used, just with -ē- instead of -ā-.',
      'Perfect stems are far less predictable than the 1st conjugation\'s uniform -v-: -uī (monuī), -ēvī (dēlēvī), -sī (mānsī), or a stem change (videō → vīdī) are all common.',
      'The present passive infinitive monērī and the present active infinitive monēre differ only by that final vowel plus -rī vs -re — an easy pair to confuse under time pressure.',
    ],
    translation: [
      'Tense and voice meanings are identical to the 1st conjugation; only the vowel and (often) the perfect stem differ.',
      'A handful of extremely common 2nd-conjugation verbs are highly irregular in the perfect and must be learned individually: videō/vīdī, maneō/mānsī, respondeō/respondī.',
    ],
    examples: [
      {
        latin: 'moneō, monēre, monuī, monitum',
        citation: 'standard paradigm',
        analysis: '"To warn, advise" — the model 2nd-conjugation verb.',
      },
      {
        latin: 'ipse ego … videō',
        citation: 'common construction',
        analysis: 'videō, "I see" — 2nd conjugation with an irregular perfect vīdī, contrasted with the regular pattern above.',
      },
    ],
  },
  {
    id: 'third-conjugation',
    name: 'Third conjugation (including -iō verbs)',
    category: 'morphology',
    level: 'foundational',
    summary:
      'The largest and most irregular-feeling conjugation: a bare consonant or short-vowel stem, principal parts regō, regere, rēxī, rēctum, with a thematic vowel (e, i, or u) that shifts by ending rather than staying fixed the way the 1st and 2nd conjugations\' vowel does. A subgroup, the "-iō verbs" (capiō, faciō, iaciō, fugiō, cupiō and their compounds), inflects like the 4th conjugation everywhere except the infinitive and a few present-stem forms, where it drops back to the plain 3rd-conjugation pattern.',
    recognition: [
      'Infinitive -ere with a SHORT e (regere) distinguishes 3rd conjugation from 2nd conjugation\'s -ēre with a long ē (monēre) — invisible without macrons, which is exactly why the perfect stem and meaning matter more in practice than the infinitive spelling alone.',
      'Present indicative active: regō, regis, regit, regimus, regitis, regunt — note the vowel change from -i- to -u- in the 3rd-person plural, unlike any other conjugation.',
      '-iō verbs keep the -i- one syllable longer than plain 3rd conjugation: capiō, capis, capit, capimus, capitis, capiunt (compare regō above) — but their infinitive is still capere, not capīre.',
    ],
    translation: [
      'Tense and voice meanings match every other conjugation exactly; only the stem-vowel pattern differs.',
      'Perfect stems are unpredictable and must be memorised per verb: rēxī, dūxī, mīsī, tulī are all 3rd-conjugation perfects with no shared pattern.',
      'The present passive infinitive is -ī, not -irī: regī ("to be ruled"), not regīrī — a common error to watch for.',
    ],
    examples: [
      {
        latin: 'regō, regere, rēxī, rēctum — capiō, capere, cēpī, captum',
        citation: 'standard paradigms',
        analysis: 'regō, "to rule", shows the plain pattern; capiō, "to take, seize", shows the -iō subgroup — note the shared -ere infinitive despite the different present-tense vowel pattern.',
      },
    ],
  },
  {
    id: 'fourth-conjugation',
    name: 'Fourth conjugation',
    category: 'morphology',
    level: 'foundational',
    summary:
      'Verbs whose stem ends in -ī-, principal parts audiō, audīre, audīvī, audītum. Closely parallel to the -iō subgroup of the 3rd conjugation, but keeps its long ī in the infinitive and everywhere else.',
    recognition: [
      'Infinitive -īre (audīre) is unambiguous even without macrons, since no other conjugation produces that spelling.',
      'Present indicative active: audiō, audīs, audit, audīmus, audītis, audiunt — compare capiō above and note the identical 3rd-plural -iunt.',
      'Perfect is regularly -īvī (audīvī), though syncopated forms dropping the -v- (audiī, audiit) are common, especially in verse.',
    ],
    translation: [
      'Tense and voice meanings match every other conjugation.',
      'venīre ("to come") and its compounds (advenīre, pervenīre) are extremely common 4th-conjugation verbs worth knowing outright rather than deriving.',
    ],
    examples: [
      {
        latin: 'audiō, audīre, audīvī, audītum',
        citation: 'standard paradigm',
        analysis: '"To hear, listen to" — the model 4th-conjugation verb.',
      },
    ],
  },
  {
    id: 'sum-and-compounds',
    name: 'Sum and its compounds',
    category: 'morphology',
    level: 'foundational',
    summary:
      'sum, esse, fuī, futūrus, "to be" — the single most frequent verb in Latin and irregular in nearly every tense, plus its compounds (possum "to be able", absum "to be away", adsum "to be present", dēsum "to be lacking", intersum "to take part").',
    recognition: [
      'Present: sum, es, est, sumus, estis, sunt. Imperfect: eram, erās, erat… Future: erō, eris, erit… — none of these show a normal thematic vowel pattern.',
      'possum is sum welded to the adjective potis ("able"): potis + sum → possum, potis + es → potes, and so on — the pot-/pos- alternation is purely for pronounceability.',
      'sum has no passive voice (it is not transitive) and, unusually, no accusative object; its complement is a nominative (a predicate noun or adjective).',
    ],
    translation: [
      'sum links a subject to a predicate noun or adjective — "X is Y" — and never takes a direct object.',
      'A dative with a form of sum expresses possession: mihi est liber, literally "there is a book to me", idiomatically "I have a book".',
      'possum + a complementary infinitive: possum videre, "I am able to see / I can see".',
    ],
    examples: [
      {
        latin: 'sum, es, est, sumus, estis, sunt',
        citation: 'standard paradigm, present indicative',
        analysis: 'Committed to memory before any other verb in a beginning course, since it underlies the perfect passive system, the periphrastics, and most sentences with a predicate noun or adjective.',
      },
    ],
  },
  {
    id: 'irregular-verbs',
    name: 'Other irregular verbs',
    category: 'morphology',
    level: 'foundational',
    summary:
      'A short, closed list of verbs that do not follow any of the four regular conjugation patterns and must be learned individually: ferō ("carry/bear"), volō/nōlō/mālō ("want/not want/prefer"), eō ("go"), fīō ("become/be made", serving as the passive of faciō).',
    recognition: [
      'ferō: present ferō, fers, fert, ferimus, fertis, ferunt — no thematic vowel at all in most forms; infinitive ferre (not ferere).',
      'volō/nōlō/mālō share one irregular paradigm: volō, vīs, vult, volumus, vultis, volunt; nōlō is volō negated (nōn + volō, fused); mālō is magis + volō fused ("want more, prefer").',
      'eō: present eō, īs, it, īmus, ītis, eunt; infinitive īre (this is the pattern every compound of eō — abeō, exeō, redeō, pereō — inherits, which is why "abeō, -īre" always expands to abīre, never abeīre).',
    ],
    translation: [
      'ferō doubles as the suppletive perfect system for a verb meaning "carry" (tulī, latum) that looks nothing like ferō itself — an inherited irregularity, not a coincidence.',
      'fīō supplies nearly all the missing present-system passive forms of faciō: fit ("it happens/is made"), fīēbat ("was happening"), fierī ("to happen/be made").',
      'volō/nōlō/mālō take a complementary infinitive exactly like possum: volō īre, "I want to go".',
    ],
    examples: [
      {
        latin: 'fertur … Aenēān … acciri',
        citation: 'Aeneid 1.617 (paraphrase for illustration)',
        analysis: 'fertur, 3rd singular present passive of ferō, idiomatically "he is said" — one of the most common idiomatic uses of this irregular verb\'s passive.',
      },
    ],
  },
  {
    id: 'personal-reflexive-pronouns',
    name: 'Personal and reflexive pronouns',
    category: 'morphology',
    level: 'foundational',
    summary:
      'ego ("I"), tū ("you"), nōs ("we"), vōs ("you all") for the 1st and 2nd persons; the reflexive sē/suī has no nominative and no distinct singular/plural, since it always refers back to the subject of its own clause regardless of that subject\'s number.',
    recognition: [
      'ego: gen. meī, dat. mihi, acc./abl. mē. tū: gen. tuī, dat. tibi, acc./abl. tē.',
      'nōs: gen. nostrī/nostrum, dat./abl. nōbīs, acc. nōs. vōs: gen. vestrī/vestrum, dat./abl. vōbīs, acc. vōs.',
      'sē/suī has no nominative form (a reflexive cannot be the subject of the clause it reflects); the same spelling sē serves as both accusative and ablative singular and plural.',
    ],
    translation: [
      'A 3rd-person pronoun referring BACK to the subject is reflexive (sē, "himself/herself/itself/themselves"); one referring to someone ELSE is is/ea/id.',
      'suus, -a, -um is the reflexive possessive ("his own, her own") and likewise always points back to the subject — eius ("his/her", not his own) is used instead when the possessor is someone other than the subject.',
      'The genitives nostrum/vestrum (not nostrī/vestrī) are used partitively — ūnus nostrum, "one of us".',
    ],
    examples: [
      {
        latin: 'mē, mihi, tē, tibi, sē, sibi',
        citation: 'standard paradigm',
        analysis: 'The oblique-case forms of the first, second, and reflexive third person — memorised as a set, since none of the three declines like an ordinary noun.',
      },
    ],
  },
  {
    id: 'demonstrative-pronouns',
    name: 'Demonstrative pronouns',
    category: 'morphology',
    level: 'foundational',
    summary:
      'hic, haec, hoc ("this, the latter"); ille, illa, illud ("that, the former"); is, ea, id ("this/that, he/she/it" — the ordinary 3rd-person pronoun); īdem, eadem, idem ("the same", is + -dem); ipse, ipsa, ipsum ("-self", for emphasis, not reflexive in meaning).',
    recognition: [
      'All five share the same irregular case-ending family: genitive singular -īus (huius, illīus, eius, eiusdem, ipsīus) for every gender, dative singular -ī (huic, illī, eī, eīdem, ipsī) for every gender — exactly like the nine pronominal adjectives.',
      'is, ea, id supplies the ordinary unstressed 3rd-person pronoun ("he, she, it, they") wherever Latin has no dedicated word for one, unlike English.',
      'īdem is built by simply appending -dem to the appropriate form of is: eundem (not *eumdem, an m/n assimilation), eōrundem (not *eōrumdem) are the two irregular-looking spots.',
    ],
    translation: [
      'hic/ille used together contrast two things just mentioned: hic = "the latter" (nearer, i.e. more recently named), ille = "the former".',
      'ipse intensifies whatever noun or pronoun it agrees with: ipse rēx, "the king himself"; it is never reflexive by itself (ipse sē laudat, "he himself praises himself", needs sē to carry the reflexive sense).',
      'A form of is agreeing with a relative pronoun is very frequently omitted in Latin where English requires "the one/those": [eī] quī veniunt, "those who come".',
    ],
    examples: [
      {
        latin: 'Trōiae quī prīmus ab ōrīs / … vēnit',
        citation: 'Aeneid 1.1–2',
        passageId: 'aen-1-1-33',
        analysis: 'The antecedent of quī is exactly this kind of unstated is — understood as "[he] who came first…" with no separate pronoun written.',
      },
    ],
  },
  {
    id: 'relative-interrogative-pronouns',
    name: 'Relative and interrogative pronouns',
    category: 'morphology',
    level: 'foundational',
    summary:
      'quī, quae, quod ("who, which, that") introduces a relative clause and agrees with its antecedent in gender and number, but takes its case from its OWN clause. quis, quid (substantive) and quī, quae/qua, quod (adjectival) ask a question; the interrogative and relative share nearly all their forms.',
    recognition: [
      'quī, quae, quod: gen. cuius (for all genders), dat. cui (for all genders) — the same -īus/-ī family as the demonstratives.',
      'The interrogative pronoun quis/quid is used substantively ("who? what?"); the interrogative adjective quī/quae/quod is used with a noun ("which man? what plan?") and is spelled exactly like the relative.',
      'quisque ("each"), quīdam ("a certain"), aliquis ("someone") are all quis/quī compounded with a suffix or prefix, and decline the same way underneath it.',
    ],
    translation: [
      'A relative clause\'s case is diagnosed from its OWN verb/preposition, never copied from the antecedent — this is the single most common relative-clause error to check for.',
      '"the man WHOM I saw" — quem is accusative because it is the object of vīdī, even though its antecedent (vir) might be nominative in its own clause.',
      'quod alone, uncapitalized in translation, often means simply "because" — a causal conjunction that happens to be spelled like the neuter relative/interrogative.',
    ],
    examples: [
      {
        latin: 'Trōiae quī prīmus ab ōrīs',
        citation: 'Aeneid 1.1',
        passageId: 'aen-1-1-33',
        analysis: 'quī is nominative because it is the subject of vēnit in its own clause (line 2) — its antecedent is an unstated "he", not Trōiae, which is genitive.',
      },
    ],
  },
  {
    id: 'prepositions',
    name: 'Prepositions',
    category: 'morphology',
    level: 'foundational',
    summary:
      'Latin prepositions govern only two cases: the accusative (the large majority — ad, ante, apud, circum, contrā, inter, ob, per, post, prope, propter, trāns) or the ablative (ā/ab, cum, dē, ē/ex, prō, sine, sub when meaning "under" at rest). in and sub take the accusative for motion-into and the ablative for location-at.',
    recognition: [
      'The case a preposition governs is fixed and must be memorised with the word — it does not follow from meaning alone.',
      'in + accusative = motion "into"; in + ablative = static location "in/on". The same accusative/ablative split applies to sub ("under").',
      'cum attaches enclitically to a personal or reflexive pronoun in the ablative rather than preceding it: mēcum, tēcum, nōbīscum, sēcum ("with me/you/us/himself"), never *cum mē.',
    ],
    translation: [
      'A bare case ending, with no preposition, can express some of the same ideas a preposition would in English — ablative of means ("by/with"), locative ("at/in", for cities and small islands), accusative/ablative of a few relations of place-name.',
      'A preposition\'s English gloss ("in", "with", "on account of") is only a starting point — propter, "on account of, because of", and ob, likewise "because of, in front of", often need situational judgment to render well.',
    ],
    examples: [
      {
        latin: 'ab ōrīs … ob īram',
        citation: 'Aeneid 1.1, 1.4',
        passageId: 'aen-1-1-33',
        analysis: 'ab governs the ablative ōrīs ("from the shores"); ob governs the accusative īram ("because of the anger") — one word from each of the two governing groups, both from the poem\'s own opening.',
      },
    ],
  },
  {
    id: 'numbers',
    name: 'Numbers',
    category: 'morphology',
    level: 'foundational',
    summary:
      'Cardinal numbers ("one, two, three…") count; ordinal numbers ("first, second, third…") rank. Only ūnus, duo, trēs, and every hundred from ducentī up decline; the cardinals four through one hundred are indeclinable. Every ordinal declines like a normal 1st/2nd-declension adjective.',
    recognition: [
      'ūnus, -a, -um declines like the nine pronominal adjectives (gen. ūnīus, dat. ūnī).',
      'duo, duae, duo is irregular and archaic-looking: duōrum/duārum, duōbus/duābus, duōs (or duo)/duās/duo. trēs, tria declines like a 3rd-declension plural i-stem adjective (trium, tribus).',
      'mīlle is indeclinable as an adjective ("a thousand X"); its plural mīlia is a neuter i-stem noun construed with a following genitive (duo mīlia hominum, literally "two thousands of men").',
    ],
    translation: [
      'A cardinal used with a noun agrees with it in gender and case when it declines at all (trēs puellae, "three girls"; cum tribus puellīs, "with three girls").',
      'An ordinal identifies rank or sequence and is fully declinable: prīmus, secundus, tertius, quārtus, quīntus… agree with their noun exactly like any adjective.',
      'Roman dates are ordinal-based and counted inclusively backward from three fixed points each month (Kalends, Nones, Ides) — a system worth recognising even though the exam does not require computing one.',
    ],
    examples: [
      {
        latin: 'Trōiae quī prīmus ab ōrīs',
        citation: 'Aeneid 1.1',
        passageId: 'aen-1-1-33',
        analysis: 'prīmus, -a, -um, "first" — an ordinal, here a 1st/2nd-declension adjective modifying the unstated subject of vēnit, not a cardinal number.',
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* Advanced syntax — real, common Latin the CED does not test. Marked   */
  /* level: 'advanced' throughout so the reference never misrepresents    */
  /* one of these as something the exam requires.                        */
  /* ------------------------------------------------------------------ */

  {
    id: 'indirect-command',
    name: 'Indirect command',
    category: 'clause',
    level: 'advanced',
    summary:
      'After a verb of commanding, asking, persuading, or urging, the content of the command becomes a ut/ne + subjunctive clause rather than an infinitive — unlike English, which uses an infinitive ("I ask him TO come").',
    recognition: [
      'A "head verb" of command/request: imperō, hortor, persuādeō, moneō (in this sense), petō, ōrō, rogō.',
      'ut introduces a positive command, nē a negative one — never nōn.',
      'iubeō ("order") is the one common exception: it takes an accusative + infinitive instead, exactly like indirect statement, not ut + subjunctive.',
    ],
    translation: [
      'Supply "to": persuāsit eī ut venīret, "he persuaded him TO come" — never translate the ut literally as "that".',
      'Sequence of tenses applies normally: present subjunctive after a primary-sequence head verb, imperfect after a secondary one.',
    ],
    examples: [
      {
        latin: 'hortātur eōs ut fortiter pugnent',
        citation: 'standard textbook example',
        analysis: '"He urges them to fight bravely" — fortiter pugnent is present subjunctive after the primary-sequence hortātur, introduced by ut.',
      },
      {
        latin: 'iubet Liburnicam aptārī',
        citation: 'Pliny, Letters 6.16.6',
        passageId: 'pliny-6-16-a',
        analysis: 'iubeō itself takes an infinitive (aptārī, passive) with an accusative subject, not ut + subjunctive — the standard exception worth contrasting against the ordinary pattern above.',
      },
    ],
  },
  {
    id: 'indirect-question',
    name: 'Indirect question',
    category: 'clause',
    level: 'advanced',
    summary:
      'A question embedded inside a larger sentence ("he asked WHERE she was") is introduced by an interrogative word and takes the subjunctive, not the indicative a direct question would use.',
    recognition: [
      'An interrogative word (quis, quid, ubi, cūr, num, utrum…an, -ne) introducing a clause whose verb is subjunctive.',
      'A head verb of asking, knowing, or perceiving, uncertain about the answer: rogō, quaerō, nesciō, dubitō, mīror.',
      'Distinguishing this from a relative clause is purely a matter of the head verb\'s meaning and the presence of an interrogative sense, since qui/quis overlap in spelling.',
    ],
    translation: [
      'Render the subjunctive as an ordinary indicative in English — the subjunctive here carries no special "would/might" force, it is purely grammatical.',
      'Sequence of tenses applies exactly as in purpose or result clauses.',
    ],
    examples: [
      {
        latin: 'nesciō quid virtūs et quid possit fortūna',
        citation: 'a poetic paraphrase, standard textbook example',
        analysis: '"I do not know what worth and what fortune can do" — quid…possit is present subjunctive in an indirect question after nesciō.',
      },
    ],
  },
  {
    id: 'relative-characteristic',
    name: 'Relative clause of characteristic',
    category: 'clause',
    level: 'advanced',
    summary:
      'A relative clause with a SUBJUNCTIVE verb describes a general quality or type ("the kind of person who…") rather than a specific fact about a specific antecedent, which would take the indicative.',
    recognition: [
      'The antecedent is often indefinite or generic: nēmō est quī, sunt quī, is quī, quisquis est quī.',
      'A comparative or superlative antecedent, or one preceded by ūnus/sōlus, regularly triggers this construction (dignus quī, "worthy [of the sort] to…").',
      'The plain indicative version of the same sentence would state a fact about one specific antecedent, not a general characteristic of a type.',
    ],
    translation: [
      '"the kind of person who…", "such as would…", "the sort to…" — the subjunctive signals "characteristic of the type", not a specific completed fact.',
      'sunt quī + subjunctive: "there are those who…" (some people, of a certain kind).',
    ],
    examples: [
      {
        latin: 'nēmō est quī hoc nesciat',
        citation: 'standard textbook example',
        analysis: '"There is no one of the kind who does not know this" — nesciat is subjunctive because the clause describes the general characteristic of "no one," not a specific fact about a named person.',
      },
    ],
  },
  {
    id: 'fear-clauses',
    name: 'Clauses after verbs of fearing',
    category: 'clause',
    level: 'advanced',
    summary:
      'After timeō, vereor, metuō ("fear"), nē + subjunctive means "that" (fearing something WILL happen), and ut + subjunctive (or nē nōn) means "that…not" (fearing something will NOT happen) — the connectors are the reverse of what English speakers expect.',
    recognition: [
      'A head verb of fearing followed by nē or ut, each governing a subjunctive verb.',
      'nē after a fear verb is affirmative in sense ("that"), the opposite of its usual negative "that…not" force elsewhere (purpose, indirect command).',
      'ut after a fear verb means "that…not", again the reverse of its ordinary affirmative sense — nē nōn is an equally common alternative to ut here.',
    ],
    translation: [
      'timeō nē veniat: "I am afraid THAT he will come" (afraid he WILL come — nē is affirmative here).',
      'timeō ut veniat: "I am afraid THAT he will NOT come" (afraid he will fail to come).',
    ],
    examples: [
      {
        latin: 'timeō nē hostēs veniant',
        citation: 'standard textbook example',
        analysis: '"I fear that the enemy will come" — nē is affirmative in force after a verb of fearing, the reverse of its usual negative sense.',
      },
    ],
  },
  {
    id: 'doubting-clauses',
    name: 'Clauses of doubting and preventing',
    category: 'clause',
    level: 'advanced',
    summary:
      'quīn + subjunctive follows a negated verb of doubting ("I do not doubt THAT…"); quīn or quōminus + subjunctive follows a verb of preventing or refusing (impediō, prohibeō, recūsō, dēterreō).',
    recognition: [
      'nōn dubitō quīn + subjunctive — the verb of doubting must itself be negated (or a rhetorical question) for quīn to appear; a positive dubitō takes an ordinary indirect question instead (dubitō num…).',
      'A verb of hindering/preventing followed by quīn or quōminus, each taking the subjunctive.',
    ],
    translation: [
      'nōn dubitō quīn veniat: "I do not doubt THAT he is coming" — quīn here means simply "that", not "but that" as its literal parts might suggest.',
      'impediunt quōminus veniat / quīn veniat: "they prevent him FROM coming".',
    ],
    examples: [
      {
        latin: 'nōn dubitō quīn vēra dīcās',
        citation: 'standard textbook example',
        analysis: '"I do not doubt that you are speaking the truth" — dīcās is present subjunctive after quīn, triggered by the negated dubitō.',
      },
    ],
  },
  {
    id: 'causal-clauses',
    name: 'Causal clauses',
    category: 'clause',
    level: 'advanced',
    summary:
      'quod, quia, and quoniam + indicative give a fact-based reason the writer vouches for; cum + subjunctive (see cum clauses) gives a reason presented as the writer\'s own inference or as background the writer is characterizing, not asserting outright.',
    recognition: [
      'quod/quia/quoniam + INDICATIVE: a reason the author states as objectively true.',
      'A causal clause reporting someone ELSE\'s stated reason (not the author\'s own) takes the subjunctive even with quod — "he was angry because [so he claimed] I had left," a subtle distinction the AP cum-clauses topic covers more fully for cum itself.',
    ],
    translation: ['"because, since" — quod and quia are close to interchangeable; quoniam leans slightly more toward "seeing that, given that".'],
    examples: [
      {
        latin: 'īrātus est quod discesserāmus',
        citation: 'standard textbook example',
        analysis: '"He was angry because we had left" — discesserāmus is pluperfect INDICATIVE: the writer vouches for the departure as plain fact.',
      },
      {
        latin: 'īrātus est quod discessissēmus',
        citation: 'standard textbook example',
        analysis: 'The same sentence with pluperfect SUBJUNCTIVE instead: "he was angry [on the grounds] that we had left" — now it is only his stated reason being reported, not necessarily the writer\'s own assertion of fact.',
      },
    ],
  },
  {
    id: 'concessive-clauses',
    name: 'Concessive clauses',
    category: 'clause',
    level: 'advanced',
    summary:
      'A clause granting a point before overriding it ("although…") — cum + subjunctive ("granting that"), quamquam + indicative (a plain fact conceded), quamvīs + subjunctive ("however much"), and licet + subjunctive ("granted that") are the four common connectors, each with a different mood by default.',
    recognition: [
      'quamquam is the one common concessive conjunction that regularly takes the INDICATIVE, since it concedes a plain fact.',
      'quamvīs and licet both take the subjunctive, even though neither is a verb of commanding — an inherited idiom, not a purpose/result pattern.',
      'A concessive cum clause is indistinguishable in form from a causal or circumstantial cum clause; only the sense (does the main clause push back against the cum clause?) tells them apart.',
    ],
    translation: [
      '"although, even though, granted that" for all four — tamen ("nevertheless") very often appears in the main clause to signal the concession is being overridden.',
    ],
    examples: [
      {
        latin: 'quamquam sunt sub aquā, sub aquā maledīcere temptant',
        citation: 'standard textbook example',
        analysis: '"Although they are under water, they try to curse even under water" — quamquam + indicative (sunt) conceding a plain fact.',
      },
    ],
  },
  {
    id: 'temporal-clauses',
    name: 'Temporal clauses (other than cum)',
    category: 'clause',
    level: 'advanced',
    summary:
      'postquam, ubi, ut, simul ac ("as soon as") regularly take the indicative, usually the perfect, even where English might expect a pluperfect. antequam and priusquam ("before") take the indicative for a fact, the subjunctive when the event is anticipated or prevented. dum ("while, until, as long as") takes the indicative for simple "while", the subjunctive for a "until" sense implying purpose or expectation.',
    recognition: [
      'postquam/ubi/ut + a PERFECT indicative is idiomatic for "after X had happened," even though English reaches for a pluperfect.',
      'dum meaning "while" (simultaneous) takes a present indicative even in past narrative — a fixed idiom, not a sequence-of-tense violation.',
      'antequam/priusquam split: indicative narrates what did happen; subjunctive frames what was anticipated, intended, or prevented from happening.',
    ],
    translation: [
      '"after" (postquam/ubi/ut + perfect), "while/as" (dum + present, even in a past-tense sentence), "before" (ante-/priusquam).',
    ],
    examples: [
      {
        latin: 'dum conderet urbem',
        citation: 'Aeneid 1.5',
        passageId: 'aen-1-1-33',
        analysis: 'A dum clause with imperfect subjunctive conderet, expressing purpose/anticipation within the "while" ("while he might found a city") — already covered on the purpose/result page as an example of dum\'s subjunctive-taking sense, cross-referenced here for the full range of temporal connectors.',
      },
    ],
  },
  {
    id: 'comparison-clauses',
    name: 'Clauses of comparison',
    category: 'clause',
    level: 'advanced',
    summary:
      'quam ("than") after a comparative degree; tam…quam ("as…as"); tantus…quantus, tālis…quālis ("as great/such as…as") pairing a demonstrative with its matching relative-style correlative; and quasi/tamquam/velut ("as if") + subjunctive for an unreal, hypothetical comparison.',
    recognition: [
      'A correlative pair — one word in the main clause (tam, tantus, tālis, tot) answered by its matching word in the subordinate clause (quam, quantus, quālis, quot).',
      'quasi/tamquam/velut + SUBJUNCTIVE marks the comparison as unreal or hypothetical — "as if" something were true that is not.',
    ],
    translation: [
      '"as…as" (tam…quam), "as great as" (tantus…quantus), "as if" (quasi/tamquam + subjunctive, contrary to fact by definition).',
    ],
    examples: [
      {
        latin: 'tam vēlōciter fūgit quam sī hostem vīdisset',
        citation: 'standard textbook example',
        analysis: '"He fled as fast as if he had seen the enemy" — vīdisset is pluperfect subjunctive after quam sī, an unreal comparison.',
      },
    ],
  },
  {
    id: 'genitive-uses-advanced',
    name: 'Further uses of the genitive',
    category: 'case',
    level: 'advanced',
    summary:
      'Beyond ordinary possession: partitive ("of the whole"), subjective/objective (ambiguous with a verbal noun), of description, of value/price with verbs like aestimō, and of the charge/penalty with verbs of accusing and condemning.',
    recognition: [
      'Partitive genitive after a quantity word: pars mīlitum ("part OF the soldiers"), nihil novī ("nothing new", literally "nothing OF new").',
      'Subjective genitive: the noun is the agent of the verbal idea (amor patris, "the father\'s love [for someone]"). Objective genitive: the noun is the target (amor patris, "love FOR the father") — the SAME phrase can be either, decided only by context.',
      'Genitive of the charge (accūsat eum furtī, "accuses him OF theft") appears with iūdicō, accūsō, damnō, and their compounds.',
    ],
    translation: [
      '"of the ___" as a starting point, adjusted per type: "some OF", "love FOR/BY", "worth OF", "OF (the charge of)".',
      'A genitive of description always pairs with an adjective and functions exactly like an ablative of description — the two are interchangeable in most authors.',
    ],
    examples: [
      {
        latin: 'inūsitātā et magnitūdine et speciē',
        citation: 'Pliny, Letters 6.16.4',
        passageId: 'pliny-6-16-a',
        analysis: 'Ablative of description (already covered under "uses of the ablative") for contrast — the equivalent genitive of description would be spelled with -ae/-ī rather than -ā/-e but carries the identical function.',
      },
    ],
  },
  {
    id: 'accusative-uses-advanced',
    name: 'Further uses of the accusative',
    category: 'case',
    level: 'advanced',
    summary:
      'Beyond the direct object: duration of time (accusative alone, no preposition), extent of space, the accusative of respect ("Greek accusative", specifying what part something is true of), double accusative with verbs of teaching/asking/hiding, and the accusative of exclamation.',
    recognition: [
      'Duration/extent: a bare accusative with no preposition answering "how long?" or "how far/big?" — trēs annōs, "for three years"; mīlle passūs, "a thousand paces".',
      'Accusative of respect: typically with a part of the body and a passive/middle-sense participle — caput nūdāta, "bared as to her head / with her head bared" — a Greek-influenced construction common in Vergil.',
      'Double accusative: doceō, rogō, cēlō can each take a person AND a thing, both accusative (mē sententiam rogāvit, "he asked me my opinion").',
    ],
    translation: [
      '"for [duration]", "for a distance of", "with respect to/in", or leave a double accusative\'s two objects as-is in English, which allows the identical construction with the same handful of verbs.',
    ],
    examples: [
      {
        latin: 'multōs annōs bellum gessērunt',
        citation: 'standard textbook example',
        analysis: '"They waged war for many years" — annōs is accusative of duration of time, no preposition needed or permitted.',
      },
    ],
  },
  {
    id: 'vocative-locative',
    name: 'Vocative and locative',
    category: 'case',
    level: 'advanced',
    summary:
      'The vocative (direct address) is identical to the nominative in every declension and number except the 2nd-declension masculine singular, where -us becomes -e (domine) and -ius becomes a single -ī (fīlī). The locative ("place where", with no preposition) survives productively only for city/town names and a few common nouns (domī, humī, rūrī), and is spelled like the genitive singular in the 1st/2nd declension, the dative/ablative in the 3rd.',
    recognition: [
      'A 2nd-declension -us name or noun addressed directly changes to -e in the vocative (Ō Mārce!); -ius names contract to a single -ī (Vergilī, not Vergilie).',
      'Locative case is limited to names of cities, towns, small islands, and a short fixed list of common nouns — it is not a productive case for ordinary nouns.',
    ],
    translation: [
      'Vocative: simply the name or title being addressed, often set off by commas in translation, sometimes preceded by "O" in verse.',
      'Locative: "at/in [place]" with no preposition needed — Rōmae, "at Rome"; domī, "at home".',
    ],
    examples: [
      {
        latin: 'Mūsa, mihī causās memorā',
        citation: 'Aeneid 1.8',
        passageId: 'aen-1-1-33',
        analysis: 'Mūsa is vocative (identical to the nominative here, since it is 1st declension) — direct address of the Muse at the start of the poem\'s invocation.',
      },
    ],
  },
  {
    id: 'supine',
    name: 'The supine',
    category: 'verbal',
    level: 'advanced',
    summary:
      'A verbal noun with only two surviving case forms: the accusative supine (4th principal part stem + -um) expresses purpose after a verb of motion (itum, "in order to go"); the ablative supine (+ -ū) means "to/in the ___-ing" after an adjective (mīrābile dictū, "amazing to say").',
    recognition: [
      'Accusative supine directly after a verb of motion (eō, veniō, mittō): a stripped-down purpose expression with no verb of its own beyond the supine.',
      'Ablative supine after an adjective of ease, difficulty, or wonder: facile factū, "easy to do"; mīrābile dictū, "amazing to say/tell".',
    ],
    translation: ['"in order to ___" (accusative supine); "to ___" after an adjective (ablative supine).'],
    examples: [
      {
        latin: 'lēgātōs ad Caesarem mittunt rogātum auxilium',
        citation: 'standard textbook example',
        analysis: '"They send envoys to Caesar to ask for help" — rogātum is an accusative supine of purpose after the verb of motion mittunt.',
      },
    ],
  },
  {
    id: 'deponent-verbs',
    name: 'Deponent and semi-deponent verbs',
    category: 'verbal',
    level: 'advanced',
    summary:
      'A deponent verb is passive in FORM (every form built on the passive endings) but active in MEANING — sequor, sequī, secūtus sum, "to follow", never means "to be followed". A semi-deponent verb is a hybrid: active in form for the present system, passive-form/active-meaning for the perfect system (audeō, audēre, ausus sum, "to dare").',
    recognition: [
      'Only three principal parts are given (not four), and the second is the passive-looking infinitive in -rī/-ī: sequor, sequī, secūtus sum.',
      'The perfect participle of a deponent is active in sense, unlike an ordinary passive perfect participle: secūtus, "having followed" (not "having been followed").',
      'A handful of deponents take an object case other than the accusative, inherited from their non-deponent history: ūtor/fruor/fungor/potior/vēscor (ablative), obliviscor (genitive or accusative), and misereor (genitive).',
    ],
    translation: [
      'Translate every deponent form as ACTIVE, regardless of its passive-looking spelling — this is the single most important rule to remember about them.',
      'The perfect passive participle of a deponent doubles as the closest thing Latin has to an active perfect participle in translation ("having done", not just "having been done") — a genuine gap it fills elsewhere in the verb system.',
    ],
    examples: [
      {
        latin: 'multa quoque et bellō passus',
        citation: 'Aeneid 1.5',
        passageId: 'aen-1-1-33',
        analysis: 'passus is the perfect participle of the deponent patior, patī, passus sum, "to suffer, endure" — active in sense ("having suffered"), despite its passive-looking -us ending built the same way any passive participle is.',
      },
    ],
  },
  {
    id: 'impersonal-verbs',
    name: 'Impersonal verbs',
    category: 'verbal',
    level: 'advanced',
    summary:
      'A verb used only in the 3rd person singular with no personal subject, often translated with a dummy "it" in English: verbs of weather (pluit, "it is raining"), of feeling with a dative or accusative experiencer (mihi placet, "it is pleasing to me / I like [it]"; mē paenitet, "it repents me / I regret"), and licet/oportet/necesse est with an infinitive or subjunctive.',
    recognition: [
      'No expressed nominative subject; the verb stays fixed in the 3rd singular regardless of who is "affected".',
      'The "feeling" impersonals split by the case of the person affected: dative (placet, licet, libet) versus accusative (paenitet, piget, pudet, taedet, miseret — the mnemonic "impersonal PPTM" list).',
      'An infinitive or a clause commonly serves as the impersonal verb\'s real grammatical subject: licet īre, "it is permitted to go / one may go".',
    ],
    translation: [
      '"it ___s [that/to]…", or recast the person affected as an English subject: mihi placet = "it pleases me" or, more naturally, "I like it".',
      'mē paenitet huius reī: "it repents me of this thing" → "I regret this".',
    ],
    examples: [
      {
        latin: 'mihi placet domī manēre',
        citation: 'standard textbook example',
        analysis: '"It is pleasing to me to stay home" / "I like to stay home" — placet is impersonal, taking a dative experiencer (mihi) and the infinitive manēre as its logical subject.',
      },
    ],
  },
  {
    id: 'potential-subjunctive',
    name: 'Potential subjunctive',
    category: 'mood',
    level: 'advanced',
    summary:
      'An independent (main-clause) subjunctive expressing what could, might, or would happen, with no subordinating conjunction at all — one of a small family of independent subjunctive uses alongside the hortatory/jussive and optative already covered under "uses of the subjunctive".',
    recognition: [
      'A subjunctive verb standing alone as the main verb of its sentence, with no ut/nē/cum/sī introducing it, and no imperative sense (which would be hortatory instead).',
      'Present or perfect subjunctive for present potential ("might/could now"); imperfect for past potential ("might have, could have back then").',
    ],
    translation: ['"might, could, would" — velim ("I should like"), dīxerit aliquis ("someone might say")  and crēdās ("you would believe") are common idiomatic instances.'],
    examples: [
      {
        latin: 'dīxerit aliquis: "quid tum?"',
        citation: 'standard textbook example',
        analysis: '"Someone might say, \'so what?\'" — dīxerit is a perfect potential subjunctive with no subordinating word, functioning as its own main clause.',
      },
    ],
  },
  {
    id: 'deliberative-subjunctive',
    name: 'Deliberative subjunctive',
    category: 'mood',
    level: 'advanced',
    summary:
      'An independent subjunctive in a question that asks what one SHOULD do, rather than a real request for information — quid faciam?, "what am I to do? / what should I do?" — as opposed to the indicative quid faciō?, a genuine factual question about present action.',
    recognition: [
      'A question with a subjunctive verb and no other subordinating conjunction, typically first person, asking about obligation or appropriate action rather than fact.',
      'Present subjunctive for a present dilemma; imperfect for a past one ("what was I to do [then]?").',
    ],
    translation: ['"what am/was I to do?", "should I…?" — never a plain factual "what do/did I do?", which would be indicative.'],
    examples: [
      {
        latin: 'quid faciam? Rōmamne veniam, an hīc maneam?',
        citation: 'standard textbook example',
        analysis: '"What am I to do? Should I come to Rome, or stay here?" — faciam, veniam, maneam are all deliberative subjunctives with no subordinating conjunction.',
      },
    ],
  },
  {
    id: 'historical-infinitive',
    name: 'Historical infinitive',
    category: 'verbal',
    level: 'advanced',
    summary:
      'An infinitive used AS a finite main verb in vivid narrative, standing in for an imperfect indicative — a stylistic device for rapid, breathless action, not a grammatical error or an indirect statement missing its head verb.',
    recognition: [
      'A present infinitive functioning as the main verb of an independent clause, usually with a nominative (not accusative) subject — the tell that distinguishes it from an indirect statement\'s infinitive-plus-accusative.',
      'Often several historical infinitives appear in a rapid series, describing a chaotic scene as if in a series of snapshots.',
    ],
    translation: ['Render as an ordinary imperfect: "he kept shouting, they kept running" — the historical infinitive\'s aspect is durative/repeated, like the imperfect it substitutes for.'],
    examples: [
      {
        latin: 'clāmāre virī, mulierēs plōrāre, omnēs undique currere',
        citation: 'standard textbook example',
        analysis: '"The men kept shouting, the women kept wailing, everyone kept running from every side" — three historical infinitives (clāmāre, plōrāre, currere) each with a nominative subject, all substituting for imperfect indicatives.',
      },
    ],
  },
  {
    id: 'periphrastics',
    name: 'The periphrastic conjugations',
    category: 'verbal',
    level: 'advanced',
    summary:
      'Two compound verb forms built from a participle plus a form of sum. The active periphrastic (future active participle + sum) expresses intention: "about to ___". The passive periphrastic (gerundive + sum), also called the passive periphrastic of obligation, expresses necessity: "must be ___-ed" — with the person who must do it in the dative (dative of agent).',
    recognition: [
      'Active periphrastic: -ūrus, -a, -um + a form of sum (moritūrus est, "he is about to die").',
      'Passive periphrastic: gerundive + a form of sum, with a dative of agent naming who must act (haec fēmina laudanda est mihi, "this woman must be praised BY me").',
      'A passive periphrastic of an intransitive verb has no expressed subject at all and is used impersonally: eundum est mihi, literally "it must be gone by me", idiomatically "I must go".',
    ],
    translation: [
      'Active: "is/was about to ___, is destined to ___". Passive: "must be ___-ed", with the dative agent rendered as an English subject — "this must be done by me" or, more naturally, "I must do this".',
    ],
    examples: [
      {
        latin: 'Carthāgō dēlenda est',
        citation: 'attributed to Cato the Elder (traditional tag, not a syllabus citation)',
        analysis: 'The single most famous passive periphrastic in the language: dēlenda est, "must be destroyed" — gerundive of dēleō agreeing with the feminine Carthāgō, no agent expressed because none is needed for the rhetorical point.',
      },
    ],
  },
];

export function getTopic(id: string): GrammarTopic | undefined {
  return grammarTopics.find((t) => t.id === id);
}
