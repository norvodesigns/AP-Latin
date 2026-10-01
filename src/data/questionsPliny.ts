import type { Question } from './types';
import { q } from './questionKit.ts';

/**
 * AP-style multiple choice for the Pliny letters on the syllabus that the
 * first bank left thin: 6.16.13–22, 6.20, 7.27.9–16, 6.4, 6.7 and the
 * letters to Trajan. Line numbers are section numbers, as in the Reading
 * Room. Answer positions vary, since options are shown in order.
 */
export const PLINY_QUESTIONS: Question[] = [
  /* ================= Letters 6.16.13–22 ================= */
  q(
    'p616b-1', 'grammar-syntax', '1.B', '2',
    'In section 13 (in remedium formīdinis dictitābat), the uncle says the fires were abandoned farmhouses burning. His purpose in saying so is',
    ['to blame the farmers for the eruption', 'to explain the eruption scientifically for his book', 'to calm the others’ fear', 'to persuade Pomponianus to sail at once'],
    2,
    'in remedium formīdinis, “as a cure for fear”: the phrase gives the purpose. The admiral explains the flames away so that the household will not panic, the same calm he shows by bathing, dining and sleeping.',
    { passageId: 'pliny-6-16-b', lineRange: [13, 13] },
  ),
  q(
    'p616b-2', 'grammar-syntax', '1.B', '2',
    'In section 14, ut sī longior in cubiculō mora, exitus negārētur is best described as',
    ['a result clause, after ita', 'a purpose clause', 'an indirect command', 'a relative clause of characteristic'],
    0,
    'ita … oppleta surrēxerat, ut … negārētur: the courtyard had filled so high with ash and pumice that, had he stayed longer, the way out would have been blocked. ita signals result.',
    { passageId: 'pliny-6-16-b', lineRange: [14, 14] },
  ),
  q(
    'p616b-3', 'translation-choice', '1.D', '2',
    'In section 15, intrā tēcta subsistant an in apertō vagentur is best translated',
    ['they stay under the roofs and wander in the open', 'although they stood under the roofs, they wandered outside', 'so that they might stay indoors rather than wander', 'whether they should stay under cover or wander in the open'],
    3,
    'After In commūne cōnsultant, the subjunctives subsistant and vagentur form a double indirect deliberative question: whether to stay … or (an) to wander. The council weighs collapsing houses against falling stones.',
    { passageId: 'pliny-6-16-b', lineRange: [15, 15] },
  ),
  q(
    'p616b-4', 'form-identification', '1.B', '2',
    'In section 17, nigrior is',
    ['a superlative adjective', 'a comparative adjective, with omnibus noctibus as ablative of comparison', 'a present participle', 'a comparative adverb modifying placuit'],
    1,
    'nox omnibus noctibus nigrior dēnsiorque: “a night blacker and thicker than all nights”. The -ior ending marks the comparative; the ablative noctibus expresses “than”.',
    { passageId: 'pliny-6-16-b', lineRange: [17, 17] },
  ),
  q(
    'p616b-5', 'inference', '3.A', '2',
    'In sections 21–22, Pliny stops before telling his own story because',
    ['he was not present at Misenum', 'his mother forbade it', 'Tacitus asked only about his uncle’s death, and a letter differs from history', 'he had already told it in an earlier letter'],
    2,
    'nec tū aliud quam dē exitū eius scīre voluistī, and aliud est enim epistulam aliud historiam: he keeps to what Tacitus requested, leaving the choice of material to the historian. The story he holds back becomes Letter 6.20.',
    { passageId: 'pliny-6-16-b', lineRange: [21, 22] },
  ),

  /* ================= Letters 6.20.1–10 ================= */
  q(
    'p620a-1', 'context-culture', '3.B', '2',
    'In section 1, Pliny quotes quamquam animus meminisse horret, … incipiam, words of',
    ['Aeneas, beginning his story of the fall of Troy', 'Achilles in the Iliad', 'Livy, at the start of his history', 'Tacitus, in his request'],
    0,
    'The line is Aeneid 2.12–13, Aeneas about to tell Dido of Troy’s last night. Pliny casts his own escape from Misenum as an epic survivor’s tale, with a smile at the grandeur.',
    { passageId: 'pliny-6-20-a', lineRange: [1, 1] },
  ),
  q(
    'p620a-2', 'grammar-syntax', '1.B', '2',
    'In section 4, sī quiēsceret excitātūrus expresses',
    ['a past contrary-to-fact condition', 'a wish', 'an indirect question about his mother', 'what Pliny intended: to wake her if she was sleeping'],
    3,
    'The future participle excitātūrus gives intention: he was getting up “to wake her, if she was asleep”. They had each come to wake the other.',
    { passageId: 'pliny-6-20-a', lineRange: [4, 4] },
  ),
  q(
    'p620a-3', 'inference', '3.A', '2',
    'In section 7, quodque in pavōre simile prūdentiae, aliēnum cōnsilium suō praefert, Pliny observes that frightened people',
    ['refuse all advice', 'think following someone else’s plan is wisdom', 'stay at home', 'pray to the gods'],
    1,
    'The crowd prefers another’s plan to its own, “which in panic looks like prudence”. It is a sharp, general remark about crowds, typical of Pliny’s moralizing asides.',
    { passageId: 'pliny-6-20-a', lineRange: [7, 7] },
  ),
  q(
    'p620a-4', 'literary-device', '2.A', '2',
    'In section 9, the cloud is described as rupta in longās flammārum figūrās … fulguribus illae et similēs et maiōrēs erant. The comparison to lightning',
    ['shows that it was only a thunderstorm', 'is ironic, since there was no fire', 'makes the unfamiliar eruption imaginable through something familiar', 'refers to Jupiter’s anger'],
    2,
    'Pliny has no word for what he saw, so he reaches for lightning: “like it, and bigger”. Comparison to the familiar is how he makes the scene vivid for Tacitus’s readers.',
    { passageId: 'pliny-6-20-a', lineRange: [9, 9] },
  ),

  /* ================= Letters 6.20.11–20 ================= */
  q(
    'p620b-1', 'grammar-syntax', '1.B', '2',
    'In section 12, posse enim iuvenem … bene moritūram is best described as',
    ['indirect statement reporting his mother’s words', 'historical infinitives', 'an ablative absolute', 'a purpose clause'],
    0,
    'The accusatives iuvenem and sē with the infinitives posse and moritūram (esse) report what she said: a young man could escape; she, heavy with years, would die content.',
    { passageId: 'pliny-6-20-b', lineRange: [12, 12] },
  ),
  q(
    'p620b-2', 'literary-device', '2.A', '2',
    'In section 14, alii parentēs aliī līberōs aliī coniugēs vōcibus requīrēbant is an example of',
    ['chiasmus', 'litotes', 'hendiadys', 'anaphora, in a tricolon'],
    3,
    'aliī … aliī … aliī: the repeated word at the head of each phrase, three times, makes the crowd of voices in the dark audible, parents, children and spouses calling for one another.',
    { passageId: 'pliny-6-20-b', lineRange: [14, 14] },
  ),
  q(
    'p620b-3', 'grammar-syntax', '1.B', '2',
    'In section 14, the subjunctive precārentur in erant quī metū mortis mortem precārentur is used because',
    ['it is a purpose clause', 'it is a relative clause of characteristic: “there were those who …”', 'it is indirect speech', 'it is a contrary-to-fact condition'],
    1,
    'erant quī + subjunctive describes a kind of person: “there were people of the sort who prayed for death out of fear of death”. Note also the polyptoton mortis mortem.',
    { passageId: 'pliny-6-20-b', lineRange: [14, 14] },
  ),
  q(
    'p620b-4', 'inference', '3.A', '2',
    'In section 17, Pliny says he could boast of not crying out, except that he believed',
    ['the gods would save him', 'his uncle was safe', 'he and the whole world were dying together, a wretched but great comfort', 'the danger was exaggerated'],
    2,
    'mē cum omnibus, omnia mēcum perīre (note the chiasmus) … magnō tamen mortālitātis sōlāciō: his courage, he admits, came from thinking everyone was dying with him.',
    { passageId: 'pliny-6-20-b', lineRange: [17, 17] },
  ),

  /* ================= Letters 7.27.9–16 ================= */
  q(
    'p727b-1', 'form-identification', '1.B', '3',
    'In section 9, similis vocantī: vocantī is',
    ['a present participle used as a noun, dative with similis', 'a perfect passive participle', 'a future participle', 'an infinitive'],
    0,
    'vocāns, vocantis, the present participle, here in the dative after similis: the ghost beckoned “like someone calling”.',
    { passageId: 'pliny-7-27-b', lineRange: [9, 9] },
  ),
  q(
    'p727b-2', 'translation-choice', '1.D', '3',
    'In section 10, dēsertus herbās et folia concerpta signum locō pōnit is best translated',
    ['deserted, the grass and leaves were placed in the spot', 'the deserted place was marked by grass', 'he put a sign among the grass and leaves', 'left alone, he plucked grass and leaves and put them on the spot as a marker'],
    3,
    'dēsertus agrees with the philosopher; herbās et folia concerpta is the object, “grass and leaves, plucked”; signum is in apposition, “as a sign”; locō is ablative of place without a preposition.',
    { passageId: 'pliny-7-27-b', lineRange: [10, 10] },
  ),
  q(
    'p727b-3', 'context-culture', '3.B', '3',
    'Section 11 says the house was free of the ghost once the bones were buried rīte. This reflects the Roman belief that',
    ['ghosts haunt the houses of the guilty', 'the unburied dead cannot rest', 'philosophers can command spirits', 'chains keep the dead from wandering'],
    1,
    'Proper burial rites (rīte conditīs mānibus) let the dead rest. Once the chained bones were buried at public expense, the haunting ended.',
    { passageId: 'pliny-7-27-b', lineRange: [11, 11] },
  ),
  q(
    'p727b-4', 'inference', '3.A', '3',
    'In section 14, Pliny connects the haircuts in his household with',
    ['a dream sent by the gods', 'his freedman’s illness', 'his escape from a charge Domitian would have pursued', 'a fashion of the time'],
    2,
    'Defendants let their hair grow; cut hair, he infers, signaled that the danger hanging over him had passed. A libellus against him was found in Domitian’s desk after the emperor’s death.',
    { passageId: 'pliny-7-27-b', lineRange: [14, 14] },
  ),

  /* ================= Letters 6.4 ================= */
  q(
    'p64-1', 'grammar-syntax', '1.B', '3',
    'In section 1, quae mē nōn sunt passae … prōsequī: quae refers to',
    ['his occupations (his work)', 'his letters', 'Calpurnia’s friends', 'the towns of Campania'],
    0,
    'quae picks up occupātiōnibus meīs: his business, which did not “allow” (passae sunt, from patior) him to go with her. The relative is feminine plural to match.',
    { passageId: 'pliny-6-4', lineRange: [1, 1] },
  ),
  q(
    'p64-2', 'vocabulary-in-context', '1.A', '3',
    'In section 2, corpusculō is best understood as',
    ['a sign of disgust', 'a medical term', 'a reference to a statue', 'an affectionate diminutive: “your poor little body”'],
    3,
    'The diminutive -culum softens the word: Pliny worries tenderly over her frail health. It is one of the marks of affection in his letters to his wife.',
    { passageId: 'pliny-6-4', lineRange: [2, 2] },
  ),
  q(
    'p64-3', 'literary-device', '2.A', '3',
    'In section 4, Vereor omnia, imāginor omnia contains',
    ['simile', 'epistrophe and asyndeton', 'litotes', 'apostrophe'],
    1,
    'omnia ends both clauses (epistrophe), and there is no conjunction between them (asyndeton). The repetition makes his fear seem boundless.',
    { passageId: 'pliny-6-4', lineRange: [4, 4] },
  ),
  q(
    'p64-4', 'inference', '3.A', '3',
    'The last sentence, Erō enim sēcūrior dum legō, statimque timēbō cum lēgerō, suggests that',
    ['her letters will end his worry for good', 'he would rather not hear from her', 'her letters calm him only while he reads them', 'he will stop writing to her'],
    2,
    'The future and future perfect set the two moments side by side: while reading, easier; once finished, afraid again. Hence his request for one letter a day, or even two.',
    { passageId: 'pliny-6-4', lineRange: [5, 5] },
  ),

  /* ================= Letters 6.7 ================= */
  q(
    'p67-1', 'grammar-syntax', '1.B', '3',
    'In section 1, quod prō mē libellōs meōs teneās: the subjunctive teneās is used because',
    ['the clause reports what Calpurnia wrote (indirect statement)', 'it is a purpose clause', 'it is a result clause', 'it is a command'],
    0,
    'The quod clause belongs to what Calpurnia says (Scrībis …): subordinate clauses inside reported speech take the subjunctive.',
    { passageId: 'pliny-6-7', lineRange: [1, 1] },
  ),
  q(
    'p67-2', 'vocabulary-in-context', '1.A', '3',
    'In section 2, lēctitō means',
    ['I read aloud', 'I gather', 'I choose', 'I read again and again'],
    3,
    'lēctitō is the frequentative of legō: repeated action. Pliny takes up her letters identidem … quasi novās, “again and again as if new”.',
    { passageId: 'pliny-6-7', lineRange: [2, 2] },
  ),
  q(
    'p67-3', 'literary-device', '2.A', '3',
    'In section 3, cuius litterae tantum habent suāvitātis, huius sermōnibus quantum dulcēdinis inest! is an example of',
    ['a simile', 'an argument from the lesser to the greater', 'a rhetorical question', 'chiasmus'],
    1,
    'If her letters are so charming, how much sweeter her conversation must be: from the lesser (letters) to the greater (her presence). The exclamation ends on what he is missing.',
    { passageId: 'pliny-6-7', lineRange: [3, 3] },
  ),
  q(
    'p67-4', 'grammar-syntax', '1.B', '3',
    'In section 3, licet hoc ita mē dēlectet ut torqueat: licet with the subjunctive means',
    ['it is permitted that', 'so that', 'although', 'because'],
    2,
    'licet + subjunctive is concessive, “although”. ita … ut torqueat is a result clause: it delights him so that it torments him. Write anyway, he says.',
    { passageId: 'pliny-6-7', lineRange: [3, 3] },
  ),

  /* ================= Letters 10.5–7 ================= */
  q(
    'p105-1', 'grammar-syntax', '1.B', '3',
    'In 10.5, section 2, rogō dēs eī cīvitātem Rōmānam: dēs is subjunctive because',
    ['it is an indirect command with ut omitted', 'it is a purpose clause', 'it is a jussive in its own sentence', 'it is a contrary-to-fact wish'],
    0,
    'After verbs of asking, ut is often left out: rogō (ut) dēs, “I ask you to give”. Pliny uses the same form again in 10.6, rogō … tribuās.',
    { passageId: 'pliny-10-5', lineRange: [2, 2] },
  ),
  q(
    'p105-2', 'context-culture', '3.B', '3',
    'Pliny asks for citizenship for Harpocras because',
    ['he was a soldier in Pliny’s province', 'Trajan had promised it', 'he was a famous scholar', 'he cared for Pliny during a dangerous illness'],
    3,
    'gravissimā valētūdine usque ad perīculum vītae vexātus iātralīptēn assūmpsī: the masseur-doctor nursed him through it, and Pliny can repay him only through the emperor’s favor.',
    { passageId: 'pliny-10-5', lineRange: [1, 1] },
  ),
  q(
    'p106-1', 'inference', '3.A', '3',
    'In 10.6, Pliny’s mistake was that',
    ['he asked for the wrong man', 'an Egyptian needed Alexandrian citizenship before Roman', 'Harpocras was already a citizen', 'he forgot to send the man’s age'],
    1,
    'admonitus sum … dēbuisse mē ante eī Alexandrīnam cīvitātem impetrāre, deinde Rōmānam, quoniam esset Aegyptius. He had thought all foreigners were alike in this.',
    { passageId: 'pliny-10-6', lineRange: [1, 2] },
  ),
  q(
    'p106-2', 'grammar-syntax', '1.B', '3',
    'In 10.6, section 1, quoniam esset Aegyptius: esset is subjunctive because',
    ['it is a result clause', 'it is a purpose clause', 'the reason is part of what the experts told him (reported reasoning)', 'quoniam always takes the subjunctive'],
    2,
    'quoniam normally takes the indicative; the subjunctive marks the reason as part of what Pliny was told by those more experienced, not his own assertion.',
    { passageId: 'pliny-10-6', lineRange: [1, 1] },
  ),
  q(
    'p107-1', 'inference', '3.A', '3',
    'In 10.7, Trajan grants the request because',
    ['Pliny has already obtained Roman citizenship for the man', 'Alexandrian citizenship is easily given', 'Pompeius Planta advised it', 'Harpocras is an Alexandrian by birth'],
    0,
    'Sed cum … iam cīvitātem Rōmānam impetrāveris, huic quoque petītiōnī tuae negāre nōn sustineō: having given the greater gift, he will not refuse the lesser, though he grants it sparingly.',
    { passageId: 'pliny-10-7', lineRange: [0, 0] },
  ),

  /* ================= Letters 10.37 and 10.90 ================= */
  q(
    'p1037-1', 'grammar-syntax', '1.B', '3',
    'In 10.37, section 1, novō impendiō est opus: impendiō is ablative because',
    ['it is an ablative absolute', 'it is ablative of comparison', 'it expresses time', 'opus est takes the ablative of the thing needed'],
    3,
    'opus est + ablative: “there is need of new expense”. The Nicomedians, having wasted so much, need still more to have water.',
    { passageId: 'pliny-10-37', lineRange: [1, 1] },
  ),
  q(
    'p1037-2', 'inference', '3.A', '3',
    'In 10.37, section 2, the water should come arcuātō opere so that',
    ['it looks impressive', 'it can reach the higher parts of the city, not only the low ground', 'it costs less', 'it avoids the old aqueduct'],
    1,
    'nē tantum ad plāna cīvitātis et humilia perveniat: a negative purpose clause. Water must arrive high to serve the whole city.',
    { passageId: 'pliny-10-37', lineRange: [2, 2] },
  ),
  q(
    'p1037-3', 'context-culture', '3.B', '3',
    'In 10.37, section 3, Pliny’s closing praise, ūtilitātem operis et pulchritūdinem saeculō tuō esse dignissimam, appeals to',
    ['Trajan’s fear of the Nicomedians', 'religious duty', 'Trajan’s interest in a reign remembered for useful and beautiful public works', 'the Senate’s authority'],
    2,
    'Governors framed requests in terms of the emperor’s glory. An aqueduct both useful and beautiful is “most worthy of your age”.',
    { passageId: 'pliny-10-37', lineRange: [3, 3] },
  ),
  q(
    'p1090-1', 'grammar-syntax', '1.B', '3',
    'In 10.90, section 1, Sinōpēnsēs … aquā dēficiuntur: aquā is ablative because',
    ['dēficior is used with an ablative of the thing lacking (separation)', 'it is ablative of means', 'it is ablative of comparison', 'it is an ablative absolute'],
    0,
    'In the passive, dēficior means “to be short of”, with the ablative of what is lacking: the people of Sinope are short of water.',
    { passageId: 'pliny-10-90', lineRange: [1, 1] },
  ),
  q(
    'p1090-2', 'literary-device', '2.A', '3',
    'In 10.90, section 2, valdē sitientis colōniae is an example of',
    ['litotes', 'chiasmus', 'hyperbaton', 'personification'],
    3,
    'A colony cannot be thirsty; its people can. Giving the town a human need makes Pliny’s practical request vivid.',
    { passageId: 'pliny-10-90', lineRange: [2, 2] },
  ),
];
