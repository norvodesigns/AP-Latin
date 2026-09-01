import type { FrqPrompt, RubricRow } from './types';

/**
 * Free-response prompts and the official CED rubric shapes.
 *
 * Point totals come from the Scoring Guidelines in the CED (Effective Fall 2025):
 *   FRQ 1 Short Answer ............ 8 points
 *   FRQ 2 Translation ............. 15 points (15 segments — see translation.ts)
 *   FRQ 3 Short Essay ............. 8 points
 *   FRQ 4 Project Prose Essay ..... 11 points
 *   FRQ 5 Project Poetry Essay .... 11 points
 * Course Project checkpoints: Checkpoint 1 = 2 points, Checkpoint 2 = 3 points.
 */

/* ------------------------------------------------------------------ */
/* Shared rubric definitions                                           */
/* ------------------------------------------------------------------ */

/** FRQ 3 — Short Essay (8 points). */
export const SHORT_ESSAY_RUBRIC: RubricRow[] = [
  {
    id: 'r1',
    label: 'Part A (i) — Comprehension',
    maxPoints: 1,
    criteria: 'Displays an adequate comprehension of the passage or the relevant part of it.',
    decisionRules: [
      'No point for restating the prompt.',
      'No point for an inaccurate or incomplete comprehension.',
      'The answer must actually identify what the prompt asks about.',
    ],
  },
  {
    id: 'r2',
    label: 'Part A (ii) — Provide Latin',
    maxPoints: 1,
    criteria: 'Provides Latin that adequately supports the answer to part A (i).',
    decisionRules: [
      'No point for providing no Latin.',
      'No point for Latin that only partially supports the answer.',
      'The Latin must come from the passage supplied.',
    ],
  },
  {
    id: 'r3',
    label: 'Part A (iii) — Translate in context',
    maxPoints: 1,
    criteria: 'Accurately translates in context the Latin cited in part A (ii).',
    decisionRules: [
      'The translation must match the Latin actually cited.',
      'A paraphrase that loses the grammar does not earn the point.',
    ],
  },
  {
    id: 'r4',
    label: 'Part B — Interpretation',
    maxPoints: 1,
    criteria: 'Presents an interpretation that responds directly to the prompt.',
    decisionRules: [
      'The interpretation must respond to the prompt, not to the passage in general.',
      'It need not be sophisticated, but it must be defensible.',
    ],
  },
  {
    id: 'r5',
    label: 'Part B — Latin citation',
    maxPoints: 2,
    criteria:
      'Provides adequate Latin citation(s) from the provided text to support the response.',
    decisionRules: [
      '0 points: cites no Latin, or the citation shows no understanding of it.',
      '1 point: one adequate citation, more substantive than a single word taken out of context.',
      '2 points: two adequate citations that show accurate understanding.',
    ],
  },
  {
    id: 'r6',
    label: 'Part B — Explanation',
    maxPoints: 2,
    criteria: 'Explains how the cited Latin supports the interpretation.',
    decisionRules: [
      '0 points: no explanation, or the explanation does not address the prompt.',
      '1 point: adequately explains how one citation relates to the prompt.',
      '2 points: adequately explains how both citations relate to the prompt.',
      'An explanation still earns the point if it relates the Latin to the prompt but not to the interpretation.',
    ],
  },
];

/** FRQ 4 and 5 — Project Passage Short Essay (11 points each). */
export const PROJECT_ESSAY_RUBRIC: RubricRow[] = [
  {
    id: 'p1',
    label: 'Part A — Summary sentence',
    maxPoints: 1,
    criteria: 'Provides a summary sentence that accurately identifies what the passage as a whole is about.',
    decisionRules: [
      'No point for summarising only part of the passage.',
      'Factual details (names) must be accurate; harmless misspellings are acceptable.',
      'Where the passage makes an argument, a reasonable interpretation of its aim earns the point.',
    ],
  },
  {
    id: 'p2',
    label: 'Part A — Summary of the beginning',
    maxPoints: 1,
    criteria: 'Provides an accurate and complete summary of the beginning (first third) of the passage.',
    decisionRules: [
      'An incomplete summary leaves out a significant part; minor details need not appear.',
      'Summary sections need not be a single sentence.',
      'The thirds need not divide the passage evenly.',
    ],
  },
  {
    id: 'p3',
    label: 'Part A — Summary of the middle',
    maxPoints: 1,
    criteria: 'Provides an accurate and complete summary of the middle of the passage.',
    decisionRules: ['Same standard as the beginning: accurate and not missing a significant part.'],
  },
  {
    id: 'p4',
    label: 'Part A — Summary of the end',
    maxPoints: 1,
    criteria: 'Provides an accurate and complete summary of the end of the passage.',
    decisionRules: ['Same standard as the beginning and middle.'],
  },
  {
    id: 'p5',
    label: 'Part B — Interpretation',
    maxPoints: 1,
    criteria: 'Presents an interpretation that responds directly to the prompt.',
    decisionRules: ['The interpretation must answer the prompt, not summarise the passage again.'],
  },
  {
    id: 'p6',
    label: 'Part B — Latin citation and explanation: first example',
    maxPoints: 2,
    criteria:
      'Provides one adequate Latin citation from the provided text AND explains how it relates to the prompt.',
    decisionRules: [
      '0 points: no citation, or a citation showing no or complete misunderstanding of the Latin.',
      '1 point: an accurate citation more substantive than a single word — but no adequate explanation.',
      '2 points: an accurate, substantive citation AND an adequate explanation of how it relates to the prompt.',
    ],
  },
  {
    id: 'p7',
    label: 'Part B — Latin citation and explanation: second example',
    maxPoints: 2,
    criteria: 'As row 6, for a second distinct citation, beyond what earned points in row 6.',
    decisionRules: [
      'The second citation must be distinct from the first.',
      'Same 0/1/2 standard as the first example.',
    ],
  },
  {
    id: 'p8',
    label: 'Part B — Contextual or stylistic information',
    maxPoints: 2,
    criteria:
      'Includes contextual or stylistic information relevant to the passage AND explains how it relates to the prompt.',
    decisionRules: [
      '0 points: none included, or what is included is inaccurate or irrelevant.',
      '1 point: accurate, relevant contextual or stylistic information, but no explanation of its relevance to the prompt.',
      '2 points: accurate, relevant information AND an explanation of how it relates to the prompt.',
    ],
  },
];

/** FRQ 1 — Short Answer (8 points across 6–8 subquestions). */
export const SHORT_ANSWER_RUBRIC: RubricRow[] = [
  {
    id: 'sa',
    label: 'Subquestions (8 points in total)',
    maxPoints: 8,
    criteria:
      'Each subquestion is scored independently for accuracy against what it asks: comprehension, translation, scansion, a stylistic feature, or a point of context.',
    decisionRules: [
      'Answer only what is asked — extra material is not credited and can contradict a correct answer.',
      'Where Latin is requested, quote Latin; where English is requested, answer in English.',
      'A translation subquestion is scored for accounting for every word, as in FRQ 2.',
    ],
  },
];

export const CHECKPOINT_1_RUBRIC: RubricRow[] = [
  {
    id: 'c1',
    label: 'Course Project Checkpoint 1 — Summary',
    maxPoints: 2,
    criteria: 'An accurate and complete summary of one course project passage.',
    decisionRules: [
      'Must accurately identify what the passage as a whole is about.',
      'Must cover the passage completely, not just its opening.',
    ],
  },
];

export const CHECKPOINT_2_RUBRIC: RubricRow[] = [
  {
    id: 'c2',
    label: 'Course Project Checkpoint 2 — Interpretation with evidence',
    maxPoints: 3,
    criteria:
      'An interpretation of a course project passage, supported by accurately cited Latin, with an explanation of how the Latin supports it.',
    decisionRules: [
      'The interpretation should address one of the Skill 3.A learning objectives.',
      'The Latin citation must be accurate and more than a single word out of context.',
      'The explanation must connect the Latin to the interpretation.',
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Prompts                                                             */
/* ------------------------------------------------------------------ */

export const frqPrompts: FrqPrompt[] = [
  {
    id: 'frq1-aen-4-333',
    type: 'short-answer',
    title: 'Short Answer — Aeneas answers Dido',
    passageId: 'aen-4-305-361',
    citation: 'Aeneid 4.333–339',
    minutes: 15,
    subquestions: [
      { id: 'a', label: 'a', prompt: 'Translate lines 333–335 (ego te … promeritam) as literally as possible.', points: 2 },
      { id: 'b', label: 'b', prompt: 'Identify the case and use of Elissae (line 335).', points: 1 },
      { id: 'c', label: 'c', prompt: 'Scan line 336 (dum memor ipse mei …), marking the feet.', points: 1 },
      { id: 'd', label: 'd', prompt: 'Identify one stylistic device in line 336 and describe its effect.', points: 1 },
      { id: 'e', label: 'e', prompt: 'What does Aeneas deny in lines 337–339? Answer in English.', points: 1 },
      { id: 'f', label: 'f', prompt: 'Explain the cultural significance of coniugis … taedas (lines 338–339).', points: 1 },
      { id: 'g', label: 'g', prompt: 'Cite the Latin that shows Aeneas is speaking briefly and deliberately.', points: 1 },
    ],
    rubric: SHORT_ANSWER_RUBRIC,
    sampleResponse: `a. "I shall never deny, O queen, that you have deserved well of me in the very many things which you are able to recount in speaking."
b. Genitive singular, governed by meminisse — memini takes the genitive of the person remembered.
c. dum mem- | or ip- | se me- | i, dum | spiritus | hos regit | artus — dactyl, spondee, spondee, spondee, dactyl, spondee (the fifth foot dactyl and sixth-foot spondee are regular).
d. Anaphora: dum … dum, repeating the conjunction at the start of both clauses. It binds the two conditions into a single vow and gives the line the rhythm of an oath.
e. He denies that he hoped to conceal his departure by stealth, that he ever held out a husband's marriage torches, or that he entered into a marriage compact.
f. The taedae were the torches carried in a Roman wedding procession; holding them out is a metonymy for contracting a lawful marriage. Aeneas is making the legal point that no marriage ever took place — answering Dido's coniugium at 4.172.
g. pro re pauca loquar (line 337) — and tandem pauca refert (line 333).`,
    scoringNotes:
      'Answer only what each subquestion asks. On (a) every word must be accounted for; on (b) both case AND use are needed for the point.',
  },

  {
    id: 'frq3-pliny-6-16-11',
    type: 'short-essay',
    title: 'Short Essay — the death of Pliny the Elder',
    passageId: 'pliny-6-16-b',
    citation: 'Pliny, Letters 6.16.19–20',
    minutes: 25,
    subquestions: [
      {
        id: 'a-i',
        label: 'A (i)',
        prompt: 'Identify how Pliny the Elder behaves as the danger increases.',
        points: 1,
      },
      {
        id: 'a-ii',
        label: 'A (ii)',
        prompt: 'Provide the Latin word(s) that support your answer in part (i).',
        points: 1,
      },
      {
        id: 'a-iii',
        label: 'A (iii)',
        prompt: 'Translate in context the Latin word(s) you cited in part (ii).',
        points: 1,
      },
      {
        id: 'b',
        label: 'B',
        prompt:
          'Explain how Pliny presents his uncle’s death as a Roman death of the highest kind. Your response should be 3 to 4 complete sentences. Respond with an interpretation; include at least one specific Latin citation from the passage (provide the Latin and/or cite section numbers, and translate or accurately paraphrase it); refer to more than a single word; and explain how the Latin supports your response.',
        points: 5,
      },
    ],
    rubric: SHORT_ESSAY_RUBRIC,
    sampleResponse: `A (i) He behaves with deliberate calm, treating the eruption as if it were an ordinary evening — bathing, dining and sleeping.
A (ii) "recubans postquam aquam frigidam poposcit hausitque" and "quiescebat certe altissimo somno"
A (iii) "reclining, after he asked for cold water and drank it"; "he was certainly resting in the deepest sleep."

B. Pliny constructs his uncle's death as an exemplary Roman death by making composure, not survival, the measure of the man. The detail that he lay down and "aquam frigidam poposcit hausitque" places an ordinary act of the dinner table in the middle of a catastrophe, and the deliberateness of poposcit — he demands it, he is not given it — keeps him an agent rather than a victim to the last. Pliny reinforces this by insisting on the reality of the sleep, "quiescebat certe altissimo somno", where certe answers an objection the reader might raise, that the calm was only a performance. This belongs to the Roman tradition in which a good death is judged by bearing rather than outcome, and it lets Pliny present a man who died of the fumes as one who mastered the moment; the closing description of the body "similior quiescenti quam mortuo" completes the argument by making even the corpse testify to his self-command.`,
    scoringNotes:
      'Part B is where most points are lost. The two things graders look for: is there an interpretation that answers the prompt, and is every claim tied to specific Latin that is quoted and correctly located. A claim with no Latin behind it earns nothing.',
  },

  {
    id: 'frq3-aen-12-940',
    type: 'short-essay',
    title: 'Short Essay — the death of Turnus',
    passageId: 'aen-12-919-952',
    citation: 'Aeneid 12.938–952',
    minutes: 25,
    subquestions: [
      { id: 'a-i', label: 'A (i)', prompt: 'Identify what causes Aeneas to change his mind.', points: 1 },
      { id: 'a-ii', label: 'A (ii)', prompt: 'Provide the Latin word(s) that support your answer in part (i).', points: 1 },
      { id: 'a-iii', label: 'A (iii)', prompt: 'Translate in context the Latin word(s) you cited in part (ii).', points: 1 },
      {
        id: 'b',
        label: 'B',
        prompt:
          'Explain how the ending of the poem complicates Anchises’ instruction at 6.853 (parcere subiectis et debellare superbos). Your response should be 3 to 4 complete sentences, with at least one specific Latin citation, translated or accurately paraphrased, and an explanation of how it supports your response.',
        points: 5,
      },
    ],
    rubric: SHORT_ESSAY_RUBRIC,
    sampleResponse: `A (i) The sight of Pallas' sword-belt on Turnus' shoulder.
A (ii) "infelix umero cum apparuit alto / balteus"
A (iii) "when the unlucky baldric appeared on his high shoulder."

B. The ending sets Anchises' imperial programme against the reality of the man who is supposed to carry it out, and lets the reality win. Turnus fulfils exactly the condition Anchises names: he is subiectus, and Vergil marks it unmistakably with "ille humilis supplex oculos dextramque precantem / protendens" — "he, humbled, a suppliant, stretching out his eyes and his praying right hand." Aeneas is visibly on the point of sparing him — "et iam iamque magis cunctantem flectere sermo / coeperat" — so the poem stages the choice rather than assuming it, and then has him kill in "furiis accensus et ira / terribilis", the same vocabulary of rage that the proem attached to Juno. The effect is not to condemn Aeneas so much as to leave the Roman mission's central claim untested at the one moment it was tested: the poem ends on furor, not on clementia, and gives the last word to a shade fleeing indignata.`,
    scoringNotes:
      'Note that the strongest responses here cite Latin from the passage supplied and reference 6.853 by line number rather than quoting it as if it were on the page.',
  },

  {
    id: 'frq2-aen-1-1-7',
    type: 'translation',
    title: 'Translation — the proem',
    passageId: 'aen-1-1-33',
    citation: 'Aeneid 1.1–7',
    minutes: 15,
    subquestions: [
      {
        id: 'translate',
        label: '',
        prompt:
          'Translate the passage as literally as possible. Your translation should account for every Latin word.',
        points: 15,
      },
    ],
    rubric: [
      {
        id: 't1',
        label: 'Segments',
        maxPoints: 15,
        criteria:
          'The passage is divided into 15 segments. Each segment earns one point when every Latin word in it is accounted for with correct grammar.',
        decisionRules: [
          'Correct tense, voice, mood, number, and case function are all required.',
          'A paraphrase that drops a construction does not earn the segment.',
          'Idiomatic English is acceptable where it preserves the grammar.',
        ],
      },
    ],
    sampleResponse:
      'Work this one in the Translate section, which scores it segment by segment against the same 15-segment breakdown the exam uses.',
    scoringNotes: 'See the Translate section for the full segment-by-segment model and self-scoring.',
  },

  {
    id: 'frq4-project-prose',
    type: 'project-prose',
    title: 'Project Prose Passage — Short Essay',
    minutes: 30,
    subquestions: [
      {
        id: 'a',
        label: 'A',
        prompt:
          'Summarise the passage. Your summary should begin with a sentence identifying what the passage as a whole is about, and then summarise the beginning, the middle, and the end of the passage.',
        points: 4,
      },
      {
        id: 'b',
        label: 'B',
        prompt:
          'Develop an interpretation of the passage that responds to the prompt, and support it with at least two specific citations of Latin from the passage, explaining how each supports your interpretation. Include relevant contextual or stylistic information and explain how it relates to the prompt.',
        points: 7,
      },
    ],
    rubric: PROJECT_ESSAY_RUBRIC,
    sampleResponse:
      'Add your own project passages in the Course Project tab of the FRQ Workshop — this question is always set on one of the four passages you choose with your teacher, so the sample has to be yours.',
    scoringNotes:
      'Part A is worth 4 of the 11 points and is pure summary — do not skip it to get to the argument. Note that on FRQ 4 and 5 words outside the core vocabulary are NOT glossed.',
  },

  {
    id: 'frq5-project-poetry',
    type: 'project-poetry',
    title: 'Project Poetry Passage — Short Essay',
    minutes: 30,
    subquestions: [
      {
        id: 'a',
        label: 'A',
        prompt:
          'Summarise the passage. Begin with a sentence identifying what the passage as a whole is about, then summarise its beginning, middle, and end.',
        points: 4,
      },
      {
        id: 'b',
        label: 'B',
        prompt:
          'Develop an interpretation of the passage that responds to the prompt, supported by at least two specific Latin citations with explanation, plus relevant contextual or stylistic information explained in relation to the prompt.',
        points: 7,
      },
    ],
    rubric: PROJECT_ESSAY_RUBRIC,
    sampleResponse:
      'Add your own project passages in the Course Project tab of the FRQ Workshop — this question is always set on one of the four passages you choose with your teacher.',
    scoringNotes:
      'The same 11-point rubric as FRQ 4. For poetry, stylistic information (metre, word order, sound effects) is usually the easiest way to earn row 8.',
  },
];

export function getPrompt(id: string): FrqPrompt | undefined {
  return frqPrompts.find((p) => p.id === id);
}

export const FRQ_TYPE_LABELS: Record<FrqPrompt['type'], string> = {
  'short-answer': 'FRQ 1 · Short Answer',
  translation: 'FRQ 2 · Translation',
  'short-essay': 'FRQ 3 · Short Essay',
  'project-prose': 'FRQ 4 · Project Prose Essay',
  'project-poetry': 'FRQ 5 · Project Poetry Essay',
};
