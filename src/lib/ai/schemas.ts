import { z } from 'zod';

/**
 * Every AI response is requested as structured JSON via generateObject, so the
 * UI can render real components instead of a wall of prose. These schemas are
 * the contract; they are shared by the route handlers and the client types.
 */

/* ---------------- a. Translation grading ---------------- */

export const segmentVerdict = z.enum(['correct', 'partial', 'incorrect']);

/*
 * Keep this schema lean. The longest drill (Aeneid 4.333-339, 15 segments) was
 * failing with AI_NoObjectGeneratedError because the model ran out of output
 * tokens mid-JSON, and every field the model has to write is output it can run
 * out of room in.
 *
 * Two fields were removed for that reason, and both were dead:
 *   - `latin`, a verbatim echo of Latin the server already holds. Asking the
 *     model to reproduce it spent tokens and, worse, gave it an opportunity to
 *     alter the Latin — which this project never allows.
 *   - `scoreEstimate`, which the client recomputes from the verdicts anyway.
 *
 * Anything added here must actually be rendered. A field nobody reads is a
 * truncation risk for no benefit.
 */
export const translationGradeSchema = z.object({
  segments: z
    .array(
      z.object({
        segmentId: z.string().describe('The id of the segment being graded, copied exactly.'),
        studentRendering: z
          .string()
          .describe("The part of the student's translation that corresponds to this segment, quoted verbatim. Empty string if they omitted it."),
        verdict: segmentVerdict,
        reason: z
          .string()
          .describe(
            'The specific grammatical reason for the verdict — e.g. "perfect rendered as present", "ablative absolute translated as a main clause", "accusative of respect read as direct object". Name the actual error, never a vague comment. One short phrase, not a sentence.',
          ),
        correctedLiteral: z
          .string()
          .describe('A correct literal rendering of just this segment. Shown to the student when the segment is not fully correct.'),
      }),
    )
    .describe('One entry per segment supplied, in the same order.'),
  correctedTranslation: z
    .string()
    .describe('A complete literal translation of the whole passage, accounting for every Latin word.'),
  oneThingToWorkOn: z
    .string()
    .describe('The single highest-value grammatical habit to fix, stated as an instruction.'),
});

export type TranslationGrade = z.infer<typeof translationGradeSchema>;

/* ---------------- b. FRQ essay feedback ---------------- */

export const essayFeedbackSchema = z.object({
  dimensions: z
    .array(
      z.object({
        id: z.string(),
        name: z
          .string()
          .describe('Rubric dimension name, e.g. "Defensible interpretation" or "Latin evidence".'),
        earned: z.number(),
        possible: z.number(),
        justification: z.string().describe('Why this score, referring to what the student actually wrote.'),
      }),
    )
    .describe('One entry per rubric dimension supplied in the prompt.'),
  uncitedClaims: z
    .array(
      z.object({
        claim: z.string().describe("The student's claim, quoted from their essay."),
        why: z.string().describe('Why this needs Latin support.'),
        suggestedEvidence: z
          .string()
          .describe('Latin from the supplied passage that would support it, with its line or section number. Quote only Latin that appears in the passage provided.'),
      }),
    )
    .describe(
      'Claims made with no Latin cited — the most common way points are lost. Empty array if every claim is supported.',
    ),
  citationCheck: z
    .array(
      z.object({
        quoted: z.string().describe('The Latin the student quoted.'),
        citedAs: z.string().describe('The line or section number they gave, or "none" if absent.'),
        accurate: z.boolean(),
        note: z.string().describe('If inaccurate, what the correct citation is.'),
      }),
    )
    .describe('Every Latin quotation in the essay, checked against the passage.'),
  revisions: z
    .array(z.string())
    .length(2)
    .describe('Exactly two concrete, actionable revisions — not general advice.'),
  overall: z.string().describe('Two or three sentences of overall judgement.'),
});

export type EssayFeedback = z.infer<typeof essayFeedbackSchema>;

/* ---------------- c. Short-answer set grading ---------------- */

export const shortAnswerGradeSchema = z.object({
  items: z.array(
    z.object({
      subquestionId: z.string(),
      prompt: z.string(),
      studentAnswer: z.string(),
      earned: z.number(),
      possible: z.number(),
      verdict: segmentVerdict,
      feedback: z.string().describe('What earned or lost the point, specifically.'),
      modelAnswer: z.string().describe('A concise answer that would earn full credit.'),
    }),
  ),
  totalEarned: z.number(),
  totalPossible: z.number(),
  patterns: z
    .array(z.string())
    .describe('Recurring weaknesses across the set, if any. Empty array if none.'),
});

export type ShortAnswerGrade = z.infer<typeof shortAnswerGradeSchema>;

/* ---------------- d. Sight passage generation ---------------- */

export const sightPassageSchema = z.object({
  author: z.string(),
  work: z.string(),
  citation: z.string().describe('Precise citation, e.g. "Nepos, Atticus 1.1–2".'),
  genre: z.enum(['prose', 'poetry']),
  latin: z
    .string()
    .describe(
      'The genuine Latin text, reproduced from the public-domain source. Do NOT compose new Latin. If you cannot reproduce a real passage accurately, return an empty string here.',
    ),
  confidence: z
    .enum(['high', 'medium', 'low'])
    .describe('How confident you are that the Latin is reproduced accurately and is genuinely by this author.'),
  gloss: z.array(
    z.object({
      word: z.string(),
      meaning: z.string(),
    }),
  ).describe('Words outside the AP core vocabulary that the exam would gloss.'),
  summary: z.string().describe('An English summary, for checking comprehension after the attempt.'),
  questions: z
    .array(
      z.object({
        prompt: z.string(),
        type: z.enum([
          'grammar-syntax',
          'form-identification',
          'vocabulary-in-context',
          'translation-choice',
          'literary-device',
          'meter',
          'context-culture',
          'inference',
        ]),
        options: z.array(z.object({ id: z.string(), text: z.string() })).length(4),
        answerId: z.string(),
        explanation: z.string().describe('Why the answer is right and, where useful, why a tempting distractor is wrong.'),
      }),
    )
    .describe('AP-style multiple-choice questions on the passage.'),
});

export type GeneratedSight = z.infer<typeof sightPassageSchema>;

/* ---------------- e. Ask about this line ---------------- */

export const askSchema = z.object({
  answer: z.string(),
});

/* ---------------- g. Glossing an imported text ---------------- */

/*
 * Lean for the same reason as the translation grade: a long text means a
 * long list, and every field is output the model can run out of room in.
 * `form` is the one extra, because "what is this form" is what a student
 * reading a word they don't know most needs after its meaning.
 */
export const textGlossSchema = z.object({
  glosses: z
    .array(
      z.object({
        word: z.string().describe('The word exactly as it was listed, copied character for character.'),
        lemma: z
          .string()
          .describe(
            'Its dictionary entry, as a Latin glossary prints it: nominative, genitive and gender for a noun ("Cicero, Ciceronis m."); the three nominatives for an adjective ("ferox, ferocis"); the principal parts for a verb ("fallo, fallere, fefelli, falsum"); the word itself for anything indeclinable.',
          ),
        pos: z
          .string()
          .describe('Part of speech in one or two words: noun, proper noun, verb, adjective, adverb, pronoun, preposition, conjunction, interjection, numeral.'),
        meaning: z
          .string()
          .describe('A short English meaning that fits the word where it stands in this text, one to six words.'),
        form: z
          .string()
          .describe('What this form is, abbreviated as an AP glossary would: "abl. sg. fem.", "3rd pl. perf. act. ind.", "pres. act. inf.", "perf. pass. ptcp., nom. pl. masc.". Empty for an indeclinable word.'),
      }),
    )
    .describe('One entry per word listed, in the same order.'),
});

export type TextGloss = z.infer<typeof textGlossSchema>;

/* ---------------- h. Reading Latin off a photo ---------------- */

export const photoTextSchema = z.object({
  hasLatin: z.boolean().describe('False when the image has no Latin text to read.'),
  genre: z.enum(['poetry', 'prose']).describe('Verse set out line by line, or running prose.'),
  firstLine: z
    .number()
    .int()
    .nullable()
    .describe('The first line number printed beside the Latin, when the page numbers its lines; otherwise null.'),
  heading: z.string().describe('A title or citation printed above the Latin ("Aeneid IV", "In Catilinam I"), or an empty string.'),
  text: z
    .string()
    .describe(
      'The Latin exactly as printed. Verse: one verse per line. Prose: each paragraph as one run of text, paragraphs separated by a blank line, words hyphenated across a printed line break joined.',
    ),
});

export type PhotoText = z.infer<typeof photoTextSchema>;
