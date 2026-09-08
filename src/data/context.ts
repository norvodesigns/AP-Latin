import type { ContextCard } from './types';

/**
 * Context and culture cards. Skill category 2.B is 5–10% of the exam on its
 * own, and contextual information is worth up to 2 points on FRQ 4 and 5.
 */
export const contextCards: ContextCard[] = [
  {
    id: 'vergil-life',
    topic: 'vergil-augustan',
    title: 'Vergil and Augustan Rome',
    body:
      'Publius Vergilius Maro (70–19 BCE) came from near Mantua in northern Italy and wrote three works: the Eclogues, the Georgics, and the Aeneid, which occupied him from about 29 BCE until his death. He worked under the patronage of Maecenas and within the orbit of Augustus, who had ended a century of civil war after defeating Antony and Cleopatra at Actium in 31 BCE. The Aeneid gave Rome a foundation legend that ran back to Troy and gave the Julian house a divine ancestor in Venus, through Aeneas and his son Iulus. Vergil left the poem unfinished and reportedly asked for it to be burned; Augustus overrode him. Whether the poem endorses the Augustan settlement or quietly questions it — the so-called "two voices" debate — is the central critical question about it, and the ending is the main evidence on both sides.',
    keyFacts: [
      'Aeneid composed c. 29–19 BCE, left unfinished at Vergil’s death.',
      'Augustus (Octavian) took sole power after Actium, 31 BCE.',
      'Iulus (Ascanius) supplies the Julian family’s descent from Venus.',
      'Maecenas was the patron who connected Vergil and Horace to Augustus.',
      'Vergil asked that the poem be burned; Augustus had it published.',
    ],
  },
  {
    id: 'epic-conventions',
    topic: 'epic-conventions',
    title: 'Epic conventions',
    body:
      'Epic has a set of recognisable moves, and Vergil signals his genre by using them in the first thirty lines. The proem states the theme and invokes the Muse. The narrative begins in medias res — in the middle of things — with the storm and the landing at Carthage, and the fall of Troy is told in flashback in Books 2 and 3. Other conventions include the extended simile, the catalogue of forces (Book 7), the descent to the underworld (Book 6), the shield ecphrasis (Book 8), divine councils and divine intervention, formulaic speech introductions, patronymics, and the aristeia, a sequence in which one warrior dominates the field. Metre is dactylic hexameter throughout.',
    keyFacts: [
      'Proem, invocation of the Muse, in medias res opening.',
      'Extended (epic) similes, catalogues, ecphrasis, aristeia, katabasis.',
      'Dactylic hexameter: six feet, fifth normally a dactyl, sixth disyllabic.',
      'The Aeneid is deliberately both Odyssean (Books 1–6: wandering) and Iliadic (7–12: war).',
      'maius opus moveo (7.45) marks the turn to the Iliadic half.',
    ],
  },
  {
    id: 'trojan-legend',
    topic: 'trojan-legend',
    title: 'The Trojan legend and the mythological cast',
    body:
      'The war began when Paris, a Trojan prince, judged Venus the fairest of three goddesses and was rewarded with Helen, wife of Menelaus of Sparta. The Greeks besieged Troy for ten years and took it by the stratagem of the wooden horse. Aeneas, son of Venus and the mortal Anchises, escaped the sack carrying his father and leading his son Ascanius, and lost his wife Creusa. He carried with him the Penates, the household gods of Troy, which gives Rome religious as well as genetic continuity with Troy. Juno opposes him throughout, both because of the Judgement of Paris and the abduction of Ganymede, and because she loves Carthage, which fate has doomed to fall to a race descended from Trojans.',
    keyFacts: [
      'Judgement of Paris → Venus favours Troy, Juno and Minerva oppose it.',
      'Aeneas: son of Venus and Anchises; father of Ascanius/Iulus.',
      'Laocoön warns against the horse and is killed by sea serpents (Book 2).',
      'Dido: Phoenician queen of Carthage, widow of Sychaeus, founder of the city.',
      'Turnus: Rutulian prince, betrothed to Lavinia, Aeneas’ opponent in Books 7–12.',
      'Camilla: Volscian warrior maiden dedicated to Diana (Books 7 and 11).',
    ],
  },
  {
    id: 'pliny-life',
    topic: 'pliny-world',
    title: 'Pliny the Younger and his world',
    body:
      'Gaius Plinius Caecilius Secundus (61–c. 113 CE) was a lawyer, senator and administrator from Comum in northern Italy. His father died when he was young and he was raised in part by his maternal uncle, Pliny the Elder, who adopted him in his will. He held a full senatorial career, was consul in 100 CE — the occasion of his surviving Panegyricus to Trajan — and was sent around 110 CE as imperial legate to the province of Bithynia-Pontus, where he died in office. He published nine books of literary letters, carefully revised for publication, and a tenth book of official correspondence with Trajan that includes the emperor’s replies. Pliny the Elder, prefect of the fleet at Misenum, was the author of the encyclopaedic Naturalis Historia and died in the eruption of Vesuvius in 79 CE.',
    keyFacts: [
      'Pliny the Younger: 61–c. 113 CE; consul 100 CE; governor of Bithynia-Pontus c. 110–113.',
      'Pliny the Elder: author of the Naturalis Historia; prefect of the fleet; died at Stabiae in 79 CE.',
      'Books 1–9 are literary letters revised for publication; Book 10 is official correspondence.',
      'Calpurnia was Pliny’s third wife; three letters to her survive (6.4, 6.7, 7.5).',
      'Tacitus, the historian, is the addressee of both Vesuvius letters.',
    ],
  },
  {
    id: 'epistolary',
    topic: 'epistolary',
    title: 'Roman epistolary conventions',
    body:
      'A Roman letter opens with a formula naming sender and addressee in a fixed order — C. PLINIUS TACITO SUO S. (salutem dicit, "sends greetings") — and closes with vale, "farewell". Letters to the emperor drop the familiar suo and the closing formula: C. PLINIUS TRAIANO IMPERATORI. Trajan’s replies are headed TRAIANUS PLINIO. Pliny’s published letters are literary compositions, not private notes: each is built around a single subject, shaped with a beginning, development and point, and revised for publication. Standard moves include the modesty topos (Pliny insisting his material is not worthy of history), the framing of a story as a response to the addressee’s request, and the closing epigram. Reading them as unmediated evidence, rather than as constructed artefacts, is the commonest interpretive mistake.',
    keyFacts: [
      'Opening: SENDER + ADDRESSEE (dative) + S. = salutem dicit. Closing: vale.',
      'To the emperor: C. PLINIUS TRAIANO IMPERATORI, no suo, no vale.',
      'Each published letter treats one subject and is shaped to a point.',
      'The modesty topos — nōn historia digna — is a convention, not a fact about the content.',
      'Letters stand in for the absent person: Calpurnia keeps Pliny’s books in his place (6.7).',
    ],
  },
  {
    id: 'provincial-admin',
    topic: 'provincial-admin',
    title: 'Provincial administration under Trajan',
    body:
      'Bithynia-Pontus, on the Black Sea coast of what is now Turkey, was a senatorial province that Trajan placed under direct imperial supervision because its cities had mismanaged their finances. Pliny went out around 110 CE as legatus Augusti with a specific brief to audit and correct. Book 10 shows the machinery in operation: aqueducts abandoned half-built after millions of sesterces had been spent (10.37), a theatre cracking apart at Nicaea (10.39), a city with no fire-fighting equipment at all (10.33). It also shows the limits of local initiative. When Pliny proposes a guild of 150 firefighters, Trajan refuses on the ground that any association, whatever its stated purpose, becomes a political club — hetaeriae — and that this province has already been troubled by factions. The correspondence is the best surviving evidence for how an emperor and a governor actually divided decisions between them.',
    keyFacts: [
      'Bithynia-Pontus: imperial legate Pliny, c. 110–113 CE, sent to fix provincial finances.',
      'Wasted public money on aqueducts (10.37) and a failing theatre at Nicaea (10.39).',
      'Trajan refuses a firefighters’ guild (10.34) because collegia become political clubs.',
      'Roman citizenship for an Egyptian required Alexandrian citizenship first (10.5–10.7).',
      'Trajan’s replies are short and decisive; Pliny’s requests are long and deferential.',
    ],
  },
  {
    id: 'vesuvius',
    topic: 'vesuvius',
    title: 'Vesuvius, 79 CE',
    body:
      'Vesuvius erupted in 79 CE, burying Pompeii under pumice and ash and Herculaneum under pyroclastic flows. Pliny gives the date as nonum Kal. Septembres — 24 August — though some manuscripts and a good deal of archaeological argument point to a later date in the autumn. Pliny the Elder, commanding the fleet at Misenum across the bay, set out first to observe the phenomenon and then, on receiving a message from Rectina, to attempt a rescue; he died at Stabiae, most likely from the fumes. His nephew, then seventeen, stayed at Misenum with his mother and describes the earthquakes, the sea withdrawing from the shore, the descending cloud and the total darkness. The two letters (6.16 and 6.20) were written some twenty-five years later at Tacitus’ request. They are the only surviving eyewitness-derived account of the eruption, and the column shape Pliny compares to an umbrella pine has given its name to the Plinian eruption.',
    keyFacts: [
      '79 CE; Pliny dates it 24 August, though a later autumn date is widely argued.',
      'Pompeii buried by ash and pumice; Herculaneum by pyroclastic flow.',
      'Misenum: fleet base across the Bay of Naples. Stabiae: where Pliny the Elder died.',
      'The eruption column compared to a pinus — hence "Plinian eruption".',
      'Both letters were written c. 106–107 CE, at Tacitus’ request, long after the event.',
      'The younger Pliny’s refusal to abandon his mother deliberately echoes Aeneas and Anchises.',
    ],
  },

  /* ------------------------------------------------------------------ */
  /* Roman history and culture — general background beyond Skill 2.B's   */
  /* required scope, for a course that covers Rome comprehensively.      */
  /* ------------------------------------------------------------------ */

  {
    id: 'founding-legends',
    topic: 'roman-founding',
    title: 'The founding and the kings',
    required: false,
    body:
      'Roman tradition set the city\'s founding at 753 BCE, when Romulus (having killed his twin brother Remus in a dispute over where to build) traced the sacred boundary of the new city on the Palatine Hill. Seven kings followed in the traditional list — Romulus, Numa Pompilius, Tullus Hostilius, Ancus Marcius, and then three Etruscan-linked kings, Tarquinius Priscus, Servius Tullius, and Tarquinius Superbus ("the Proud"). The last was expelled in 509 BCE after his son Sextus raped a noblewoman, Lucretia, whose suicide became the spark for revolution; the consul Lucius Junius Brutus is credited with abolishing the monarchy outright. Whatever the historical reality behind these stories — much of early Rome is legend shaped to explain later institutions — the narrative itself mattered enormously to Romans: it explained why they hated the very word rex ("king") and prized the Republic\'s checks on individual power for the next four and a half centuries.',
    keyFacts: [
      'Traditional founding date: 753 BCE, by Romulus.',
      'Seven kings in the traditional list, ending with Tarquinius Superbus.',
      'The rape of Lucretia is the traditional trigger for the monarchy\'s fall, 509 BCE.',
      'Lucius Junius Brutus is credited as a founder of the Republic.',
      'Roman aversion to the word rex shaped political rhetoric for centuries — a charge later leveled at both Julius Caesar and Augustus.',
    ],
  },
  {
    id: 'struggle-of-the-orders',
    topic: 'early-republic',
    title: 'The early Republic and the Struggle of the Orders',
    required: false,
    body:
      'The new Republic (509 BCE) transferred royal power to two annually elected consuls, checked by mutual veto and a one-year term — a structural fear of any single person holding power too long that runs through the whole of Roman constitutional history. But the Republic was not yet a democracy in any modern sense: political and religious office was restricted to the patrician aristocracy, while the far more numerous plebeians had no formal share in government. Over roughly two centuries (the "Struggle of the Orders," traditionally 494–287 BCE) plebeians won concessions through collective action, most dramatically the secessio plebis — literally walking out of the city and refusing to work or fight until demands were met. Key gains included the tribunate of the plebs (magistrates with the power to veto acts harming plebeians), the Twelve Tables (Rome\'s first published law code, c. 451–450 BCE, ending patrician monopoly on knowing the law), and finally the Lex Hortensia (287 BCE), which made plebiscites binding on all citizens, patrician and plebeian alike.',
    keyFacts: [
      'Republic founded 509 BCE; two consuls replace the king, serving one-year terms.',
      'Struggle of the Orders: plebeians vs. patricians, traditionally 494–287 BCE.',
      'Secessio plebis: the plebeians\' collective-withdrawal protest tactic.',
      'Twelve Tables, c. 451–450 BCE: Rome\'s first published law code.',
      'Lex Hortensia, 287 BCE: plebiscites become binding on the whole state.',
    ],
  },
  {
    id: 'roman-government-overview',
    topic: 'roman-government',
    title: 'Roman government and the cursus honorum',
    required: false,
    body:
      'The Republic\'s government rested on three interlocking parts: annually elected magistrates, the Senate, and the popular assemblies. A Roman political career, the cursus honorum ("course of honors"), moved through a fixed sequence of offices, each with a minimum age and a required interval before seeking the next: quaestor (financial administration), aedile (optional, oversight of public works and games), praetor (judicial authority and military command), and finally consul, the summit of the ordinary career, of which two were elected each year. The Senate, drawn from ex-magistrates and technically only advisory, in practice dominated policy through its immense collective prestige (auctoritas). In genuine emergencies the Republic could appoint a dictator with absolute authority for a strictly limited term of six months — a safety valve designed to prevent exactly the kind of permanent one-man rule the constitution otherwise worked so hard to avoid, and one that Sulla and then Caesar would stretch far past its original intent.',
    keyFacts: [
      'cursus honorum order: quaestor → (aedile) → praetor → consul.',
      'Two consuls each year, holding office jointly and able to veto each other.',
      'The Senate was technically advisory but held immense real authority (auctoritas).',
      'A dictator could be appointed for a maximum of six months in emergencies.',
      'Popular assemblies (comitia) elected magistrates and could pass laws.',
    ],
  },
  {
    id: 'punic-wars-overview',
    topic: 'punic-wars',
    title: 'The Punic Wars',
    required: false,
    body:
      'Three wars against Carthage, the great Phoenician trading power of North Africa, made Rome master of the western Mediterranean. The First Punic War (264–241 BCE) was fought mostly at sea over Sicily and ended in Roman victory despite Rome having had virtually no navy at its outset. The Second Punic War (218–201 BCE) is the most famous: the Carthaginian general Hannibal crossed the Alps with war elephants and inflicted catastrophic defeats on Rome, most devastatingly at Cannae (216 BCE), yet Rome refused to negotiate and eventually carried the war to Africa, where Scipio Africanus defeated Hannibal at Zama (202 BCE). The Third Punic War (149–146 BCE) was one-sided: Rome, driven partly by Cato the Elder\'s relentless insistence ("Carthago delenda est" — "Carthage must be destroyed"), besieged and utterly razed the city, selling its survivors into slavery. The wars left Rome the dominant Mediterranean power, with vast new provinces (Sicily, Sardinia, Spain, Africa) and, less happily, a flood of slave labor and wealth that destabilized the small-farmer economy the Republic\'s institutions had been built around.',
    keyFacts: [
      'First Punic War, 264–241 BCE: fought mainly at sea, over Sicily.',
      'Second Punic War, 218–201 BCE: Hannibal, Cannae (216 BCE), Zama (202 BCE).',
      'Scipio Africanus defeated Hannibal at Zama.',
      'Third Punic War, 149–146 BCE: Carthage destroyed outright.',
      '"Carthago delenda est" — Cato the Elder\'s refrain, famous as a passive periphrastic of obligation.',
    ],
  },
  {
    id: 'late-republic-crisis-overview',
    topic: 'late-republic-crisis',
    title: 'Crisis of the late Republic',
    required: false,
    body:
      'Success abroad strained the Republic at home. Small farmers, ruined by long military service and undercut by slave-worked estates (latifundia) bought up with new wealth, drifted to Rome as an urban poor with no land and, increasingly, no stake in the traditional order. Tiberius Gracchus, tribune in 133 BCE, proposed redistributing public land to the landless — and was clubbed to death by a senatorial mob for it, the Republic\'s first political killing in centuries. His brother Gaius, tribune a decade later, pursued a wider reform program and was likewise driven to death in 121 BCE. The precedent of political violence, once broken, did not heal: Gaius Marius reformed the army by opening recruitment to the landless poor, who now owed loyalty to their general rather than the state, and Lucius Cornelius Sulla marched a Roman army on Rome itself (88 BCE) — the first time that had ever happened — before ruling as dictator and executing opponents by published death-lists (proscriptions). Every element of Caesar\'s later career had already been rehearsed by this generation.',
    keyFacts: [
      'Tiberius Gracchus (tribune, 133 BCE) proposed land redistribution; murdered by senators.',
      'Gaius Gracchus (tribune, 123–121 BCE) extended reform; also killed.',
      'Marius\'s military reforms (armed the landless poor) tied soldiers\' loyalty to their general.',
      'Sulla marched on Rome in 88 BCE — the first Roman general to do so.',
      'Sulla\'s proscriptions: published lists condemning enemies to death and confiscation.',
    ],
  },
  {
    id: 'caesar-civil-war-overview',
    topic: 'caesar-civil-war',
    title: 'Caesar and the collapse of the Republic',
    required: false,
    body:
      'In 60 BCE Julius Caesar, Pompey the Great, and Marcus Crassus formed an informal power-sharing arrangement historians call the First Triumvirate, bypassing normal senatorial politics entirely. Caesar used a ten-year command in Gaul (58–50 BCE) — recorded in his own Commentarii de Bello Gallico — to build an army personally loyal to him and a fortune to match. When the Senate, backed by Pompey, ordered him to disband his army and return to Rome as a private citizen, Caesar instead crossed the Rubicon river into Italy with his troops in January 49 BCE, reportedly declaring "the die is cast" (alea iacta est) — a legal act of war against his own state. Four years of civil war followed; Caesar defeated Pompey\'s forces decisively at Pharsalus (48 BCE) and was eventually declared dictator perpetuo, "dictator for life," in 44 BCE. A conspiracy of senators, including Brutus and Cassius, assassinated him on the Ides of March (15 March) that same year, hoping to restore the old Republic. It did not work: the Republic they were trying to save had already been dead in every way but name for a generation.',
    keyFacts: [
      'First Triumvirate, 60 BCE: Caesar, Pompey, Crassus.',
      'Caesar\'s Gallic command: 58–50 BCE, the basis of his Commentarii.',
      'Crossing the Rubicon, January 49 BCE: "alea iacta est".',
      'Battle of Pharsalus, 48 BCE: Caesar defeats Pompey.',
      'Assassinated on the Ides of March, 44 BCE, having been named dictator perpetuo.',
    ],
  },
  {
    id: 'fall-of-republic-overview',
    topic: 'fall-of-republic',
    title: 'The Second Triumvirate and the end of the Republic',
    required: false,
    body:
      'Caesar\'s assassins had no plan for what came next. Mark Antony (Caesar\'s co-consul), Octavian (Caesar\'s eighteen-year-old great-nephew and posthumously adopted heir), and Lepidus formed the Second Triumvirate in 43 BCE — this time an official, legally sanctioned power-sharing dictatorship, unlike Caesar\'s informal first one — and hunted down Caesar\'s killers, defeating Brutus and Cassius at Philippi (42 BCE). The triumvirate\'s own alliance did not survive contact with ambition: Lepidus was sidelined, and Octavian and Antony divided the Roman world between them, with Antony taking the wealthy East and forming a political and romantic alliance with Cleopatra, the last Ptolemaic queen of Egypt. Octavian, a gifted propagandist, framed the coming war not as a Roman civil war but as a national defense against an Eastern queen scheming to rule Rome through a besotted Antony. Their fleets met at Actium off the coast of Greece in 31 BCE; Octavian\'s admiral Agrippa won decisively, and Antony and Cleopatra fled to Egypt, where both eventually took their own lives the following year. Octavian was now unchallenged master of the entire Roman world.',
    keyFacts: [
      'Second Triumvirate, 43 BCE: Octavian, Antony, Lepidus — legally sanctioned this time.',
      'Battle of Philippi, 42 BCE: defeats Brutus and Cassius.',
      'Antony allies with Cleopatra VII of Egypt.',
      'Battle of Actium, 31 BCE: Octavian (via Agrippa) defeats Antony and Cleopatra.',
      'Antony and Cleopatra die by suicide in Egypt, 30 BCE.',
    ],
  },
  {
    id: 'augustan-settlement',
    topic: 'augustan-reforms',
    title: 'Augustus and the Principate',
    required: false,
    body:
      'Octavian did not repeat Caesar\'s mistake of looking like a king. In 27 BCE he theatrically "restored the Republic," returning his extraordinary powers to the Senate and people — who promptly voted him a vast package of provincial commands and tribunician power anyway, along with a new name, Augustus ("the revered one"). The result, which historians call the Principate, kept the outward forms of the Republic (the Senate still met, consuls were still elected) while concentrating real power permanently in one man styled merely princeps, "first citizen" — a title, not an office, chosen precisely because it carried none of rex\'s poisonous associations. Augustus reigned for over four decades (27 BCE – 14 CE), during which he reformed the army into a standing professional force, rebuilt Rome in marble (his own boast, reported by Suetonius), promoted a program of moral and religious renewal, and sponsored the golden age of Latin literature — Vergil, Horace, Ovid, and Livy all wrote under his long peace, the Pax Romana his settlement inaugurated.',
    keyFacts: [
      '27 BCE: Octavian "restores the Republic" and receives the name Augustus.',
      'princeps ("first citizen") — a title, not a formal office; the basis of "Principate".',
      'Reigned 27 BCE – 14 CE, dying at 75 after naming Tiberius his successor.',
      'Patronized Vergil, Horace, Ovid, and Livy — Rome\'s literary golden age.',
      '"I found Rome a city of brick and left it a city of marble" — reported by Suetonius.',
    ],
  },
  {
    id: 'julio-claudian-overview',
    topic: 'julio-claudians',
    title: 'The Julio-Claudian dynasty',
    required: false,
    body:
      'Augustus\'s successors, bound to him and to each other by blood or adoption into the combined Julian and Claudian families, ruled Rome for another half-century after his death: Tiberius (14–37 CE), an able but reclusive administrator who spent his last years in near-seclusion on Capri; Caligula (37–41 CE), whose brief reign is remembered almost entirely for erratic cruelty, until the Praetorian Guard assassinated him; Claudius (41–54 CE), an unlikely emperor — a scholar with a stammer whom his own family had considered an embarrassment — who proved a competent administrator and completed the conquest of Britain; and Nero (54–68 CE), whose reign ended in the Great Fire of Rome (64 CE, which he was rumored, probably unfairly, to have started), the persecution of the new Christian sect as scapegoats, and finally a revolt of the provincial armies that drove him to suicide. Nero\'s death without an heir plunged Rome into the "Year of the Four Emperors" (69 CE), a brief but violent civil war that ended only when Vespasian, a general with no dynastic claim at all, secured the throne and founded the Flavian dynasty.',
    keyFacts: [
      'Tiberius (14–37 CE), Caligula (37–41 CE), Claudius (41–54 CE), Nero (54–68 CE).',
      'Claudius completed the conquest of Britain (begun 43 CE).',
      'Great Fire of Rome, 64 CE, under Nero.',
      'Nero\'s suicide (68 CE) ended the Julio-Claudian line.',
      '"Year of the Four Emperors," 69 CE, resolved by Vespasian.',
    ],
  },
  {
    id: 'flavian-overview',
    topic: 'flavians',
    title: 'The Flavian dynasty',
    required: false,
    body:
      'Vespasian (69–79 CE) restored stability after the civil war of 69, founded on military competence rather than blood connection to Augustus, and began construction of the Colosseum (the Flavian Amphitheatre) as a public gift to Rome after Nero had claimed vast tracts of the city center for his private Golden House. His son Titus (79–81 CE) completed the Colosseum and presided, in the first year of his own reign, over the eruption of Vesuvius that buried Pompeii and Herculaneum — the disaster the younger Pliny\'s letters describe, written decades later at Tacitus\'s request. Titus also responded personally to a devastating fire in Rome the following year. His brother Domitian (81–96 CE) proved a capable administrator of the frontiers and finances but grew increasingly autocratic and paranoid at home, and was assassinated in a palace conspiracy; the Senate then damned his memory (damnatio memoriae) by ordering his name erased from public monuments. Domitian\'s death ended the Flavian line and opened the era of the "Five Good Emperors," beginning with Nerva and Trajan.',
    keyFacts: [
      'Vespasian (69–79 CE) founded the dynasty and began the Colosseum.',
      'Titus (79–81 CE): Vesuvius erupts in 79 CE, the disaster Pliny\'s letters describe.',
      'Domitian (81–96 CE): capable but autocratic; assassinated, memory officially condemned.',
      'damnatio memoriae: the Senate\'s formal erasure of a disgraced emperor\'s public memory.',
      'Flavian rule (69–96 CE) restored stability after the Julio-Claudians\' collapse.',
    ],
  },
  {
    id: 'roman-religion-overview',
    topic: 'roman-religion',
    title: 'Roman religion',
    required: false,
    body:
      'Roman public religion was fundamentally transactional and civic rather than a matter of personal belief or salvation: the state maintained the pax deorum ("peace of the gods") through correct ritual, and a neglected or botched sacrifice was a practical danger to the whole community, not a private spiritual failing. The Roman pantheon absorbed and equated itself with the Greek one early on (Jupiter/Zeus, Juno/Hera, Neptune/Poseidon, Venus/Aphrodite, Mars/Ares, Minerva/Athena), while retaining distinctly Roman elements: the household gods (Lares and Penates, tended daily at a family shrine, the lararium), the hearth-goddess Vesta whose sacred flame was tended by six Vestal Virgins in Rome\'s only permanent priesthood open to women, and a state priesthood (headed by the pontifex maximus, an office Augustus himself eventually absorbed) that was a normal stage in an aristocrat\'s political career rather than a separate calling. Augury (reading the will of the gods from the flight of birds) and haruspicy (reading it from a sacrificial animal\'s entrails) were standard tools of state decision-making, consulted before elections, laws, and military campaigns alike.',
    keyFacts: [
      'pax deorum: correct ritual maintained the gods\' favor toward the state.',
      'Roman gods equated with Greek counterparts (Jupiter/Zeus, Juno/Hera, etc.).',
      'Vestal Virgins: six priestesses tending Vesta\'s sacred flame, Rome\'s only major female priesthood.',
      'pontifex maximus: head of state religion, a political office (Augustus held it).',
      'Augury and haruspicy: divination from bird-flight and sacrificial entrails, used before major decisions.',
    ],
  },
  {
    id: 'roman-family-overview',
    topic: 'roman-family',
    title: 'The Roman family',
    required: false,
    body:
      'The paterfamilias, the oldest living male ascendant, held sweeping legal authority (patria potestas) over every member of his household — children, grandchildren, and their spouses if married without releasing them from his authority — for as long as he lived, regardless of their own age. This included, in theory, the power of life and death over his children, though by the classical period this was rarely exercised and increasingly restricted by custom and law. Roman marriage for the elite was frequently a matter of family alliance rather than romantic choice, arranged by fathers with an eye to property and political connection; a Roman woman retained her own name and, under the common later form of marriage (sine manu), remained legally part of her birth family rather than her husband\'s, giving elite Roman women more independent control over property than many later legal systems would allow. Children of the elite were typically educated at home by a hired tutor (often an educated Greek slave) before, for boys, moving on to formal training in rhetoric; girls\' formal education usually ended earlier, around the time of marriage, which for elite girls could come as young as twelve to fourteen.',
    keyFacts: [
      'patria potestas: a father\'s legal authority over his household, lasting his whole life.',
      'Roman marriage was usually a family-arranged alliance, not primarily a romantic choice.',
      'sine manu marriage let a woman remain legally part of her birth family.',
      'Elite children were often educated at home by a Greek tutor before further schooling.',
      'Elite girls could be married as young as 12–14, ending their formal education early.',
    ],
  },
  {
    id: 'roman-education-overview',
    topic: 'roman-education',
    title: 'Roman education and the rhetorical tradition',
    required: false,
    body:
      'A well-off Roman boy\'s education moved through three stages: the litterator taught basic reading, writing, and arithmetic from about age seven; the grammaticus, from around twelve, taught Greek and Latin literature (Homer and, later, Vergil became central school texts) along with grammar in the technical sense; and finally, in the mid-to-late teens, the rhetor trained a young man in formal oratory — composing and delivering speeches on set themes, both fictional legal cases (controversiae) and historical or political what-ifs (suasoriae). This training mattered because a Roman aristocrat\'s public career ran through the law courts and the Senate, both arenas of live, unscripted persuasive speech, and Cicero\'s own writings on rhetoric (and his court speeches themselves) became standard school texts in turn. Formal higher education stopped there was no university system as such; a young man seeking further philosophical or rhetorical polish, as Julius Caesar and many others did, typically traveled to Athens, Rhodes, or another Greek center of learning to study directly with a Greek master.',
    keyFacts: [
      'Three-stage education: litterator (basics) → grammaticus (literature) → rhetor (oratory).',
      'controversiae and suasoriae: the two standard rhetorical training-speech types.',
      'Cicero\'s speeches and rhetorical treatises became school texts themselves.',
      'A political career ran through the law courts and Senate — both required strong public speaking.',
      'Advanced students often studied further in Greek centers like Athens or Rhodes.',
    ],
  },
  {
    id: 'roman-slavery-overview',
    topic: 'roman-slavery',
    title: 'Slavery in Rome',
    required: false,
    body:
      'Slavery was fundamental to the Roman economy and household at every social level, from a single domestic slave in a modest home to the thousands worked to death on the slave-staffed plantations (latifundia) that displaced small farmers in the late Republic. Slaves were acquired mainly through war captives, piracy, and birth to an enslaved mother, and had no legal personhood: a slave could be bought, sold, punished, or killed by an owner with little practical restraint until protections slowly expanded under the early emperors. Yet Roman slavery differed sharply from the plantation slavery of the modern Atlantic world in one crucial legal respect: manumission (formal freeing) was common and created a Roman citizen, not merely a free person of restricted status — a freedman (libertus) owed continuing social obligations to his former master (now his patron) but his own children were born fully free citizens with none of those restrictions. Many freedmen achieved real wealth and influence, particularly through commerce and imperial administrative posts (a number of Claudius\'s and Nero\'s most powerful advisors were former slaves), even as slavery itself as an institution was never seriously questioned by any ancient Roman writer who has come down to us.',
    keyFacts: [
      'Slaves were acquired through war, piracy, and birth to an enslaved mother.',
      'A slave had no legal personhood under Roman law.',
      'Manumission was common and created a full Roman citizen (a libertus, freedman).',
      'A freedman\'s own children were born entirely free, without restriction.',
      'Some imperial freedmen (under Claudius and Nero especially) held major administrative power.',
    ],
  },
  {
    id: 'roman-military-overview',
    topic: 'roman-military',
    title: 'The Roman army',
    required: false,
    body:
      'Rome\'s early army was a citizen militia, property-owning men who supplied their own equipment and served only for the duration of a campaign before returning to their farms. Marius\'s reforms (107 BCE) transformed this into a professional standing army open to the landless poor, equipped and paid by the state — and, decisively, dependent on a successful general to secure their discharge bonus of land or money, which tied a soldier\'s ultimate loyalty to his commander rather than the abstract state, a shift with enormous and destabilizing political consequences over the following century. The basic tactical unit was the legion (roughly 4,800–6,000 men under the Principate), subdivided into ten cohorts and further into centuries commanded by centurions, the backbone of the army\'s experienced professional leadership. Under Augustus the army became a permanent standing force of about 28 legions stationed along the frontiers, supplemented by auxiliary units recruited from non-citizen provincials who received citizenship on completing their service — one of the empire\'s most effective long-term tools for spreading Roman identity and loyalty across a vast and diverse territory.',
    keyFacts: [
      'Early Republic: a citizen militia serving only for a campaign\'s duration.',
      'Marius\'s reforms (107 BCE): a professional army open to the landless poor.',
      'Legion: the basic unit, c. 4,800–6,000 men, divided into ten cohorts.',
      'Centurions commanded centuries and formed the army\'s professional backbone.',
      'Auxiliary provincial troops earned citizenship on completing their service.',
    ],
  },
  {
    id: 'roman-law-overview',
    topic: 'roman-law',
    title: 'Roman law',
    required: false,
    body:
      'The Twelve Tables (c. 451–450 BCE) were Rome\'s first attempt to write down and publicly display its laws, ending the patrician priesthood\'s exclusive, unwritten knowledge of legal procedure. From that beginning, Roman law developed over the centuries into one of the most sophisticated and influential legal systems in history, distinguishing between ius civile (law specific to Roman citizens) and ius gentium (a body of law applied to relations involving non-citizens, which Roman jurists increasingly treated as reflecting universal principles of natural justice, ius naturale). Roman jurists — professional legal scholars who wrote opinions and commentaries rather than judging cases themselves — built up an enormous body of legal interpretation that would eventually be codified under the emperor Justinian centuries after the western empire\'s fall, in the Corpus Iuris Civilis; that codification, rediscovered in medieval Europe, became the foundation of the civil-law tradition that still underlies the legal systems of most of continental Europe, Latin America, and beyond, quite apart from the common-law tradition England (and later the United States) developed on its own separate track.',
    keyFacts: [
      'Twelve Tables (c. 451–450 BCE): Rome\'s first published law code.',
      'ius civile: law for citizens. ius gentium: law governing relations with non-citizens.',
      'Roman jurists wrote legal opinions and commentary rather than deciding cases.',
      'Justinian\'s Corpus Iuris Civilis (6th century CE) codified centuries of Roman law.',
      'Roman law underlies the modern civil-law tradition across continental Europe and beyond.',
    ],
  },
  {
    id: 'city-of-rome-overview',
    topic: 'city-of-rome',
    title: 'The city of Rome',
    required: false,
    body:
      'Ancient Rome grew up around the Forum Romanum, the low valley between the Palatine and Capitoline hills that served as the city\'s political, commercial, and religious heart — lined with temples, the Senate house (Curia), and the speaker\'s platform (Rostra, decorated with the prows of captured warships). The seven traditional hills of Rome (Palatine, Capitoline, Aventine, Caelian, Esquiline, Viminal, Quirinal) each carried its own associations: the Palatine held the oldest aristocratic housing and, eventually, the emperors\' own palace complex (the word "palace" itself derives from Palatium); the Capitoline held the Temple of Jupiter Optimus Maximus, the most sacred site in the state religion. By the height of the empire Rome was a genuine metropolis of perhaps a million people, fed by grain shipped from Egypt and North Africa and supplied with water by a network of aqueducts running many miles from mountain springs. Public entertainment venues dominated the cityscape alongside the temples and government buildings: the Circus Maximus for chariot racing, and, from 80 CE, the Flavian Amphitheatre — the Colosseum — for gladiatorial games and staged animal hunts.',
    keyFacts: [
      'The Forum Romanum: political, religious, and commercial center of the city.',
      'Seven traditional hills: Palatine, Capitoline, Aventine, Caelian, Esquiline, Viminal, Quirinal.',
      'Temple of Jupiter Optimus Maximus stood on the Capitoline, the state religion\'s most sacred site.',
      'Rome\'s population reached roughly a million at the empire\'s height.',
      'Circus Maximus (chariot racing) and the Colosseum (opened 80 CE) were the great entertainment venues.',
    ],
  },
  {
    id: 'roman-provinces-overview',
    topic: 'roman-provinces',
    title: 'The Roman provinces',
    required: false,
    body:
      'As Rome expanded beyond Italy, conquered territories were organized as provinciae, each governed by a Roman magistrate (typically a former consul or praetor, styled proconsul or propraetor) who held near-total military and judicial authority within his province for a fixed term, subject to prosecution for extortion or misconduct only after leaving office — a system that put enormous temptation and enormous distance between a governor and any real check on his behavior, notoriously exploited by figures like Verres, whom Cicero prosecuted. Under Augustus, provinces were divided into two categories: "senatorial" provinces, peaceful and settled, governed by proconsuls answering nominally to the Senate; and "imperial" provinces, generally the more militarily sensitive frontier regions (including, in the early second century, Bithynia-Pontus, where the younger Pliny served as the emperor Trajan\'s own special governor), administered by legates answering directly to the emperor. Provincial administration brought Roman law, Latin (in the West) or the continued use of Greek (in the East), infrastructure, and taxation to an enormously diverse set of peoples, and provincial elites who adopted Roman customs and, eventually, citizenship became one of the empire\'s central paths to integration and, occasionally, to the throne itself.',
    keyFacts: [
      'Provinces were governed by proconsuls or propraetors with near-total local authority.',
      'A governor faced prosecution for misconduct only after his term ended.',
      'Augustus split provinces into "senatorial" (settled) and "imperial" (frontier) categories.',
      'Bithynia-Pontus, Pliny the Younger\'s province, was governed as a special imperial post under Trajan.',
      'Provincial elites who Romanized could rise to citizenship and, later, to imperial power itself.',
    ],
  },
  {
    id: 'roman-engineering-overview',
    topic: 'roman-engineering',
    title: 'Roman engineering',
    required: false,
    body:
      'Roman infrastructure was built for permanence and remains, in places, functional two thousand years later. The road network eventually stretched over 250,000 miles, built in layered courses over a compacted foundation and engineered to drain and endure; the saying "all roads lead to Rome" reflects the network\'s literal design, radiating outward from a marker (the Milliarium Aureum, the "Golden Milestone") in the Forum. Aqueducts carried fresh water for many miles from mountain springs to Roman cities using nothing but a precisely calculated, continuous downward gradient — no pumps — sometimes running underground, sometimes carried across valleys on the arched bridges that survive as some of the most recognizable Roman ruins today. Roman concrete (opus caementicium), made with volcanic ash (pozzolana) that reacts chemically with seawater to grow stronger over time rather than eroding, allowed structures like the Pantheon\'s huge unreinforced dome and harbor structures built directly in the sea — engineering feats that were not fully understood or replicated until modern materials science examined the ancient formula itself.',
    keyFacts: [
      'Roman road network: over 250,000 miles at its greatest extent.',
      'Aqueducts moved water purely by gravity, over a precisely engineered gradient.',
      'Roman concrete used volcanic ash (pozzolana) and could set and strengthen underwater.',
      'The Pantheon\'s dome remains the largest unreinforced concrete dome in the world.',
      '"All roads lead to Rome" reflects the network\'s literal design from the Forum outward.',
    ],
  },
  {
    id: 'roman-entertainment-overview',
    topic: 'roman-entertainment',
    title: 'Games and entertainment',
    required: false,
    body:
      'Public spectacle (ludi) was a central feature of Roman civic life, originally tied to religious festivals and increasingly used by politicians and emperors alike to win popular favor — the satirist Juvenal\'s famous jab that the Roman people cared for nothing but panem et circenses, "bread and circuses," captures how central free food and free entertainment had become to keeping the urban masses content. Chariot racing at the Circus Maximus, which could hold over 150,000 spectators, pitted teams identified by color (the Reds, Whites, Greens, and Blues) with a passionate fan following not unlike modern professional sports. Gladiatorial combat, staged in amphitheaters across the empire and most famously at the Colosseum from 80 CE, ranged from trained professional fighters (many enslaved, some free volunteers seeking fame or money) to staged hunts of exotic animals imported from across the empire, and, on rare grand occasions, even mock naval battles (naumachiae) flooded into a specially prepared arena. However brutal these spectacles look in hindsight, they were, to contemporary Romans, a normal and even prestigious form of public life, and sponsoring lavish games was one of the most effective ways an ambitious politician could build popularity with the voting public.',
    keyFacts: [
      'panem et circenses ("bread and circuses") — Juvenal\'s phrase for keeping the masses content.',
      'Circus Maximus: chariot racing, capacity over 150,000, teams identified by color.',
      'The Colosseum (opened 80 CE) hosted gladiatorial combat and staged animal hunts.',
      'naumachiae: staged mock naval battles, held on rare grand occasions.',
      'Sponsoring public games was a standard, prestige-building political strategy.',
    ],
  },
];

export function getContextCard(id: string): ContextCard | undefined {
  return contextCards.find((c) => c.id === id);
}

export const CONTEXT_TOPIC_LABELS: Record<ContextCard['topic'], string> = {
  'vergil-augustan': 'Vergil and Augustan Rome',
  'epic-conventions': 'Epic conventions',
  'trojan-legend': 'The Trojan legend',
  'pliny-world': 'Pliny’s life and world',
  epistolary: 'Roman epistolary conventions',
  'provincial-admin': 'Provincial administration',
  vesuvius: 'Vesuvius 79 CE',
  'roman-founding': 'The founding and the kings',
  'early-republic': 'The early Republic',
  'roman-government': 'Roman government',
  'punic-wars': 'The Punic Wars',
  'late-republic-crisis': 'Crisis of the late Republic',
  'caesar-civil-war': 'Caesar and civil war',
  'fall-of-republic': 'The fall of the Republic',
  'augustan-reforms': 'Augustus and the Principate',
  'julio-claudians': 'The Julio-Claudian dynasty',
  flavians: 'The Flavian dynasty',
  'roman-religion': 'Roman religion',
  'roman-family': 'The Roman family',
  'roman-education': 'Roman education and rhetoric',
  'roman-slavery': 'Slavery in Rome',
  'roman-military': 'The Roman army',
  'roman-law': 'Roman law',
  'city-of-rome': 'The city of Rome',
  'roman-provinces': 'The Roman provinces',
  'roman-engineering': 'Roman engineering',
  'roman-entertainment': 'Games and entertainment',
};
