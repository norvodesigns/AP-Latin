import type { Passage } from '../types';

/**
 * Catullus — not on the required syllabus (fixed to Vergil and Pliny), but
 * slotted into Unit 6, "Course Project and Teacher's Choice Poetry", the
 * CED-sanctioned home for supplementary poetry beyond the two required
 * authors. Latin reproduced verbatim from The Latin Library's public-domain
 * text; unmacronized, like the source. Written in hendecasyllabic metre, NOT
 * dactylic hexameter — this app's Scansion Lab is built specifically around
 * the Aeneid's hexameter and does not (yet) cover this metre, so no scansion
 * is offered for it here.
 */
export const catullusPassages: Passage[] = [
  {
    id: 'catullus-5',
    author: 'catullus',
    genre: 'poetry',
    work: 'Carmina',
    book: 1,
    citation: `Catullus 5`,
    title: `Let Us Live and Love`,
    required: false,
    cedReading: null,
    unit: '6',
    macronized: false,
    wordCount: 66,
    themes: [`carpe diem`, `love`, `mortality`, `kisses`, `defying gossip`],
    summary: `Catullus urges Lesbia to live and love with him, and to value the disapproving gossip of stern old men at only a single penny. The sun can set and rise again, but once their own brief light sets, humans face one unending night of sleep. He asks her for a thousand kisses, then a hundred, then another thousand, then a second hundred — on and on in a deliberately uncountable heap — so that once they have made many thousands together, they can mix the count up and lose track, so that neither they themselves nor any envious enemy who learns the true number can put the evil eye on so many kisses.`,
    context: `NOT on the official 2025 CED required reading list — the syllabus is fixed to Vergil and Pliny — but placed here in Unit 6 ("Course Project and Teacher's Choice Poetry") as one of the most famous and most frequently taught short poems in the entire Latin corpus. Written in hendecasyllabic metre (eleven syllables per line), not the Aeneid's dactylic hexameter, so it is not included in the Scansion Lab, which is built specifically around hexameter. The poem's closing image — deliberately losing count of the kisses — plays on a real Roman superstition: naming an exact large number let an envious enemy cast the evil eye (invidere) on exactly what you had, so the lovers scramble the sum on purpose.`,
    lines: [
      { n: 1, latin: `Vivamus mea Lesbia, atque amemus,` },
      { n: 2, latin: `rumoresque senum severiorum` },
      { n: 3, latin: `omnes unius aestimemus assis!` },
      { n: 4, latin: `soles occidere et redire possunt:` },
      { n: 5, latin: `nobis cum semel occidit brevis lux,` },
      { n: 6, latin: `nox est perpetua una dormienda.` },
      { n: 7, latin: `da mi basia mille, deinde centum,` },
      { n: 8, latin: `dein mille altera, dein secunda centum,` },
      { n: 9, latin: `deinde usque altera mille, deinde centum.` },
      { n: 10, latin: `dein, cum milia multa fecerimus,` },
      { n: 11, latin: `conturbabimus illa, ne sciamus,` },
      { n: 12, latin: `aut ne quis malus invidere possit,` },
      { n: 13, latin: `cum tantum sciat esse basiorum.` },
    ],
  },
];
