import type { Passage } from '../types';

/**
 * Caesar's De Bello Gallico — not on the required syllabus (which is fixed
 * to Vergil and Pliny), but slotted into Unit 1, "Teacher's Choice — Latin
 * Prose", exactly the CED-sanctioned home for supplementary reading beyond
 * the two required authors. Latin reproduced verbatim from The Latin
 * Library's public-domain text; unmacronized, like the source.
 */
export const caesarPassages: Passage[] = [
  {
    id: 'caesar-bg-1-1',
    author: 'caesar',
    genre: 'prose',
    work: 'De Bello Gallico',
    book: 1,
    citation: `De Bello Gallico 1.1`,
    title: `The Three Parts of Gaul`,
    required: false,
    cedReading: null,
    unit: '1',
    macronized: false,
    wordCount: 178,
    themes: [`Gaul`, `ethnography`, `geography`, `Roman conquest`],
    summary: `Caesar opens his commentary with a geographic and ethnographic survey: Gaul is divided into three parts, inhabited respectively by the Belgae, the Aquitani, and the Celts (called Galli by the Romans), each differing in language, institutions, and law. Three rivers mark the boundaries between them. The Belgae are judged the bravest, because they are farthest from the civilizing (and, in Caesar's telling, softening) influence of the Roman province and are in constant contact and conflict with the Germans across the Rhine — the same proximity to Germanic warfare that makes the Helvetii the most warlike of the Gauls proper. The chapter closes by locating each of the three regions relative to the Rhone, the Rhine, the Pyrenees, and the Ocean.`,
    context: `NOT on the official 2025 CED required reading list — the syllabus is fixed to Vergil and Pliny — but placed here in Unit 1 ("Teacher's Choice — Latin Prose") because no other opening of a Latin prose work is better known or more often excerpted for beginning students. Caesar wrote his own military and political record in the third person, styling it commentarii ("notes, memoranda") rather than history proper — a pose of plain, unadorned factual reporting that is itself a rhetorical choice, not a neutral one. The ethnographic framing here (praising the Belgae and Helvetii for their remoteness from "civilizing" contact) also does real political work: it justifies the nine-year war of conquest that follows as a response to a genuinely dangerous frontier, not naked expansion.`,
    lines: [
      { n: 1, latin: `Gallia est omnis divisa in partes tres, quarum unam incolunt Belgae, aliam Aquitani, tertiam qui ipsorum lingua Celtae, nostra Galli appellantur.` },
      { n: 2, latin: `Hi omnes lingua, institutis, legibus inter se differunt.` },
      { n: 3, latin: `Gallos ab Aquitanis Garumna flumen, a Belgis Matrona et Sequana dividit.` },
      { n: 4, latin: `Horum omnium fortissimi sunt Belgae, propterea quod a cultu atque humanitate provinciae longissime absunt, minimeque ad eos mercatores saepe commeant atque ea quae ad effeminandos animos pertinent important, proximique sunt Germanis, qui trans Rhenum incolunt, quibuscum continenter bellum gerunt.` },
      { n: 5, latin: `Qua de causa Helvetii quoque reliquos Gallos virtute praecedunt, quod fere cotidianis proeliis cum Germanis contendunt, cum aut suis finibus eos prohibent aut ipsi in eorum finibus bellum gerunt.` },
      { n: 6, latin: `Eorum una pars, quam Gallos obtinere dictum est, initium capit a flumine Rhodano, continetur Garumna flumine, Oceano, finibus Belgarum, attingit etiam ab Sequanis et Helvetiis flumen Rhenum, vergit ad septentriones.` },
      { n: 7, latin: `Belgae ab extremis Galliae finibus oriuntur, pertinent ad inferiorem partem fluminis Rheni, spectant in septentrionem et orientem solem.` },
      { n: 8, latin: `Aquitania a Garumna flumine ad Pyrenaeos montes et eam partem Oceani quae est ad Hispaniam pertinet; spectat inter occasum solis et septentriones.` },
    ],
  },
];
