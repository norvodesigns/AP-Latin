import type { Question, QuestionSet, QuestionType, SkillCode, SkillCategory } from './types';

/**
 * The multiple-choice bank.
 *
 * Every question carries an `explanation` — the answer key alone teaches
 * nothing. Skill codes follow the CED (1.A–1.D, 2.A–2.B, 3.A–3.B); the
 * category is derived from the code so the two can never drift apart.
 *
 * Latin quoted in `stimulus` is reproduced from the same public-domain sources
 * as the passage data. See CONTENT.md to add your own.
 */

const cat = (skill: SkillCode): SkillCategory => skill[0] as SkillCategory;

function q(
  id: string,
  type: QuestionType,
  skill: SkillCode,
  unit: Question['unit'],
  prompt: string,
  options: string[],
  answerIndex: number,
  explanation: string,
  extra: Partial<Question> = {},
): Question {
  return {
    id,
    type,
    skill,
    skillCategory: cat(skill),
    unit,
    prompt,
    options: options.map((text, i) => ({ id: String.fromCharCode(97 + i), text })),
    answerId: String.fromCharCode(97 + answerIndex),
    explanation,
    difficulty: 2,
    ...extra,
  };
}

export const questions: Question[] = [
  /* ================= Aeneid 1.1–33 — the proem ================= */
  q(
    'aen1-1', 'form-identification', '1.B', '4',
    'In line 1, canō is best identified as',
    ['first person singular present active indicative', 'first person singular perfect active indicative',
     'present active infinitive', 'first person singular present passive indicative'],
    0,
    'canō is the first person singular present active indicative of canō, canere. The long ō is the personal ending -ō; the perfect would be cecinī. Vergil announces his subject in the present: “I sing”, not “I sang”.',
    { passageId: 'aen-1-1-33', lineRange: [1, 1], difficulty: 1 },
  ),
  q(
    'aen1-2', 'grammar-syntax', '1.B', '4',
    'In line 2 (Ītaliam … vēnit), Ītaliam is best understood as',
    ['accusative of place to which, without a preposition',
     'direct object of vēnit',
     'accusative of respect',
     'accusative of duration of time'],
    0,
    'vēnit is intransitive and cannot take a direct object. Ītaliam is an accusative of place to which with the preposition omitted — a poetic construction Vergil uses constantly, and one AP tests often. Compare Lāvīnia … lītora in the same sentence.',
    { passageId: 'aen-1-1-33', lineRange: [2, 3] },
  ),
  q(
    'aen1-3', 'grammar-syntax', '1.B', '4',
    'In line 4, superum is',
    ['a syncopated genitive plural (= superōrum)', 'an accusative singular adjective',
     'a neuter nominative singular', 'a comparative adverb'],
    0,
    'superum is the shortened (syncopated) genitive plural of superī, “the gods above” — so vī superum is “by the violence of the gods above”. Reading it as an accusative singular leaves vī without a genitive and produces nonsense. Syncopated genitive plurals in -um for -ōrum are common in epic.',
    { passageId: 'aen-1-1-33', lineRange: [4, 4], difficulty: 3 },
  ),
  q(
    'aen1-4', 'grammar-syntax', '1.B', '4',
    'In line 4, memorem agrees with',
    ['īram', 'Iūnōnis', 'vī', 'superum'],
    0,
    'memorem is accusative singular, and the only accusative singular noun available is īram; saevae is genitive singular agreeing with Iūnōnis. The interlocked order (saevae memorem Iūnōnis ob īram) is deliberate: the adjectives are separated from their nouns and interwoven, a favourite Vergilian effect. Grammar, not proximity, decides agreement.',
    { passageId: 'aen-1-1-33', lineRange: [4, 4], difficulty: 3 },
  ),
  q(
    'aen1-5', 'grammar-syntax', '1.B', '4',
    'In line 5, dum conderet urbem is best translated',
    ['until he could found a city', 'while he was founding a city',
     'because he founded a city', 'although he founded a city'],
    0,
    'dum with the subjunctive expresses anticipation or purpose — “until he might/could found”. dum with the indicative would mean simple contemporaneous time (“while”). The subjunctive conderet is the deciding evidence, and the sense fits: the founding is the goal all the suffering serves.',
    { passageId: 'aen-1-1-33', lineRange: [5, 5] },
  ),
  q(
    'aen1-6', 'literary-device', '2.A', '4',
    'The repetition of multum (line 3) and multa (line 5) at the head of successive clauses is an example of',
    ['anaphora', 'chiasmus', 'litotes', 'asyndeton'],
    0,
    'Anaphora is the repetition of a word at the beginning of successive clauses or phrases. Here it stacks up the sheer quantity of Aeneas’ suffering — first on land and sea, then in war — before the sentence finally reaches its purpose in dum conderet urbem. Chiasmus would be an ABBA arrangement; litotes is understatement by double negative; asyndeton is the omission of conjunctions.',
    { passageId: 'aen-1-1-33', lineRange: [3, 5] },
  ),
  q(
    'aen1-7', 'context-culture', '2.B', '4',
    'The Albānī patrēs of line 7 refer to',
    ['the kings of Alba Longa, from whom Rome’s founders descended',
     'the senators of Augustan Rome',
     'the Trojan elders who fled with Aeneas',
     'the priests of the Alban Mount'],
    0,
    'Alba Longa was the city founded by Ascanius, and its line of kings connects Aeneas to Romulus and so to Rome itself. The three-stage progression in lines 6–7 — genus Latīnum, Albānī patrēs, moenia Rōmae — compresses the whole legendary history from Aeneas’ landing to the city, which is exactly the claim the poem exists to make.',
    { passageId: 'aen-1-1-33', lineRange: [6, 7] },
  ),
  q(
    'aen1-8', 'meter', '2.A', '4',
    'In line 1 (Arma virumque canō, Trōiae quī prīmus ab ōrīs), the first foot is',
    ['a dactyl', 'a spondee', 'a trochee', 'an anapaest'],
    0,
    'Ar-ma vi- scans long–short–short: the a of Arma is long by position (before rm), and both syllables of -ma vi- are short. That is a dactyl. Vergil opens the poem with a dactyl on arma, giving the first word metrical prominence as well as positional prominence.',
    { passageId: 'aen-1-1-33', lineRange: [1, 1] },
  ),
  q(
    'aen1-9', 'inference', '3.A', '4',
    'The question at 1.11 (tantaene animis caelestibus īrae?) most directly',
    ['raises the theological problem the poem will spend twelve books answering',
     'accuses Juno of a crime against Jupiter',
     'signals that the narrator does not believe in the gods',
     'marks the end of the invocation and the start of the narrative'],
    0,
    'The line asks whether such anger can really exist in divine minds. It is not an accusation but a genuine problem: the poem must reconcile a benevolent fate with a goddess who tortures a pious man. The question is left hanging until Jupiter and Juno settle terms in Book 12, which is why quae iam finis erit, coniunx? (12.793) reads as its answer.',
    { passageId: 'aen-1-1-33', lineRange: [11, 11], difficulty: 3 },
  ),

  /* ================= Aeneid 4.305–361 ================= */
  q(
    'aen4-1', 'vocabulary-in-context', '1.A', '5',
    'In the phrase dissimulāre etiam spērāstī, perfide, tantum / posse nefās (4.305–306), nefās is best translated',
    ['an outrage against divine law', 'a misfortune', 'a lie', 'a refusal'],
    0,
    'nefās is what is contrary to divine law — the negative of fās. Dido is not calling Aeneas’ departure merely unlucky or dishonest; she is framing it as an offence against the gods, which is why she can appeal to them in the lines that follow. “Misfortune” would be cāsus; “lie” would be mendācium.',
    { passageId: 'aen-4-305-361', lineRange: [305, 306] },
  ),
  q(
    'aen4-2', 'grammar-syntax', '1.B', '5',
    'In 4.314 (per ego hās lacrimās dextramque tuam tē), the arrangement of per … tē is an example of',
    ['tmesis and hyperbaton, separating the preposition from its object for emotional effect',
     'anastrophe, placing the preposition after its object',
     'ellipsis of the main verb',
     'a Greek accusative'],
    0,
    'per governs tē, but Vergil throws ego and a long string of appeals between them, so the oath formula is stretched almost to breaking. The dislocation enacts Dido’s agitation — she cannot get to the end of her own sentence. Anastrophe would put per after tē; there is no ellipsis of the verb, since ōrō follows.',
    { passageId: 'aen-4-305-361', lineRange: [314, 314], difficulty: 3 },
  ),
  q(
    'aen4-3', 'translation-choice', '1.D', '5',
    'The best literal translation of neque ego hanc abscondere furtō / spērāvī (ne finge) fugam (4.337–338) is',
    ['nor did I hope to conceal this flight by stealth — do not imagine it',
     'nor do I hope that this flight can be hidden by theft — do not pretend',
     'nor did I hope to be hidden from this flight by a thief — do not lie',
     'nor did I expect this stolen flight to be concealed — do not deceive yourself'],
    0,
    'spērāvī is perfect, so “did I hope”, not “do I hope”. furtō is an ablative of means, “by stealth”, not “theft” as an agent. hanc … fugam is the object of abscondere across the intervening words. ne finge is a poetic negative command, “do not imagine (it)”.',
    { passageId: 'aen-4-305-361', lineRange: [337, 338] },
  ),
  q(
    'aen4-4', 'inference', '3.B', '5',
    'Which Latin best supports the claim that Aeneas presents his departure as compelled rather than chosen?',
    ['Ītaliam nōn sponte sequor (4.361)',
     'tandem pauca refert (4.333)',
     'nec mē meminisse pigēbit Elissae (4.335)',
     'prō rē pauca loquar (4.337)'],
    0,
    'nōn sponte means “not of my own accord”, and it is the closing word of the whole speech — the position gives it weight. The other options are true statements about the speech but do not bear on compulsion: they concern its brevity or his memory of Dido. On the exam, choosing evidence that actually supports the specific claim is what row-scoring rewards.',
    { passageId: 'aen-4-305-361', lineRange: [361, 361] },
  ),
  q(
    'aen4-5', 'literary-device', '2.A', '5',
    'In 4.331–332 (ille Iovis monitīs immōta tenēbat / lūmina), the placement of immōta … lūmina around the line break chiefly',
    ['enacts the fixity it describes by suspending the phrase across the enjambment',
     'creates a caesura in the fifth foot',
     'produces a golden line',
     'signals a change of speaker'],
    0,
    'immōta is held back from its noun until the next line, so the reader’s eye is itself held — the word order performs the immobility of Aeneas’ gaze. This is a standard way Vergil makes syntax do descriptive work. A golden line has a fixed adjective–adjective–verb–noun–noun pattern, which this is not.',
    { passageId: 'aen-4-305-361', lineRange: [331, 332], difficulty: 3 },
  ),

  /* ================= Aeneid 6.847–853 ================= */
  q(
    'aen6-1', 'grammar-syntax', '1.B', '5',
    'In 6.851–853, regere, impōnere, parcere and dēbellāre are all',
    ['infinitives dependent on mementō', 'historical infinitives',
     'infinitives in indirect statement', 'present passive infinitives'],
    0,
    'mementō (“remember”) takes a complementary infinitive, and all four infinitives hang from it. Recognising this is what holds the sentence together: they are not four separate commands but four objects of one imperative. There is no accusative subject, so indirect statement is ruled out; historical infinitives take a nominative subject and narrate.',
    { passageId: 'aen-6-847-853', lineRange: [851, 853] },
  ),
  q(
    'aen6-2', 'grammar-syntax', '1.B', '5',
    'In 6.853, subiectīs is',
    ['dative plural, governed by parcere', 'ablative plural of means',
     'ablative absolute with a participle', 'accusative plural, object of dēbellāre'],
    0,
    'parcō takes the dative, so subiectīs is dative plural — “to spare the conquered”. The contrast with superbōs, which is accusative as the object of dēbellāre, is the point of the line: two verbs, two different constructions, deliberately balanced.',
    { passageId: 'aen-6-847-853', lineRange: [853, 853] },
  ),
  q(
    'aen6-3', 'literary-device', '2.A', '5',
    'The relationship of parcere subiectīs to dēbellāre superbōs (6.853) is best described as',
    ['antithesis, expressed in parallel structure', 'chiasmus', 'hendiadys', 'praeteritio'],
    0,
    'Two opposed ideas — mercy and destruction — are set out in matching verb + object form, so the structure is parallel and the sense antithetical. Chiasmus would require the order to reverse (ABBA); it does not. The balance is what makes the line quotable and what makes the poem’s ending, where Aeneas does not spare a suppliant, so pointed.',
    { passageId: 'aen-6-847-853', lineRange: [853, 853] },
  ),
  q(
    'aen6-4', 'context-culture', '2.B', '5',
    'In conceding that others will excel at sculpture, oratory and astronomy (6.847–850), Anchises is contrasting Rome with',
    ['the Greeks', 'the Carthaginians', 'the Etruscans', 'the Egyptians'],
    0,
    'The three arts named — bronze and marble sculpture, forensic oratory, and mapping the heavens — are precisely those in which Greek achievement was acknowledged as supreme. Anchises concedes cultural pre-eminence to Greece in order to claim a different and, he argues, higher art for Rome: government. The move is a commonplace of Augustan self-definition.',
    { passageId: 'aen-6-847-853', lineRange: [847, 851] },
  ),

  /* ================= Pliny 6.16 ================= */
  q(
    'pl616-1', 'grammar-syntax', '1.B', '2',
    'In 6.16.4 (mater mea indicat eī appārēre nūbem), appārēre nūbem is',
    ['indirect statement dependent on indicat', 'a purpose construction',
     'a result clause with the infinitive', 'a complementary infinitive with indicat'],
    0,
    'indicō introduces indirect statement: nūbem is the accusative subject and appārēre the infinitive, “that a cloud was appearing”. Reading nūbem as the direct object of indicat leaves appārēre stranded. Recognising the accusative + infinitive is one of the highest-frequency skills the exam tests in Pliny.',
    { passageId: 'pliny-6-16-a', lineRange: [4, 4] },
  ),
  q(
    'pl616-2', 'vocabulary-in-context', '1.A', '2',
    'In 6.16.5, the comparison of the cloud to a pīnus depends on the tree’s',
    ['tall bare trunk spreading into branches at the top',
     'dark green colour', 'sharp needles', 'resin and smell'],
    0,
    'Pliny spells the comparison out in §6: longissimō velut truncō ēlāta in altum quibusdam rāmīs diffundēbātur — raised on a very long trunk and then spreading into branches. He means the Mediterranean umbrella pine, whose shape is exactly that of an eruption column. It is the reason this type of eruption is called “Plinian”.',
    { passageId: 'pliny-6-16-a', lineRange: [5, 6] },
  ),
  q(
    'pl616-3', 'grammar-syntax', '1.B', '2',
    'In 6.16.5, ūsus ille sōle is best rendered',
    ['he, having taken a sunbath', 'he, having been used by the sun',
     'the use of the sun by him', 'he being useful in the sun'],
    0,
    'ūtor is deponent: the perfect participle ūsus is active in meaning, “having used / having taken”, and it governs the ablative sōle. Translating it passively is the classic deponent error. The idiom ūtī sōle means to take a sunbath — part of the bathing routine Pliny describes.',
    { passageId: 'pliny-6-16-a', lineRange: [5, 5] },
  ),
  q(
    'pl616-4', 'inference', '3.B', '2',
    'Which Latin best supports the claim that Pliny presents his uncle’s decision as a deliberate move from scholarship to rescue?',
    ['vertit ille cōnsilium et quod studiōsō animō incohāverat obit maximō',
     'ēgrediēbātur domō',
     'iubet Liburnicam aptārī',
     'nūbem inūsitātā et magnitūdine et speciē'],
    0,
    'The sentence explicitly contrasts what he began with a scholar’s mind (studiōsō animō incohāverat) with what he carried through with the greatest spirit (obit maximō) — the turn is stated, not implied. The other options are true details but do not name the change of purpose; vertit cōnsilium is the pivot of the whole letter.',
    { passageId: 'pliny-6-16-a', lineRange: [9, 9], difficulty: 3 },
  ),
  q(
    'pl616-5', 'context-culture', '2.B', '2',
    'Pliny the Elder was at Misenum because',
    ['he commanded the Roman fleet stationed there',
     'he was governor of Campania',
     'he owned an estate on the slopes of Vesuvius',
     'he had been sent by Titus to investigate the earthquakes'],
    0,
    'Misenum, at the northern end of the Bay of Naples, was the base of the western imperial fleet, and Pliny the Elder was its prefect — classem imperiō praesēns regēbat (6.16.4). That command is what puts warships at his disposal and turns a scientific curiosity into a rescue operation.',
    { passageId: 'pliny-6-16-a', lineRange: [4, 4] },
  ),

  /* ================= Pliny 6.20 ================= */
  q(
    'pl620-1', 'inference', '3.A', '2',
    'Pliny’s account of reading Livy during the earthquake (6.20.5) functions chiefly to',
    ['present his own composure as a deliberate contrast to the panic around him',
     'explain how he later wrote the letter',
     'show that he did not understand the danger',
     'criticise his mother for her anxiety'],
    0,
    'The detail is placed immediately beside the friend from Spain rebuking both of them, so the calm is staged against alarm; Pliny even reports the rebuke and says he went on reading. Whether the poise is real or literary, its function in the letter is self-presentation. He is seventeen, and the anecdote is doing the same work as his uncle’s bath and dinner in 6.16.',
    { passageId: 'pliny-6-20-a', lineRange: [5, 5], difficulty: 3 },
  ),
  q(
    'pl620-2', 'grammar-syntax', '1.B', '2',
    'In 6.20.9 (mare in sē resorbērī vidēbāmur), the form vidēbāmur means',
    ['we seemed', 'we were seen', 'we saw ourselves', 'we were being watched'],
    0,
    'videor in the passive regularly means “seem”, not “be seen”, and takes an infinitive. So the sense is “we seemed to see the sea being sucked back”. Translating it as a true passive produces the wrong subject and loses the careful hedging Pliny uses throughout for things he could not verify.',
    { passageId: 'pliny-6-20-a', lineRange: [9, 9] },
  ),
  q(
    'pl620-3', 'literary-device', '2.A', '2',
    'In 6.20.14 (audīrēs ululātūs fēminārum, īnfantum quirītātūs, clāmōrēs virōrum), the arrangement is best described as',
    ['a tricolon, with variation in the order of noun and genitive',
     'anaphora', 'litotes', 'praeteritio'],
    0,
    'Three parallel members make a tricolon; Pliny varies it by switching the order within the second and third members rather than repeating a fixed pattern, which keeps the list from sounding mechanical. There is no repeated opening word, so it is not anaphora. The effect is to fill the darkness with distinct, sourceless sounds.',
    { passageId: 'pliny-6-20-b', lineRange: [14, 14], difficulty: 3 },
  ),

  /* ================= Pliny 7.27 ================= */
  q(
    'pl727-1', 'vocabulary-in-context', '1.A', '3',
    'In 7.27.5, sonus ferrī means “a sound of iron”. The form ferrī here is',
    ['genitive singular of ferrum', 'present passive infinitive of ferō',
     'dative singular of ferrum', 'perfect passive infinitive of ferō'],
    0,
    'ferrī is ambiguous in form — it is both the genitive of ferrum and the present passive infinitive of ferō — and Pliny’s sentence is a favourite AP trap. Here sonus needs a genitive to complete it, and the ghost is dragging chains, so “of iron” is right. Always let the syntax of the sentence decide between homographs.',
    { passageId: 'pliny-7-27-b', lineRange: [5, 5], difficulty: 3 },
  ),
  q(
    'pl727-2', 'grammar-syntax', '1.B', '3',
    'In 7.27.5, sī attenderēs ācrius uses the imperfect subjunctive to express',
    ['a generalising “if you listened”, with an indefinite second person',
     'a contrary-to-fact condition in present time',
     'a purpose clause', 'an indirect question'],
    0,
    'The second person singular subjunctive with an indefinite “you” is a standard way of describing what anyone would experience — “if you listened closely”. It is not contrary to fact: people did listen, and did hear it. Reading it as unreal makes the ghost story report something that never happened, which is the opposite of Pliny’s point.',
    { passageId: 'pliny-7-27-b', lineRange: [5, 5], difficulty: 3 },
  ),
  q(
    'pl727-3', 'grammar-syntax', '1.B', '3',
    'In 7.27.5, the imperfects reddēbātur and appārēbat are best understood as',
    ['iterative, describing what happened repeatedly',
     'a single completed action in the past',
     'actions going on when the ghost arrived',
     'conative, describing attempted actions'],
    0,
    'The whole point of the haunting is that it recurred night after night until the house was abandoned. The iterative imperfect carries that, and English needs “would appear” or “used to appear” to render it. A simple past (“appeared”) reduces a standing haunting to one incident and loses the reason the house stood empty.',
    { passageId: 'pliny-7-27-b', lineRange: [5, 6] },
  ),
  q(
    'pl727-4', 'inference', '3.B', '3',
    'Which detail most directly explains why the haunting stops?',
    ['the bones are collected and buried at public expense with proper rites',
     'Athenodorus proves he is not afraid',
     'the magistrates dig up the courtyard',
     'the philosopher marks the spot with grass and leaves'],
    0,
    'Roman belief held that the unburied dead could not rest. The story turns on that: the ghost leads Athenodorus to its own remains, and once the bones receive rīte conditīs mānibus — burial with due rites — the house is quiet. Digging and marking are steps toward the remedy; the remedy itself is the burial.',
    { passageId: 'pliny-7-27-b', lineRange: [11, 11] },
  ),
  q(
    'pl727-5', 'context-culture', '2.B', '3',
    'Pliny frames the whole letter as a question to Sura about whether ghosts',
    ['have a real existence and form of their own, or take shape only from our fear',
     'can be summoned by philosophers',
     'are punished by the gods for their crimes',
     'appear only to the guilty'],
    0,
    'The opening asks whether phantoms exist and have their own shape and some divine power, or whether they are inānia et vāna and take form ex metū nostrō. Framing an entertaining story as a philosophical enquiry is a standard epistolary move: it dignifies the material and gives the letter a reason to exist beyond the anecdote.',
    { passageId: 'pliny-7-27-a', lineRange: [1, 1] },
  ),

  /* ================= Pliny 10 — Trajan ================= */
  q(
    'pl10-1', 'context-culture', '2.B', '3',
    'Trajan’s replies in Book 10 differ from Pliny’s letters chiefly in being',
    ['markedly shorter and plainer, focused on a decision',
     'more elaborately rhetorical',
     'written in verse',
     'addressed to a wider readership'],
    0,
    'The contrast is one of the most testable features of Book 10. Pliny builds context, justifies himself and defers at length; Trajan answers in a few sentences and decides. Compare 10.5–10.6 with 10.7, or 10.33 with 10.34: the emperor’s brevity is itself an assertion of authority.',
    { passageId: 'pliny-10-7' },
  ),
  q(
    'pl10-2', 'grammar-syntax', '1.B', '3',
    'In 10.37, ut aquam habeant expresses',
    ['purpose', 'result', 'an indirect command', 'a temporal relationship'],
    0,
    'ut with the subjunctive after a statement about spending money again gives the goal of the expenditure — “so that they may have water”. Result would require an anticipatory word such as tam, ita or sīc in the main clause, and there is none. Distinguishing purpose from result by looking for those signposts is a standard AP task.',
    { passageId: 'pliny-10-37' },
  ),
  q(
    'pl10-3', 'inference', '3.A', '3',
    'Trajan refuses the firefighters’ guild at Nicomedia (10.34) primarily because',
    ['associations of any kind tend to become political clubs',
     'the cost would fall on the imperial treasury',
     'he doubts that fires are a serious danger there',
     'Pliny had exceeded his authority in proposing it'],
    0,
    'Trajan says it directly: whatever name is given them and for whatever reason, such groups will shortly become hetaeriae — political clubs — and that province has already been troubled by factions. It is not a financial or a technical objection but a political one, and it is the clearest surviving statement of imperial suspicion of collegia.',
    { passageId: 'pliny-10-34', difficulty: 3 },
  ),

  /* ================= Sight — prose ================= */
  q(
    'sight-p1', 'grammar-syntax', '1.B', '1',
    'In the passage, quibus rēbus cognitīs is',
    ['an ablative absolute', 'a dative of reference with a participle',
     'an ablative of means', 'a relative clause of characteristic'],
    0,
    'A noun and a participle together in the ablative, grammatically independent of the main clause, form an ablative absolute: “these things having been learned” or, better English, “when this became known”. The connecting relative quibus simply links back to the previous sentence and does not make it a relative clause.',
    {
      stimulus: {
        latin: 'Quibus rēbus cognitīs, Caesar apud mīlitēs contiōnātus est et eōs cohortātus est ut prīstinam virtūtem retinērent.',
        citation: 'Adapted prose, in the style of the sight-reading section',
        genre: 'prose',
        gloss: [{ word: 'contiōnor, -ārī', meaning: 'to address an assembly' }],
      },
      difficulty: 1,
    },
  ),
  q(
    'sight-p2', 'translation-choice', '1.D', '1',
    'The best literal translation of eōs cohortātus est ut prīstinam virtūtem retinērent is',
    ['he urged them to keep their former courage',
     'he was urged by them to keep their former courage',
     'he urged that they had kept their former courage',
     'having urged them, he kept his former courage'],
    0,
    'cohortātus est is deponent, so it is active in meaning with Caesar as subject and eōs as object. ut + imperfect subjunctive after a verb of urging is an indirect command: “to keep”. Option two mistakes the deponent for a true passive; option four turns the finite verb into a participle.',
    {
      stimulus: {
        latin: 'Quibus rēbus cognitīs, Caesar apud mīlitēs contiōnātus est et eōs cohortātus est ut prīstinam virtūtem retinērent.',
        citation: 'Adapted prose, in the style of the sight-reading section',
        genre: 'prose',
      },
    },
  ),

  /* ================= Sight — poetry ================= */
  q(
    'sight-v1', 'literary-device', '2.A', '1',
    'In Catullus 85 (Ōdī et amō. quārē id faciam, fortasse requīris), the opening two words are an example of',
    ['antithesis', 'anaphora', 'hyperbaton', 'synchysis'],
    0,
    'Two opposed verbs are set immediately side by side with nothing between them, so the contradiction is the whole point — the poem is built on it. Anaphora needs a repeated opening word; hyperbaton needs separated words that belong together; synchysis is interlocked ABAB word order.',
    {
      stimulus: {
        latin: 'Ōdī et amō. quārē id faciam, fortasse requīris.\nnesciō, sed fierī sentiō et excrucior.',
        citation: 'Catullus 85 (public domain)',
        genre: 'poetry',
      },
      difficulty: 1,
    },
  ),
  q(
    'sight-v2', 'form-identification', '1.B', '1',
    'In Catullus 85, excrucior is',
    ['first person singular present passive indicative',
     'first person singular present active indicative',
     'present passive infinitive',
     'third person singular present passive indicative'],
    0,
    'The ending -or marks the first person singular present passive: “I am tortured”. The passive is the point of the poem — the speaker is not doing something but having something done to him, which is why the poem ends on it. A third person singular passive would be excruciātur.',
    {
      stimulus: {
        latin: 'Ōdī et amō. quārē id faciam, fortasse requīris.\nnesciō, sed fierī sentiō et excrucior.',
        citation: 'Catullus 85 (public domain)',
        genre: 'poetry',
      },
    },
  ),
  q(
    'sight-v3', 'inference', '3.A', '1',
    'The juxtaposition of nesciō with sentiō in Catullus 85 chiefly conveys that the speaker',
    ['feels the contradiction without being able to explain it',
     'has decided to stop loving', 'is deceiving the person he addresses',
     'blames the gods for his condition'],
    0,
    'nesciō denies knowledge and sentiō asserts perception, and the two sit in the same line: he cannot account for what is happening but he can feel it happening to him. That gap between understanding and experience is the poem’s subject, and excrucior completes it by making him the object of the process.',
    {
      stimulus: {
        latin: 'Ōdī et amō. quārē id faciam, fortasse requīris.\nnesciō, sed fierī sentiō et excrucior.',
        citation: 'Catullus 85 (public domain)',
        genre: 'poetry',
      },
      difficulty: 3,
    },
  ),
];

/* ------------------------------------------------------------------ */
/* CED-shaped sets                                                     */
/* ------------------------------------------------------------------ */

export const questionSets: QuestionSet[] = [
  {
    id: 'set-long-vergil-proem',
    title: 'Long set — Aeneid 1.1–33',
    stimulusType: 'syllabus-vergil',
    length: 'long',
    passageId: 'aen-1-1-33',
    questionIds: ['aen1-1', 'aen1-2', 'aen1-3', 'aen1-4', 'aen1-5', 'aen1-6', 'aen1-7', 'aen1-8', 'aen1-9'],
  },
  {
    id: 'set-short-pliny-vesuvius',
    title: 'Short set — Pliny 6.16',
    stimulusType: 'syllabus-pliny',
    length: 'short',
    passageId: 'pliny-6-16-a',
    questionIds: ['pl616-1', 'pl616-2', 'pl616-3'],
  },
  {
    id: 'set-short-pliny-ghosts',
    title: 'Short set — Pliny 7.27',
    stimulusType: 'syllabus-pliny',
    length: 'short',
    passageId: 'pliny-7-27-b',
    questionIds: ['pl727-1', 'pl727-2', 'pl727-3'],
  },
  {
    id: 'set-short-sight-poetry',
    title: 'Short set — sight poetry (Catullus)',
    stimulusType: 'sight-other-poetry',
    length: 'short',
    questionIds: ['sight-v1', 'sight-v2', 'sight-v3'],
  },
];

export function getQuestion(id: string): Question | undefined {
  return questions.find((x) => x.id === id);
}

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  'grammar-syntax': 'Grammar & syntax',
  'form-identification': 'Form identification',
  'vocabulary-in-context': 'Vocabulary in context',
  'translation-choice': 'Translation choice',
  'literary-device': 'Literary device',
  meter: 'Metre',
  'context-culture': 'Context & culture',
  inference: 'Inference',
};

export const SKILL_LABELS: Record<SkillCode, string> = {
  '1.A': 'Identify the meaning of Latin words and phrases',
  '1.B': 'Describe how grammar contributes to meaning',
  '1.C': 'Summarise Latin texts in English',
  '1.D': 'Translate Latin texts into English',
  '2.A': 'Describe stylistic elements',
  '2.B': 'Describe historical and cultural contexts',
  '3.A': 'Develop an interpretation',
  '3.B': 'Explain how evidence supports an interpretation',
};
