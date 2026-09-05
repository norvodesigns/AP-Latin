import type { TranslationDrill } from './types';

/**
 * Literal-translation drills shaped like Free-Response Question 2.
 *
 * The CED specifies ~35 words from the Vergil readings or ~40 from the Pliny
 * readings, each scored in 15 segments. Every drill here follows that shape.
 * Latin is reproduced exactly from the passage data; `tags` feed the
 * missed-segment analytics so recurring weaknesses surface on the dashboard.
 */
export const translationDrills: TranslationDrill[] = [
  {
    id: 'td-aen-1-1-7',
    passageId: 'aen-1-1-33',
    citation: 'Aeneid 1.1–7',
    lineRange: [1, 7],
    latin: `Arma virumque canō, Trōiae quī prīmus ab ōrīs
Ītaliam, fātō profugus, Lāvīniaque vēnit
lītora, multum ille et terrīs iactātus et altō
vī superum saevae memorem Iūnōnis ob īram;
multa quoque et bellō passus, dum conderet urbem,
inferretque deōs Latiō, genus unde Latīnum,
Albānīque patrēs, atque altae moenia Rōmae.`,
    modelTranslation:
      'I sing of arms and the man who first came from the shores of Troy to Italy and the Lavinian shores, an exile by fate, he much buffeted both on the lands and on the deep by the violence of the gods above, on account of the unforgetting anger of savage Juno; having suffered much in war also, until he might found a city and bring his gods into Latium — from which came the Latin race, the Alban fathers, and the walls of lofty Rome.',
    notes:
      'The proem is one long periodic sentence. The commonest failure is to translate it as a list of independent clauses instead of tracking qui … venit as the spine.',
    segments: [
      {
        id: 's1', latin: 'Arma virumque canō',
        literal: 'I sing of arms and the man',
        requirement: 'Present tense of canō; both accusative objects rendered.',
        pitfalls: ['"Arms and the man I sing" is fine; "I sang" is not — canō is present.', 'Dropping -que.'],
        tags: ['present-tense', 'accusative-object'],
      },
      {
        id: 's2', latin: 'Trōiae quī prīmus ab ōrīs',
        literal: 'who first from the shores of Troy',
        requirement: 'Trōiae as genitive with ōrīs; prīmus as a nominative adjective agreeing with quī.',
        pitfalls: ['Reading Trōiae as dative.', 'Rendering prīmus adverbially as "at first" rather than "first (to do it)".'],
        tags: ['genitive', 'relative-pronoun', 'adjective-agreement'],
      },
      {
        id: 's3', latin: 'Ītaliam',
        literal: 'to Italy',
        requirement: 'Accusative of place to which, without a preposition (poetic).',
        pitfalls: ['Treating Ītaliam as the direct object of vēnit.'],
        tags: ['accusative-place-to-which'],
      },
      {
        id: 's4', latin: 'fātō profugus',
        literal: 'an exile by fate / a fugitive because of fate',
        requirement: 'fātō as ablative (cause or means); profugus as a nominative adjective describing the man.',
        pitfalls: ['Rendering fātō as "to fate" (dative).', 'Turning profugus into a verb.'],
        tags: ['ablative-cause', 'adjective-agreement'],
      },
      {
        id: 's5', latin: 'Lāvīniaque vēnit lītora',
        literal: 'and came to the Lavinian shores',
        requirement: 'Perfect vēnit; lītora accusative of place to which; Lāvīnia agreeing with lītora.',
        pitfalls: ['Present "comes" for the perfect vēnit.', 'Making lītora the object of vēnit.'],
        tags: ['perfect-tense', 'accusative-place-to-which', 'adjective-agreement'],
      },
      {
        id: 's6', latin: 'multum ille et terrīs iactātus',
        literal: 'he, much buffeted both on the lands',
        requirement: 'iactātus as a perfect passive participle agreeing with ille; multum adverbial.',
        pitfalls: ['Translating iactātus as a finite verb ("he was tossed") — it is a participle here.', 'Missing that et … et means "both … and".'],
        tags: ['perfect-passive-participle', 'ablative-place-where', 'correlative'],
      },
      {
        id: 's7', latin: 'et altō',
        literal: 'and on the deep',
        requirement: 'altō as a substantive ablative, "the deep (sea)".',
        pitfalls: ['Reading altō as an adjective with no noun to modify.'],
        tags: ['substantive-adjective', 'ablative-place-where'],
      },
      {
        id: 's8', latin: 'vī superum',
        literal: 'by the violence of the gods above',
        requirement: 'vī ablative of means/cause; superum as a syncopated genitive plural (= superōrum).',
        pitfalls: ['Reading superum as accusative singular.', 'Missing that vī is from vīs.'],
        tags: ['ablative-means', 'genitive-plural', 'syncope'],
      },
      {
        id: 's9', latin: 'saevae memorem Iūnōnis ob īram',
        literal: 'on account of the unforgetting anger of savage Juno',
        requirement: 'ob + accusative īram; memorem agreeing with īram; saevae with Iūnōnis.',
        pitfalls: ['Attaching memorem to Iūnōnis — it is accusative, agreeing with īram.', 'Ignoring the interlocking word order.'],
        tags: ['preposition-accusative', 'adjective-agreement', 'hyperbaton'],
      },
      {
        id: 's10', latin: 'multa quoque et bellō passus',
        literal: 'having also suffered many things in war as well',
        requirement: 'passus as a deponent perfect participle, active in meaning, with multa as its object.',
        pitfalls: ['Translating passus passively ("having been suffered") — patior is deponent.', 'Missing multa as a neuter plural object.'],
        tags: ['deponent', 'perfect-participle', 'ablative-place-where'],
      },
      {
        id: 's11', latin: 'dum conderet urbem',
        literal: 'until he might found a city',
        requirement: 'dum + imperfect subjunctive expressing anticipation, not simple time.',
        pitfalls: ['"while he was founding" — the subjunctive marks purpose/anticipation, so "until he could found".'],
        tags: ['dum-clause', 'imperfect-subjunctive'],
      },
      {
        id: 's12', latin: 'inferretque deōs Latiō',
        literal: 'and might bring his gods into Latium',
        requirement: 'Second verb of the dum clause, still subjunctive; Latiō as dative or locatival ablative.',
        pitfalls: ['Losing the subjunctive.', 'Reading deōs as the subject.'],
        tags: ['imperfect-subjunctive', 'dative', 'compound-verb'],
      },
      {
        id: 's13', latin: 'genus unde Latīnum',
        literal: 'from which (came) the Latin race',
        requirement: 'unde as a relative adverb; the verb is understood.',
        pitfalls: ['Failing to supply a verb.', 'Reading unde as interrogative "whence?".'],
        tags: ['relative-adverb', 'ellipsis'],
      },
      {
        id: 's14', latin: 'Albānīque patrēs',
        literal: 'and the Alban fathers',
        requirement: 'Nominative plural continuing the same understood verb.',
        pitfalls: ['Changing case: patrēs here is nominative, not accusative.'],
        tags: ['nominative-plural', 'ellipsis'],
      },
      {
        id: 's15', latin: 'atque altae moenia Rōmae',
        literal: 'and the walls of lofty Rome',
        requirement: 'altae as genitive agreeing with Rōmae, not with moenia.',
        pitfalls: ['Attaching altae to moenia ("high walls") — moenia is neuter plural, altae is genitive singular.'],
        tags: ['genitive', 'adjective-agreement', 'hyperbaton'],
      },
    ],
  },

  {
    id: 'td-aen-6-847-853',
    passageId: 'aen-6-847-853',
    citation: 'Aeneid 6.847–853',
    lineRange: [847, 853],
    latin: `excudent alii spirantia mollius aera
(credo equidem), vivos ducent de marmore vultus,
orabunt causas melius, caelique meatus
describent radio et surgentia sidera dicent:
tu regere imperio populos, Romane, memento
(hae tibi erunt artes), pacique imponere morem,
parcere subiectis et debellare superbos.`,
    modelTranslation:
      'Others will hammer out breathing bronzes more softly (I for my part believe it), they will draw living faces out of marble, they will plead cases better, and they will trace the movements of the sky with the rod and tell of the rising stars: you, Roman, remember to rule the peoples with your power — these will be your arts — and to impose the custom upon peace, to spare the conquered and to war down the proud.',
    notes:
      'The four infinitives after memento (regere, imponere, parcere, debellare) are the backbone of the passage. Losing any one of them costs a segment.',
    segments: [
      {
        id: 's1', latin: 'excudent alii',
        literal: 'others will hammer out',
        requirement: 'Future tense; alii as the subject, "others (than you)".',
        pitfalls: ['Present "others hammer out" for the future.', 'Reading alii as "the others" in a way that loses the Greeks/Romans contrast.'],
        tags: ['future-tense', 'nominative-plural'],
      },
      {
        id: 's2', latin: 'spirantia mollius aera',
        literal: 'bronzes breathing more softly',
        requirement: 'aera as neuter accusative plural; spirantia agreeing with it; mollius as a comparative adverb.',
        pitfalls: ['Reading aera as feminine singular.', 'Taking mollius as an adjective with aera rather than an adverb with spirantia.'],
        tags: ['present-participle', 'neuter-plural', 'comparative-adverb'],
      },
      {
        id: 's3', latin: '(credo equidem)',
        literal: '(I for my part believe it)',
        requirement: 'First person present; equidem as an emphasising particle.',
        pitfalls: ['Dropping equidem entirely.'],
        tags: ['present-tense', 'parenthesis'],
      },
      {
        id: 's4', latin: 'vivos ducent de marmore vultus',
        literal: 'they will draw living faces out of marble',
        requirement: 'Future ducent; de + ablative; vivos agreeing with vultus.',
        pitfalls: ['"lead" for ducent — here it is "draw out, mould".', 'Attaching vivos to marmore.'],
        tags: ['future-tense', 'preposition-ablative', 'adjective-agreement', 'hyperbaton'],
      },
      {
        id: 's5', latin: 'orabunt causas melius',
        literal: 'they will plead cases better',
        requirement: 'Future; causas as the object; melius comparative adverb.',
        pitfalls: ['"pray" for orabunt — with causas it is the legal sense, "plead".'],
        tags: ['future-tense', 'comparative-adverb', 'idiom'],
      },
      {
        id: 's6', latin: 'caelique meatus describent radio',
        literal: 'and will trace the movements of the sky with the rod',
        requirement: 'caeli genitive; radio ablative of means.',
        pitfalls: ['Reading radio as dative.', 'Missing that meatus is accusative plural (fourth declension).'],
        tags: ['genitive', 'ablative-means', 'fourth-declension'],
      },
      {
        id: 's7', latin: 'et surgentia sidera dicent',
        literal: 'and will tell of the rising stars',
        requirement: 'surgentia as a present participle agreeing with sidera.',
        pitfalls: ['Turning surgentia into a finite verb.'],
        tags: ['present-participle', 'neuter-plural', 'future-tense'],
      },
      {
        id: 's8', latin: 'tu regere imperio populos',
        literal: 'you, to rule the peoples with power',
        requirement: 'regere as an infinitive depending on memento; imperio ablative of means; emphatic tu.',
        pitfalls: ['Reading regere as a passive infinitive or as an imperative.', 'Losing the emphatic tu.'],
        tags: ['infinitive', 'ablative-means', 'emphatic-pronoun'],
      },
      {
        id: 's9', latin: 'Romane',
        literal: 'O Roman',
        requirement: 'Vocative singular.',
        pitfalls: ['Rendering as nominative "the Roman" — it is direct address.'],
        tags: ['vocative'],
      },
      {
        id: 's10', latin: 'memento',
        literal: 'remember',
        requirement: 'Future imperative of memini, governing the infinitives.',
        pitfalls: ['Translating as an indicative "you remember".', 'Missing that it governs all four infinitives.'],
        tags: ['imperative', 'defective-verb'],
      },
      {
        id: 's11', latin: '(hae tibi erunt artes)',
        literal: '(these will be your arts)',
        requirement: 'tibi as dative of possession or reference; future erunt.',
        pitfalls: ['"to you" left unidiomatic where "your" is meant.', 'Present "are" for erunt.'],
        tags: ['dative-possession', 'future-tense'],
      },
      {
        id: 's12', latin: 'pacique imponere morem',
        literal: 'and to impose the custom upon peace',
        requirement: 'Second infinitive after memento; paci dative with the compound verb impono.',
        pitfalls: ['Reversing it to "impose peace upon custom".', 'Missing the dative with a compound verb.'],
        tags: ['infinitive', 'dative-compound-verb'],
      },
      {
        id: 's13', latin: 'parcere subiectis',
        literal: 'to spare the conquered',
        requirement: 'Third infinitive; subiectis dative plural (parco takes the dative), used substantively.',
        pitfalls: ['Reading subiectis as ablative.', 'Missing that parco governs the dative.'],
        tags: ['infinitive', 'dative-special-verb', 'substantive-participle'],
      },
      {
        id: 's14', latin: 'et debellare',
        literal: 'and to war down / to subdue completely',
        requirement: 'Fourth infinitive; the de- prefix carries "utterly".',
        pitfalls: ['Rendering simply as "to fight", losing the force of the prefix.'],
        tags: ['infinitive', 'compound-verb'],
      },
      {
        id: 's15', latin: 'superbos',
        literal: 'the proud',
        requirement: 'Accusative plural adjective used as a substantive.',
        pitfalls: ['Leaving it as an adjective with no noun.'],
        tags: ['substantive-adjective', 'accusative-plural'],
      },
    ],
  },

  {
    id: 'td-aen-4-333-339',
    passageId: 'aen-4-305-361',
    citation: 'Aeneid 4.333–339',
    lineRange: [333, 339],
    latin: `tandem pauca refert: 'ego te, quae plurima fando
enumerare vales, numquam, regina, negabo
promeritam, nec me meminisse pigebit Elissae
dum memor ipse mei, dum spiritus hos regit artus.
pro re pauca loquar. neque ego hanc abscondere furto
speravi (ne finge) fugam, nec coniugis umquam
praetendi taedas aut haec in foedera veni.`,
    modelTranslation:
      'At last he replies a few things: "I shall never deny, O queen, that you have deserved well (of me) in the very many things which you are able to recount in speaking, nor will it irk me to remember Elissa so long as I myself am mindful of myself, so long as breath governs these limbs. I shall say a few things on behalf of the matter. I did not hope to conceal this flight by stealth — do not imagine it — nor did I ever hold out a husband\'s torches or come into these compacts."',
    notes:
      'The indirect statement te … promeritam (esse) is the hardest thing here: the participle is doing the work of a whole clause after negabo.',
    segments: [
      {
        id: 's1', latin: 'tandem pauca refert',
        literal: 'at last he replies a few things',
        requirement: 'Present tense; pauca as a neuter plural object.',
        pitfalls: ['Rendering refert as "it matters" — that is a different verb.'],
        tags: ['present-tense', 'neuter-plural'],
      },
      {
        id: 's2', latin: 'ego te',
        literal: 'I … that you',
        requirement: 'te as the accusative subject of the indirect statement completed by promeritam.',
        pitfalls: ['Reading te as the direct object of negabo ("I will deny you").'],
        tags: ['indirect-statement', 'accusative-subject', 'emphatic-pronoun'],
      },
      {
        id: 's3', latin: 'quae plurima',
        literal: 'which very many things',
        requirement: 'Relative pronoun, neuter plural; plurima superlative.',
        pitfalls: ['Reading quae as feminine nominative referring to Dido.'],
        tags: ['relative-pronoun', 'superlative', 'neuter-plural'],
      },
      {
        id: 's4', latin: 'fando enumerare vales',
        literal: 'you are able to recount in speaking',
        requirement: 'fando as an ablative gerund; enumerare complementary infinitive with vales.',
        pitfalls: ['Reading fando as a participle "speaking".', 'Missing that valeo + infinitive means "be able".'],
        tags: ['gerund', 'ablative-gerund', 'complementary-infinitive'],
      },
      {
        id: 's5', latin: 'numquam, regina, negabo',
        literal: 'never, O queen, shall I deny',
        requirement: 'Future negabo; regina vocative.',
        pitfalls: ['Present "I deny".', 'Reading regina as nominative.'],
        tags: ['future-tense', 'vocative'],
      },
      {
        id: 's6', latin: 'promeritam',
        literal: '(that you) have deserved well',
        requirement: 'Perfect participle agreeing with te, completing the indirect statement with esse understood.',
        pitfalls: ['Leaving it untranslated.', 'Failing to supply "that you have…" — the whole indirect statement hangs on this word.'],
        tags: ['indirect-statement', 'perfect-participle', 'ellipsis'],
      },
      {
        id: 's7', latin: 'nec me meminisse pigebit Elissae',
        literal: 'nor will it irk me to remember Elissa',
        requirement: 'Impersonal pigebit with me accusative; meminisse governing the genitive Elissae.',
        pitfalls: ['Making me the subject ("nor shall I be ashamed").', 'Missing that memini takes the genitive.'],
        tags: ['impersonal-verb', 'accusative-object', 'genitive-with-verb', 'future-tense'],
      },
      {
        id: 's8', latin: 'dum memor ipse mei',
        literal: 'so long as I myself am mindful of myself',
        requirement: 'Verb sum understood; memor governing the genitive mei; ipse intensive.',
        pitfalls: ['Failing to supply "am".', 'Reading mei as "my".'],
        tags: ['dum-clause', 'ellipsis', 'genitive-with-adjective', 'intensive-pronoun'],
      },
      {
        id: 's9', latin: 'dum spiritus hos regit artus',
        literal: 'so long as breath governs these limbs',
        requirement: 'dum + present indicative for a contemporaneous action; hos agreeing with artus.',
        pitfalls: ['Reading artus as an adjective.', 'Making spiritus the object.'],
        tags: ['dum-clause', 'present-indicative', 'fourth-declension'],
      },
      {
        id: 's10', latin: 'pro re pauca loquar',
        literal: 'I shall say a few things on behalf of the matter',
        requirement: 'loquar future of a deponent; pro + ablative.',
        pitfalls: ['Reading loquar as a subjunctive.', 'Translating the deponent passively.'],
        tags: ['deponent', 'future-tense', 'preposition-ablative'],
      },
      {
        id: 's11', latin: 'neque ego hanc abscondere furto',
        literal: 'nor (did I hope) to conceal this by stealth',
        requirement: 'hanc looks forward to fugam three words later; furto is an ablative of means.',
        pitfalls: ['Failing to connect hanc with fugam across the intervening words.', 'Reading furto as dative, or as "theft" rather than "by stealth".'],
        tags: ['adjective-agreement', 'hyperbaton', 'ablative-means'],
      },
      {
        id: 's12', latin: 'speravi',
        literal: 'did I hope',
        requirement: 'Perfect tense, governing the infinitive abscondere.',
        pitfalls: ['Present "I hope" for the perfect speravi.'],
        tags: ['perfect-tense', 'complementary-infinitive'],
      },
      {
        id: 's13', latin: '(ne finge) fugam',
        literal: '(do not imagine it) - this flight',
        requirement: 'ne + present imperative as a poetic prohibition; fugam completes hanc from segment 11.',
        pitfalls: ['Rendering ne finge as a statement.', 'Leaving fugam unattached to hanc.'],
        tags: ['negative-command', 'imperative', 'hyperbaton'],
      },
      {
        id: 's14', latin: 'nec coniugis umquam praetendi taedas',
        literal: 'nor did I ever hold out a husband’s torches',
        requirement: 'Perfect praetendi; coniugis genitive; taedas accusative plural.',
        pitfalls: ['Reading praetendi as a passive infinitive.', 'Missing the reference to the wedding torch ceremony.'],
        tags: ['perfect-tense', 'genitive', 'cultural-reference'],
      },
      {
        id: 's15', latin: 'aut haec in foedera veni',
        literal: 'or come into these compacts',
        requirement: 'Perfect veni; in + accusative of motion; haec agreeing with foedera.',
        pitfalls: ['Present "I come".', 'Reading in foedera as ablative "in these treaties".'],
        tags: ['perfect-tense', 'preposition-accusative', 'neuter-plural'],
      },
    ],
  },

  {
    id: 'td-pliny-6-16-4',
    passageId: 'pliny-6-16-a',
    citation: 'Pliny, Letters 6.16.4–5',
    lineRange: [4, 5],
    latin: `Erat Miseni classemque imperio praesens regebat. Nonum Kal. Septembres hora fere septima mater mea indicat ei apparere nubem inusitata et magnitudine et specie. Usus ille sole, mox frigida, gustaverat iacens studebatque; poscit soleas, ascendit locum ex quo maxime miraculum illud conspici poterat.`,
    modelTranslation:
      'He was at Misenum and was commanding the fleet in person with full authority. On the ninth day before the Kalends of September, at about the seventh hour, my mother points out to him that a cloud was appearing, unusual in both size and appearance. He, having taken a sunbath and then a cold bath, had eaten a snack lying down and was studying; he calls for his sandals and climbs to a place from which that marvel could best be seen.',
    notes:
      'Watch the tense sequence: Pliny slides between imperfect (regebat, studebat), historic present (indicat, poscit, ascendit) and pluperfect (gustaverat). A literal translation must keep them distinct.',
    segments: [
      {
        id: 's1', latin: 'Erat Miseni',
        literal: 'He was at Misenum',
        requirement: 'Miseni as locative; imperfect erat.',
        pitfalls: ['Reading Miseni as genitive "of Misenum".', 'Present "he is".'],
        tags: ['locative', 'imperfect-tense'],
      },
      {
        id: 's2', latin: 'classemque imperio praesens regebat',
        literal: 'and was commanding the fleet in person with authority',
        requirement: 'praesens as a nominative participle/adjective with the subject; imperio ablative.',
        pitfalls: ['Attaching praesens to classem.', 'Losing the durative force of the imperfect.'],
        tags: ['imperfect-tense', 'ablative-means', 'adjective-agreement'],
      },
      {
        id: 's3', latin: 'Nonum Kal. Septembres',
        literal: 'on the ninth day before the Kalends of September (24 August)',
        requirement: 'Accusative of time; recognition of the Roman dating formula.',
        pitfalls: ['Translating word-for-word as "the ninth Kalends" without understanding the inclusive counting.'],
        tags: ['accusative-time', 'cultural-reference'],
      },
      {
        id: 's4', latin: 'hora fere septima',
        literal: 'at about the seventh hour',
        requirement: 'Ablative of time when; fere adverbial.',
        pitfalls: ['Reading hora as nominative.', 'Dropping fere.'],
        tags: ['ablative-time'],
      },
      {
        id: 's5', latin: 'mater mea indicat ei',
        literal: 'my mother points out to him',
        requirement: 'Historic present indicat; ei dative indirect object.',
        pitfalls: ['Rendering as past when the Latin is present — acceptable in idiomatic English, but a literal translation should keep the present.'],
        tags: ['historic-present', 'dative-indirect-object'],
      },
      {
        id: 's6', latin: 'apparere nubem',
        literal: 'that a cloud was appearing',
        requirement: 'Indirect statement after indicat: nubem accusative subject, apparere infinitive.',
        pitfalls: ['Reading nubem as the object of indicat ("points out a cloud") — the infinitive makes it indirect statement.'],
        tags: ['indirect-statement', 'accusative-subject', 'present-infinitive'],
      },
      {
        id: 's7', latin: 'inusitata et magnitudine et specie',
        literal: 'unusual in both size and appearance',
        requirement: 'Ablatives of respect/description; et … et correlative; inusitata agreeing with both.',
        pitfalls: ['Reading the ablatives as means.', 'Missing "both … and".'],
        tags: ['ablative-respect', 'correlative', 'adjective-agreement'],
      },
      {
        id: 's8', latin: 'Usus ille sole',
        literal: 'He, having made use of the sun',
        requirement: 'usus as a deponent perfect participle (active in meaning) governing the ablative sole.',
        pitfalls: ['Translating usus passively.', 'Missing that utor takes the ablative.'],
        tags: ['deponent', 'perfect-participle', 'ablative-with-verb'],
      },
      {
        id: 's9', latin: 'mox frigida',
        literal: 'then a cold bath',
        requirement: 'frigida ablative, with aqua understood; still governed by usus.',
        pitfalls: ['Leaving frigida as a bare adjective.', 'Failing to supply "bath"/"water".'],
        tags: ['ellipsis', 'ablative-with-verb', 'substantive-adjective'],
      },
      {
        id: 's10', latin: 'gustaverat iacens',
        literal: 'had taken a snack lying down',
        requirement: 'Pluperfect gustaverat; iacens present participle.',
        pitfalls: ['Rendering the pluperfect as a simple perfect.', 'Turning iacens into a finite verb.'],
        tags: ['pluperfect-tense', 'present-participle'],
      },
      {
        id: 's11', latin: 'studebatque',
        literal: 'and was studying',
        requirement: 'Imperfect, distinct from the preceding pluperfect.',
        pitfalls: ['Flattening it into the same tense as gustaverat.'],
        tags: ['imperfect-tense'],
      },
      {
        id: 's12', latin: 'poscit soleas',
        literal: 'he calls for his sandals',
        requirement: 'Historic present; soleas accusative plural.',
        pitfalls: ['Rendering poscit as "puts on".'],
        tags: ['historic-present', 'accusative-object'],
      },
      {
        id: 's13', latin: 'ascendit locum',
        literal: 'he climbs to a place',
        requirement: 'locum accusative with a verb of motion.',
        pitfalls: ['Reading ascendit as perfect — the context is a run of historic presents.'],
        tags: ['historic-present', 'accusative-place-to-which'],
      },
      {
        id: 's14', latin: 'ex quo',
        literal: 'from which',
        requirement: 'Relative pronoun with ex + ablative, referring to locum.',
        pitfalls: ['Reading quo as an interrogative or as dative.'],
        tags: ['relative-pronoun', 'preposition-ablative'],
      },
      {
        id: 's15', latin: 'maxime miraculum illud conspici poterat',
        literal: 'that marvel could best be seen',
        requirement: 'Passive infinitive conspici with poterat; maxime superlative adverb.',
        pitfalls: ['Translating conspici as active ("could see").', 'Missing that miraculum is the subject of the passive.'],
        tags: ['passive-infinitive', 'imperfect-tense', 'superlative-adverb'],
      },
    ],
  },

  {
    id: 'td-pliny-7-27-5',
    passageId: 'pliny-7-27-a',
    citation: 'Pliny, Letters 7.27.5',
    lineRange: [5, 5],
    latin: `Erat Athenis spatiosa et capax domus sed infamis et pestilens. Per silentium noctis sonus ferri, et si attenderes acrius, strepitus vinculorum longius primo, deinde e proximo reddebatur: mox apparebat idolon, senex macie et squalore confectus, promissa barba horrenti capillo; cruribus compedes, manibus catenas gerebat quatiebatque.`,
    modelTranslation:
      'There was at Athens a roomy and spacious house, but ill-famed and unhealthy. Through the silence of the night a sound of iron, and if you listened more keenly, a clanking of chains, was heard — at first further off, then from close at hand. Soon a phantom would appear: an old man worn out by emaciation and squalor, with a long beard and bristling hair; he wore fetters on his legs and chains on his hands, and kept shaking them.',
    notes:
      'The imperfects here are iterative — this happened again and again, not once. English "would appear" or "used to appear" captures it; a simple past loses the point of the ghost story.',
    segments: [
      {
        id: 's1', latin: 'Erat Athenis',
        literal: 'There was at Athens',
        requirement: 'Athenis as locative plural.',
        pitfalls: ['Reading Athenis as ablative of means or dative.'],
        tags: ['locative', 'imperfect-tense'],
      },
      {
        id: 's2', latin: 'spatiosa et capax domus',
        literal: 'a roomy and spacious house',
        requirement: 'Both adjectives agreeing with the feminine domus.',
        pitfalls: ['Treating domus as masculine.', 'Rendering capax as "capable".'],
        tags: ['adjective-agreement', 'fourth-declension'],
      },
      {
        id: 's3', latin: 'sed infamis et pestilens',
        literal: 'but ill-famed and unhealthy',
        requirement: 'Third-declension adjectives still agreeing with domus.',
        pitfalls: ['Rendering pestilens as "pestilent" without conveying "unhealthy, accursed".'],
        tags: ['adjective-agreement'],
      },
      {
        id: 's4', latin: 'Per silentium noctis',
        literal: 'through the silence of the night',
        requirement: 'per + accusative; noctis genitive.',
        pitfalls: ['Reading noctis as nominative or ablative.'],
        tags: ['preposition-accusative', 'genitive'],
      },
      {
        id: 's5', latin: 'sonus ferri',
        literal: 'a sound of iron',
        requirement: 'ferri as the genitive of ferrum, not the infinitive of fero.',
        pitfalls: ['Reading ferri as the passive infinitive "to be carried" — a classic trap.'],
        tags: ['genitive', 'homograph-trap'],
      },
      {
        id: 's6', latin: 'et si attenderes acrius',
        literal: 'and if you listened more keenly',
        requirement: 'Imperfect subjunctive in a generalising second-person condition; acrius comparative adverb.',
        pitfalls: ['Rendering as a contrary-to-fact condition.', 'Missing the indefinite "you".'],
        tags: ['conditional', 'imperfect-subjunctive', 'comparative-adverb'],
      },
      {
        id: 's7', latin: 'strepitus vinculorum',
        literal: 'a clanking of chains',
        requirement: 'strepitus nominative fourth declension; vinculorum genitive plural.',
        pitfalls: ['Reading strepitus as a participle.', 'Treating it as accusative.'],
        tags: ['fourth-declension', 'genitive-plural'],
      },
      {
        id: 's8', latin: 'longius primo, deinde e proximo',
        literal: 'at first further off, then from close at hand',
        requirement: 'Comparative adverb longius; primo adverbial; e + ablative.',
        pitfalls: ['Reading primo as an adjective.', 'Losing the sense of the sound approaching.'],
        tags: ['comparative-adverb', 'preposition-ablative', 'adverb'],
      },
      {
        id: 's9', latin: 'reddebatur',
        literal: 'was returned / kept being heard',
        requirement: 'Imperfect passive, iterative in force.',
        pitfalls: ['Translating actively.', 'Simple past, losing the repetition.'],
        tags: ['imperfect-passive', 'iterative'],
      },
      {
        id: 's10', latin: 'mox apparebat idolon',
        literal: 'soon a phantom would appear',
        requirement: 'Imperfect, iterative; idolon a Greek neuter noun as subject.',
        pitfalls: ['One-off "appeared" instead of the repeated action.'],
        tags: ['imperfect-tense', 'iterative', 'greek-noun'],
      },
      {
        id: 's11', latin: 'senex macie et squalore confectus',
        literal: 'an old man worn out by emaciation and squalor',
        requirement: 'confectus perfect passive participle with two ablatives of means.',
        pitfalls: ['Reading the ablatives as respect.', 'Making confectus a finite verb.'],
        tags: ['perfect-passive-participle', 'ablative-means', 'apposition'],
      },
      {
        id: 's12', latin: 'promissa barba',
        literal: 'with a long/flowing beard',
        requirement: 'Ablative of description/quality.',
        pitfalls: ['Rendering promissa as "promised".', 'Reading it as an ablative absolute.'],
        tags: ['ablative-description', 'perfect-participle'],
      },
      {
        id: 's13', latin: 'horrenti capillo',
        literal: 'with bristling hair',
        requirement: 'Second ablative of description; horrenti a present participle.',
        pitfalls: ['Reading horrenti as dative.'],
        tags: ['ablative-description', 'present-participle'],
      },
      {
        id: 's14', latin: 'cruribus compedes, manibus catenas',
        literal: 'fetters on his legs, chains on his hands',
        requirement: 'cruribus and manibus as datives/ablatives of place; compedes and catenas accusative objects; chiastic arrangement.',
        pitfalls: ['Reversing which restraint goes with which limb.', 'Missing the chiasmus.'],
        tags: ['ablative-place-where', 'accusative-object', 'chiasmus'],
      },
      {
        id: 's15', latin: 'gerebat quatiebatque',
        literal: 'he was wearing and kept shaking (them)',
        requirement: 'Two imperfects sharing the objects above.',
        pitfalls: ['Supplying only one verb.', 'Losing the iterative force.'],
        tags: ['imperfect-tense', 'iterative', 'zeugma'],
      },
    ],
  },

  {
    id: 'td-aen-1-94-101',
    passageId: 'aen-1-88-107',
    citation: 'Aeneid 1.94–101',
    lineRange: [94, 101],
    latin: `O terque quaterque beati,
quis ante ora patrum Troiae sub moenibus altis
contigit oppetere! O Danaum fortissime gentis
Tydide! Mene Iliacis occumbere campis
non potuisse, tuaque animam hanc effundere dextra,
saevus ubi Aeacidae telo iacet Hector, ubi ingens
Sarpedon, ubi tot Simois correpta sub undis
scuta virum galeasque et fortia corpora volvit?`,
    modelTranslation:
      'O three and four times blessed, you to whom it happened to die before the faces of your fathers beneath the high walls of Troy! O Tydides, bravest of the race of the Greeks! That I could not have fallen on the plains of Troy, and poured out this life of mine by your right hand — where fierce Hector lies by the weapon of the grandson of Aeacus, where huge Sarpedon lies, where the Simois rolls along under its waves so many shields and helmets of men, and strong bodies!',
    notes:
      'Aeneas\'s first words in the poem: a storm-tossed hero wishing he had died gloriously at Troy instead. mene … non potuisse is an exclamatory infinitive construction — no finite verb at all, just an accusative subject and an infinitive expressing disbelief/regret.',
    segments: [
      {
        id: 's1', latin: 'O terque quaterque beati',
        literal: 'O three and four times blessed',
        requirement: 'beati as a vocative plural adjective; terque quaterque as a fixed intensifying pair.',
        pitfalls: ['Treating terque quaterque as a literal count rather than "many times over".'],
        tags: ['vocative', 'adjective-agreement'],
      },
      {
        id: 's2', latin: 'quis ante ora patrum',
        literal: 'you to whom, before the faces of your fathers',
        requirement: 'quis as dative plural (an archaic/poetic form of quibus), the antecedent of the vocative beati.',
        pitfalls: ['Reading quis as the interrogative "who?" rather than the relative/dative "to whom".'],
        tags: ['dative', 'relative-pronoun'],
      },
      {
        id: 's3', latin: 'Troiae sub moenibus altis',
        literal: 'beneath the high walls of Troy',
        requirement: 'Troiae genitive with moenibus; sub + ablative of place where.',
        pitfalls: ['Reading Troiae as dative.'],
        tags: ['genitive', 'ablative-place-where', 'preposition-ablative'],
      },
      {
        id: 's4', latin: 'contigit oppetere',
        literal: 'it happened to die',
        requirement: 'contigit impersonal + complementary infinitive oppetere, with quis (dative) as the person affected.',
        pitfalls: ['Treating contigit as a personal verb with a stated subject.'],
        tags: ['impersonal-verb', 'infinitive'],
      },
      {
        id: 's5', latin: 'O Danaum fortissime gentis',
        literal: 'O bravest of the race of the Greeks',
        requirement: 'fortissime vocative superlative; Danaum a syncopated genitive plural (= Danaōrum) with gentis.',
        pitfalls: ['Missing the syncope and reading Danaum as accusative singular.'],
        tags: ['vocative', 'superlative', 'genitive-plural', 'syncope'],
      },
      {
        id: 's6', latin: 'Tydide',
        literal: 'son of Tydeus',
        requirement: 'A patronymic vocative addressing Diomedes.',
        pitfalls: ['Missing that a patronymic in -ides/-ide names someone by their father, not by their own name.'],
        tags: ['vocative', 'patronymic'],
      },
      {
        id: 's7', latin: 'Mene Iliacis occumbere campis',
        literal: 'that I [could] not fall on the plains of Troy',
        requirement: 'Mene = mē + -ne, accusative subject of the infinitive occumbere in an exclamatory infinitive clause.',
        pitfalls: ['Reading -ne as a real yes/no question rather than an exclamation of disbelief.'],
        tags: ['exclamatory-infinitive', 'accusative-subject'],
      },
      {
        id: 's8', latin: 'non potuisse',
        literal: 'was not able',
        requirement: 'A second infinitive parallel to occumbere, completing the exclamatory clause begun by Mene.',
        pitfalls: ['Supplying a finite verb instead of keeping the infinitive construction.'],
        tags: ['exclamatory-infinitive', 'perfect-infinitive'],
      },
      {
        id: 's9', latin: 'tuaque animam hanc effundere dextra',
        literal: 'and to pour out this life of mine by your right hand',
        requirement: 'A third parallel infinitive (effundere); dextra ablative of means/instrument.',
        pitfalls: ['Attaching tua to animam instead of dextra — word order is interlocked (hyperbaton).'],
        tags: ['exclamatory-infinitive', 'ablative-means', 'hyperbaton'],
      },
      {
        id: 's10', latin: 'saevus ubi Aeacidae telo iacet Hector',
        literal: 'where fierce Hector lies by the weapon of the grandson of Aeacus',
        requirement: 'ubi as a relative adverb of place; Aeacidae genitive (patronymic for Achilles) with telo ablative of means.',
        pitfalls: ['Missing that Aeacidae refers to Achilles, not to Hector himself.'],
        tags: ['relative-adverb', 'genitive', 'ablative-means', 'patronymic'],
      },
      {
        id: 's11', latin: 'ubi ingens Sarpedon',
        literal: 'where huge Sarpedon [lies]',
        requirement: 'A second ubi clause with the verb iacet understood from the previous clause.',
        pitfalls: ['Failing to supply the understood verb.'],
        tags: ['relative-adverb', 'ellipsis'],
      },
      {
        id: 's12', latin: 'ubi tot Simois correpta sub undis',
        literal: 'where the Simois, having swept [them] up under its waves',
        requirement: 'Simois as the subject (a river-god/river name); correpta a perfect passive participle modifying the objects in the next segment.',
        pitfalls: ['Making Simois agree with correpta — correpta is neuter plural, agreeing with scuta/corpora ahead, not with the masculine river-name Simois.'],
        tags: ['perfect-passive-participle', 'ablative-place-where'],
      },
      {
        id: 's13', latin: 'scuta virum galeasque',
        literal: 'shields and helmets of men',
        requirement: 'virum a syncopated genitive plural (= virōrum) with both scuta and galeas.',
        pitfalls: ['Missing the syncope.'],
        tags: ['genitive-plural', 'syncope'],
      },
      {
        id: 's14', latin: 'et fortia corpora',
        literal: 'and strong bodies',
        requirement: 'A third object continuing the list governed by volvit.',
        pitfalls: ['Losing track of the verb this whole list depends on.'],
        tags: ['accusative-object'],
      },
      {
        id: 's15', latin: 'volvit',
        literal: 'rolls (them) along',
        requirement: 'The main verb governing scuta, galeas, and corpora — all objects of this single verb at the very end of the sentence.',
        pitfalls: ['Missing that the verb comes last and governs everything listed before it.'],
        tags: ['present-tense', 'accusative-object'],
      },
    ],
  },

  {
    id: 'td-aen-4-74-83',
    passageId: 'aen-4-74-89',
    citation: 'Aeneid 4.74–83',
    lineRange: [74, 83],
    latin: `nunc media Aenean secum per moenia ducit
Sidoniasque ostentat opes urbemque paratam,
incipit effari mediaque in voce resistit;
nunc eadem labente die convivia quaerit,
Iliacosque iterum demens audire labores
exposcit pendetque iterum narrantis ab ore.
post ubi digressi, lumenque obscura vicissim
luna premit suadentque cadentia sidera somnos,
sola domo maeret vacua stratisque relictis
incubat.`,
    modelTranslation:
      'Now she leads Aeneas with her through the middle of the city walls and shows him her Sidonian wealth and the city she has prepared, and begins to speak and stops in the middle of her words; now, as the day fades, she seeks the same banquet again, and, mad, begs again to hear the Trojan sufferings, and hangs again on the lips of the one telling them. Afterward, when they have parted, and the dimming moon in turn sinks its light and the setting stars urge sleep, alone she grieves in the empty house and lies on the couch he has left.',
    notes:
      'The passage moves from Dido\'s public display of her city to her private collapse into obsession — note how the towers-stop-rising image later in the passage makes her private disorder a public, political one.',
    segments: [
      {
        id: 's1', latin: 'nunc media Aenean secum',
        literal: 'now [she leads] Aeneas with her, through the middle',
        requirement: 'Aenean a Greek-declension accusative singular (not Latin -um); secum = cum + sē.',
        pitfalls: ['Failing to recognise the Greek accusative ending -an.'],
        tags: ['greek-declension', 'accusative-object', 'enclitic'],
      },
      {
        id: 's2', latin: 'per moenia ducit',
        literal: 'she leads [him] through the walls/city',
        requirement: 'Present tense ducit; per + accusative moenia.',
        pitfalls: ['Switching to past tense — the whole passage is vivid historic present.'],
        tags: ['present-tense', 'preposition-accusative'],
      },
      {
        id: 's3', latin: 'Sidoniasque ostentat opes urbemque paratam',
        literal: 'and shows [him] Sidonian wealth and the prepared city',
        requirement: 'Two accusative objects (opes, urbem) of ostentat; paratam a perfect passive participle agreeing with urbem.',
        pitfalls: ['Missing that paratam modifies urbem, not opes.'],
        tags: ['accusative-object', 'perfect-passive-participle', 'adjective-agreement'],
      },
      {
        id: 's4', latin: 'incipit effari',
        literal: 'she begins to speak',
        requirement: 'incipit + complementary infinitive effari (a deponent verb).',
        pitfalls: ['Missing that effari is deponent — active in meaning despite its passive-looking form.'],
        tags: ['complementary-infinitive', 'deponent'],
      },
      {
        id: 's5', latin: 'mediaque in voce resistit',
        literal: 'and stops in the middle of [her] speech',
        requirement: 'in + ablative voce; media agreeing with voce.',
        pitfalls: ['Reading media as modifying an unstated noun rather than voce.'],
        tags: ['ablative-place-where', 'adjective-agreement'],
      },
      {
        id: 's6', latin: 'nunc eadem labente die convivia quaerit',
        literal: 'now, as the day slips away, she seeks the same banquets',
        requirement: 'labente die an ablative absolute; eadem agreeing with convivia (neuter plural).',
        pitfalls: ['Treating eadem as feminine singular nominative rather than neuter plural accusative.'],
        tags: ['ablative-absolute', 'adjective-agreement', 'accusative-object'],
      },
      {
        id: 's7', latin: 'Iliacosque iterum demens audire labores',
        literal: 'and, mad, [begs] again to hear the Trojan sufferings',
        requirement: 'demens a nominative adjective describing Dido; labores the object of the infinitive audire.',
        pitfalls: ['Missing the hyperbaton separating Iliacos from labores.'],
        tags: ['hyperbaton', 'infinitive', 'accusative-object'],
      },
      {
        id: 's8', latin: 'exposcit',
        literal: 'she demands/begs earnestly',
        requirement: 'The main verb governing the infinitive audire from the previous segment.',
        pitfalls: ['Losing track of which verb governs audire.'],
        tags: ['present-tense'],
      },
      {
        id: 's9', latin: 'pendetque iterum narrantis ab ore',
        literal: 'and hangs again from the lips of the one telling [it]',
        requirement: 'narrantis a genitive present participle used substantively ("of the one narrating"), with ore.',
        pitfalls: ['Treating narrantis as agreeing with ore rather than functioning as its own noun-equivalent.'],
        tags: ['present-participle', 'genitive', 'ablative-place-where'],
      },
      {
        id: 's10', latin: 'post ubi digressi',
        literal: 'afterward, when they have parted',
        requirement: 'digressi a perfect deponent participle (from digredior) with an understood sunt/erant and an understood subject (the guests).',
        pitfalls: ['Reading digressi as passive in sense — digredior is deponent.'],
        tags: ['deponent', 'perfect-participle', 'temporal-clause'],
      },
      {
        id: 's11', latin: 'lumenque obscura vicissim luna premit',
        literal: 'and the dimming moon in turn suppresses its light',
        requirement: 'obscura agreeing with luna, not lumen; lumen as the accusative object of premit.',
        pitfalls: ['Attaching obscura to lumen instead of luna — another interlocked (hyperbaton) word order.'],
        tags: ['hyperbaton', 'accusative-object', 'adjective-agreement'],
      },
      {
        id: 's12', latin: 'suadentque cadentia sidera somnos',
        literal: 'and the falling/setting stars urge sleep',
        requirement: 'cadentia a present participle agreeing with sidera; somnos accusative object of suadent.',
        pitfalls: ['Reading somnos as nominative plural rather than accusative.'],
        tags: ['present-participle', 'accusative-object'],
      },
      {
        id: 's13', latin: 'sola domo maeret vacua',
        literal: 'alone she grieves in the empty house',
        requirement: 'domo ablative of place where (no preposition, poetic); vacua agreeing with domo.',
        pitfalls: ['Missing the ablative-without-preposition and supplying "of the house" instead.'],
        tags: ['ablative-place-where', 'adjective-agreement'],
      },
      {
        id: 's14', latin: 'stratisque relictis',
        literal: 'and on the abandoned bedding/couch',
        requirement: 'stratis ablative (place where, or accompanying incubat); relictis a perfect passive participle agreeing with it.',
        pitfalls: ['Treating this as a separate ablative absolute rather than a phrase completing incubat.'],
        tags: ['ablative-place-where', 'perfect-passive-participle'],
      },
      {
        id: 's15', latin: 'incubat',
        literal: 'she lies brooding',
        requirement: 'The main verb of the whole final clause, governing both sola domo maeret vacua and stratisque relictis in sense.',
        pitfalls: ['Missing that this single verb, held back to the very end of the sentence, is what the whole build-up has been waiting for.'],
        tags: ['present-tense'],
      },
    ],
  },

  {
    id: 'td-pliny-6-20-a',
    passageId: 'pliny-6-20-a',
    citation: 'Letters 6.20.5',
    lineRange: [5, 5],
    latin: `Dubito, constantiam vocare an imprudentiam debeam — agebam enim duodevicensimum annum -: posco librum Titi Livi, et quasi per otium lego atque etiam ut coeperam excerpo. Ecce amicus avunculi qui nuper ad eum ex Hispania venerat, ut me et matrem sedentes, me vero etiam legentem videt, illius patientiam securitatem meam corripit. Nihilo segnius ego intentus in librum.`,
    modelTranslation:
      'I am uncertain whether I should call it steadiness or foolishness — for I was in my eighteenth year: I ask for a volume of Livy, and read as if at leisure, and even go on making extracts as I had begun. Look — a friend of my uncle\'s, who had recently come to him from Spain, when he sees me and my mother sitting there, and me even reading, rebukes her patience and my unconcern. I go on nonetheless, absorbed in my book.',
    notes:
      'The seventeen-year-old Pliny\'s calm under the collapsing city is the letter\'s most celebrated detail — as much a piece of self-presentation to Tacitus\'s later readership as a report of fact.',
    segments: [
      {
        id: 's1', latin: 'Dubito, constantiam vocare an imprudentiam debeam',
        literal: 'I am uncertain whether I should call it steadiness or foolishness',
        requirement: 'An indirect question (utrum/an-type, here with an alone) after dubito, with debeam as the subjunctive verb.',
        pitfalls: ['Missing that this whole clause is an indirect question, not two separate statements.'],
        tags: ['indirect-question', 'subjunctive'],
      },
      {
        id: 's2', latin: 'agebam enim duodevicensimum annum',
        literal: 'for I was [living/passing] my eighteenth year',
        requirement: 'ago + a year-number as a Roman idiom for stating one\'s age.',
        pitfalls: ['Translating agebam as a generic "I was doing" without the idiomatic sense of age.'],
        tags: ['idiom', 'imperfect-tense'],
      },
      {
        id: 's3', latin: 'posco librum Titi Livi',
        literal: 'I demand/ask for a book of Titus Livius',
        requirement: 'Titi Livi as a genitive of the author\'s full name.',
        pitfalls: ['Treating Titi Livi as two separate objects rather than one genitive name.'],
        tags: ['genitive', 'present-tense'],
      },
      {
        id: 's4', latin: 'et quasi per otium lego',
        literal: 'and I read as if at leisure',
        requirement: 'quasi + per otium as a set comparative phrase.',
        pitfalls: ['Reading quasi as introducing an unreal condition here rather than a comparison.'],
        tags: ['present-tense', 'preposition-accusative'],
      },
      {
        id: 's5', latin: 'atque etiam ut coeperam excerpo',
        literal: 'and even make excerpts as I had begun [to do]',
        requirement: 'ut + pluperfect coeperam, "as/just as I had begun"; excerpo present tense.',
        pitfalls: ['Missing that ut here means "as", not "in order that".'],
        tags: ['pluperfect-tense', 'present-tense'],
      },
      {
        id: 's6', latin: 'Ecce amicus avunculi',
        literal: 'Behold, a friend of my uncle',
        requirement: 'ecce as an interjection drawing attention to what follows; avunculi genitive.',
        pitfalls: ['Treating ecce as part of the grammar of the sentence rather than an interjection.'],
        tags: ['genitive', 'interjection'],
      },
      {
        id: 's7', latin: 'qui nuper ad eum ex Hispania venerat',
        literal: 'who had recently come to him from Spain',
        requirement: 'A relative clause with pluperfect indicative venerat (simple fact, not characteristic).',
        pitfalls: ['Rendering venerat as simple past "came" rather than pluperfect "had come".'],
        tags: ['relative-pronoun', 'pluperfect-tense'],
      },
      {
        id: 's8', latin: 'ut me et matrem sedentes',
        literal: 'when/as [he sees] me and my mother sitting',
        requirement: 'ut here temporal ("when"); sedentes a present participle agreeing with me et matrem.',
        pitfalls: ['Confusing this temporal ut with a purpose or result ut.'],
        tags: ['temporal-clause', 'present-participle'],
      },
      {
        id: 's9', latin: 'me vero etiam legentem videt',
        literal: 'and indeed sees me even reading',
        requirement: 'videt the main verb governing this whole ut-clause\'s participial constructions; legentem a present participle agreeing with me.',
        pitfalls: ['Missing that videt is the delayed main verb for the whole ut clause begun two segments earlier.'],
        tags: ['present-participle', 'present-tense'],
      },
      {
        id: 's10', latin: 'illius patientiam',
        literal: 'her patience',
        requirement: 'illius genitive singular (referring to the mother), with patientiam as one of two accusative objects of corripit.',
        pitfalls: ['Reading illius as nominative.'],
        tags: ['genitive', 'accusative-object'],
      },
      {
        id: 's11', latin: 'securitatem meam',
        literal: 'my unconcern',
        requirement: 'A second accusative object of corripit, parallel to illius patientiam.',
        pitfalls: ['Missing the parallel structure with the previous segment.'],
        tags: ['accusative-object', 'adjective-agreement'],
      },
      {
        id: 's12', latin: 'corripit',
        literal: 'he rebukes/scolds',
        requirement: 'The main verb governing both patientiam and securitatem as its objects.',
        pitfalls: ['Supplying two separate verbs instead of one verb with two objects.'],
        tags: ['present-tense', 'accusative-object'],
      },
      {
        id: 's13', latin: 'Nihilo segnius',
        literal: 'none the less / no more slowly for that',
        requirement: 'Nihilo an ablative of degree of difference with the comparative segnius.',
        pitfalls: ['Missing the ablative-of-degree-of-difference construction with a comparative adverb.'],
        tags: ['ablative-degree-of-difference', 'comparative'],
      },
      {
        id: 's14', latin: 'ego intentus',
        literal: 'I, intent/absorbed',
        requirement: 'intentus a perfect passive participle used adjectivally, agreeing with the understood subject ego.',
        pitfalls: ['Translating intentus as a finite verb rather than a descriptive participle.'],
        tags: ['perfect-passive-participle', 'adjective-agreement'],
      },
      {
        id: 's15', latin: 'in librum',
        literal: 'on/in [my] book',
        requirement: 'in + accusative with intentus, "intent upon" — a fixed idiom, not ordinary motion-into.',
        pitfalls: ['Treating in librum as literal motion "into the book".'],
        tags: ['preposition-accusative', 'idiom'],
      },
    ],
  },
];

export function getDrill(id: string): TranslationDrill | undefined {
  return translationDrills.find((d) => d.id === id);
}

export function drillsForPassage(passageId: string): TranslationDrill[] {
  return translationDrills.filter((d) => d.passageId === passageId);
}
