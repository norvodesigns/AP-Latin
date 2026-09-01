import { z } from 'zod';

/**
 * Every AI response is requested as structured JSON via generateObject, so the
 * UI can render real components instead of a wall of prose. These schemas are
 * the contract; they are shared by the route handlers and the client types.
 */

/* ---------------- a. Translation grading ---------------- */

export const segmentVerdict = z.enum(['correct', 'partial', 'incorrect']);

export const translationGradeSchema = z.object({
  segments: z
    .array(
      z.object({
        segmentId: z.string().describe('The id of the segment being graded, copied exactly.'),
        latin: z.string().describe('The Latin of this segment.'),
        studentRendering: z
          .string()
          .describe("The part of the student's translation that corresponds to this segment, quoted verbatim. Empty string if they omitted it."),
        verdict: segmentVerdict,
        reason: z
          .string()
          .describe(
            'The specific grammatical reason for the verdict — e.g. "perfect rendered as present", "ablative absolute translated as a main clause", "accusative of respect read as direct object". Name the actual error, never a vague comment.',
          ),
        correctedLiteral: z.string().describe('A correct literal rendering of just this segment.'),
      }),
    )
    .describe('One entry per segment supplied, in the same order.'),
  correctedTranslation: z
    .string()
    .describe('A complete literal translation of the whole passage, accounting for every Latin word.'),
  scoreEstimate: z.object({
    earned: z.number().describe('Segments judged correct, counting partial as 0.5.'),
    possible: z.number(),
  }),
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
