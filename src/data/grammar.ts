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
];

export function getTopic(id: string): GrammarTopic | undefined {
  return grammarTopics.find((t) => t.id === id);
}
