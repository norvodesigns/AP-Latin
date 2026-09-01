# Adding content

Everything the app renders comes from typed data files under `src/data`. Adding a passage, a
question, a drill or a card never requires touching a component. The types live in
`src/data/types.ts` and are the authority — this document explains them.

**After any edit, run:**

```bash
npm run verify && npm run typecheck
```

`verify` is not a formality. It checks that answer keys resolve, that quoted Latin actually appears
in the passage it claims to come from, that scansion adds up, and that rubrics total the right
points. It found fifteen genuine errors on its first run.

---

## Two rules

1. **Never invent Latin.** Copy it from a public-domain source — [The Latin
   Library](https://www.thelatinlibrary.com) or [Perseus](https://www.perseus.tufts.edu). If you
   cannot get a passage reliably, leave a `TODO` comment rather than approximating it. Wrong Latin
   in a study app is worse than missing Latin.
2. **Every question needs an explanation.** An answer key teaches nothing. The verifier rejects
   explanations under 40 characters.

---

## Passages — `src/data/passages/vergil.ts`, `pliny.ts`

These two files are generated from source texts, but they are ordinary TypeScript and can be edited
by hand.

```ts
{
  id: 'aen-4-305-361',        // stable slug, referenced everywhere else
  author: 'vergil',           // 'vergil' | 'pliny' | 'other'
  genre: 'poetry',            // 'poetry' | 'prose'
  work: 'Aeneid',
  book: 4,
  letter: 16,                 // Pliny only
  salutation: 'C. PLINIUS TACITO SUO S.',   // Pliny only
  citation: 'Aeneid 4.305–361',
  title: 'Aeneas Leaves Dido',
  required: true,             // on the official 2025 CED list?
  cedReading: '5.2',          // CED reading number, or null
  unit: '5',                  // '1'–'6'
  macronized: false,          // does the source mark vowel quantity?
  wordCount: 412,
  themes: ['confrontation', 'pietas vs. love'],
  summary: 'An English summary…',
  context: 'Why the passage matters…',
  lines: [
    { n: 305, latin: 'dissimulare etiam sperasti, perfide, tantum' },
    // …
  ],
}
```

### The things that will bite you

- **`n` is the citation number, not an array index.** Line 305 has `n: 305`. Gaps are expected and
  legal — editors athetize lines and sources omit them — but the numbers must strictly increase.
- **For Pliny, `n` is the section number**, so `lines` holds numbered sections, not verse lines.
- **`macronized` must be truthful.** It is `true` only for `aen-1-1-33`, whose source marks vowel
  quantity. Setting it `true` on a passage without macrons would let the Scansion Lab teach invented
  quantities.
- **If `required: false`, the `context` must say so.** The verifier enforces a "not on the official"
  phrase, so a supplementary passage can never quietly pass as examinable.

---

## Questions — `src/data/questions.ts`

Questions use a `q()` helper to keep them terse:

```ts
q(
  'aen1-3',                    // unique id
  'grammar-syntax',            // QuestionType
  '1.B',                       // SkillCode — category is derived from this
  '4',                         // unit
  'In line 4, superum is',
  ['a syncopated genitive plural', 'an accusative singular', /* … */],
  0,                           // index of the correct option
  'superum is the shortened genitive plural of superī…',   // required
  { passageId: 'aen-1-1-33', lineRange: [4, 4], difficulty: 3 },
),
```

**Question types:** `grammar-syntax`, `form-identification`, `vocabulary-in-context`,
`translation-choice`, `literary-device`, `meter`, `context-culture`, `inference`.

**Skill codes** (from the CED, with their exam weightings):

| Code | Skill | Weight |
| --- | --- | --- |
| 1.A | Identify the meaning of Latin words and phrases | 5–15% |
| 1.B | Describe how grammar contributes to meaning | 10–20% |
| 1.C | Summarise Latin texts in English | 25–35% |
| 1.D | Translate Latin texts into English | 15–25% |
| 2.A | Describe stylistic elements | 2–10% |
| 2.B | Describe historical and cultural contexts | 5–10% |
| 3.A | Develop an interpretation | 3% |
| 3.B | Explain how evidence supports an interpretation | 16% |

For a **sight** question (no syllabus passage), give a self-contained `stimulus` instead of a
`passageId`:

```ts
{
  stimulus: {
    latin: 'Ōdī et amō. quārē id faciam, fortasse requīris.',
    citation: 'Catullus 85 (public domain)',
    genre: 'poetry',
    gloss: [{ word: 'excrucior', meaning: 'to be tortured' }],
  },
}
```

`lineRange` must fall inside the passage — the verifier checks it.

---

## Translation drills — `src/data/translation.ts`

The exam gives ~35 words of Vergil or ~40 of Pliny and scores the translation in **exactly 15
segments**. Drills must match that.

```ts
{
  id: 'td-aen-1-1-7',
  passageId: 'aen-1-1-33',
  citation: 'Aeneid 1.1–7',
  lineRange: [1, 7],
  latin: `Arma virumque canō, …`,     // must appear verbatim in the passage
  modelTranslation: 'A continuous literal translation…',
  notes: 'What students usually get wrong here.',
  segments: [
    {
      id: 's1',
      latin: 'Arma virumque canō',     // must be contiguous within `latin`
      literal: 'I sing of arms and the man',
      requirement: 'Present tense of canō; both accusative objects rendered.',
      pitfalls: ['"I sang" is wrong — canō is present.'],
      tags: ['present-tense', 'accusative-object'],
    },
    // …15 in total
  ],
}
```

**Segments must be contiguous and in order**, and together cover at least 90% of the drill's Latin.
The verifier walks the drill text with a cursor, so a segment containing `…` or reordering the text
will fail — split it into two contiguous segments instead.

**`tags` drive the weak-spot report** on the dashboard. Reuse existing tags (`ablative-absolute`,
`deponent`, `perfect-tense`, `indirect-statement`, `hyperbaton`…) so counts aggregate rather than
fragmenting.

---

## Scansion — `src/data/scansion.ts`

Generated, and best left generated. If you add lines by hand:

```ts
{
  id: 'scan-aen-1-1',
  passageId: 'aen-1-1-33',
  citation: 'Aeneid 1.1',
  latin: `Arma virumque canō, Trōiae quī prīmus ab ōrīs`,
  feet: ['dactyl', 'dactyl', 'spondee', 'spondee', 'dactyl', 'spondee'],
  syllables: [
    { text: `Ar`, quantity: 'long', elides: false },
    // … every syllable, including elided ones
  ],
  caesurae: [{ afterSyllable: 6, type: 'penthemimeral' }],
  notes: 'Why this line scans as it does.',
}
```

The verifier requires: six feet, a disyllabic sixth foot, non-elided syllables matching what the feet
demand, the first syllable of every foot long, and the syllables concatenating back into `latin`.

`afterSyllable` indexes the **non-elided** syllables. Elided syllables appear in `syllables` with
`elides: true`, are struck through in the UI, and do not count toward the feet.

**Only add lines whose quantities you can justify from the text**, not from a hunch. Where the source
does not mark macrons, quantity that is not fixed by position is unknowable, and a wrong macron
teaches a wrong scansion.

---

## Grammar, devices, context

`src/data/grammar.ts` — each topic has `summary`, `recognition[]` (how to spot it),
`translation[]` (how to render it) and `examples[]`.

`src/data/devices.ts` — each card has `definition`, `effect` (what the device *does*; AP asks for
function, not just the name) and `examples[]`. The spot-the-device drill is built automatically from
these examples, so an example whose `analysis` begins with "Not …" is excluded as a counter-example.

`src/data/context.ts` — each card has a `body` and `keyFacts[]`.

An example that names a `passageId` **must actually appear in that passage**:

```ts
{
  latin: 'parcere subiectīs',
  citation: 'Aeneid 6.853',
  passageId: 'aen-6-847-853',   // verified against the passage text
  analysis: 'parcō governs the dative, so subiectīs is dative plural…',
}
```

Omit `passageId` for examples from outside the loaded passages (Catullus, a paradigm, a formula) and
the check is skipped.

---

## Sight passages — `src/data/sight.ts`

Only **human-vetted, verbatim public-domain** text belongs here. AI-generated passages are never
written to this file; they are cached separately and always carry a machine-selected badge.

```ts
{
  id: 'sight-seneca-ep-1',
  author: 'Seneca',
  work: 'Epistulae Morales ad Lucilium',
  citation: 'Epistulae 1.1',
  genre: 'prose',
  latin: `Ita fac, mi Lucili: vindica te tibi…`,
  gloss: [{ word: 'vindico, -are', meaning: 'to claim, reclaim' }],
  summary: 'Revealed after the attempt.',
  questionIds: ['sight-sen-1', 'sight-sen-2'],
  source: 'The Latin Library (public domain)',
}
```

Questions go in the `sightQuestions` array in the same file, written out in full (no `q()` helper).

The CED's recommended sight authors: **Nepos, Cicero, Livy, Seneca, Ovid, Martial, Tibullus,
Catullus**.

---

## Free response — `src/data/frq.ts`

Rubrics must total the points the exam awards, and the verifier enforces it:

| Type | Points |
| --- | --- |
| `short-answer` (FRQ 1) | 8 |
| `translation` (FRQ 2) | 15 |
| `short-essay` (FRQ 3) | 8 |
| `project-prose` (FRQ 4) | 11 |
| `project-poetry` (FRQ 5) | 11 |

Course project checkpoints are 2 and 3 points. Three shared rubrics are exported —
`SHORT_ESSAY_RUBRIC`, `PROJECT_ESSAY_RUBRIC`, `SHORT_ANSWER_RUBRIC` — so new prompts of the same
type should reuse them rather than restate the rows.

FRQ 4 and 5 are always set on the student's own course project passages, which are entered in the
app (Course Project tab) and stored in `localStorage`, not in this file.

---

## Vocabulary — `src/data/vocabulary.ts`

Generated from CED Appendices 2 and 3; 990 entries. Editing by hand is rarely necessary, but the
shape is:

```ts
{
  id: 'accedo',                        // normalised headword, unique
  lemma: 'accedo (adc-), -ere, -cessi, -cessum',
  headword: 'accedo',
  pos: 'verb',
  definition: 'to go to, come to, approach, enter',
  readings: ['2.1'],                   // CED reading numbers
  units: ['2'],                        // derived from readings
}
```

`headword` feeds the Reading Room glossary index, which does stem matching — so it should be the
plain first form, without principal parts.

---

## Regenerating the generated files

`vocabulary.ts`, `passages/*.ts` and `scansion.ts` were produced by scripts that fetch the CED PDF
and the source texts, then validate line numbering against the printed numerals. Those scripts are
not committed, since they are one-shot tools that need network access and a PDF parser. The
generated files are the artefact of record — edit them directly, or re-derive them from the sources
named in each file's header comment.

---

## A checklist for new content

- [ ] Latin copied verbatim from a public-domain source, not typed from memory
- [ ] Line or section numbers match the source's own numbering
- [ ] Every question has an explanation that says *why*, including why a tempting distractor is wrong
- [ ] Skill code matches what the question actually tests
- [ ] Anything not on the official CED list is marked `required: false` and says so in its context
- [ ] `npm run verify` passes
- [ ] `npm run typecheck` passes
