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
};
