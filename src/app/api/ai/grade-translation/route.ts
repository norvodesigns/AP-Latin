import { NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { withFallback, GRADING_MAX_TOKENS } from '@/lib/ai/provider';
import {
  readJson, checkLength, rateLimit, clientIp, errorResponse, handleAiError,
  GRADING_RULE, LIMITS,
} from '@/lib/ai/guard';
import { translationGradeSchema } from '@/lib/ai/schemas';
import { getDrill } from '@/data/translation';
import { getPassage } from '@/data/passages';
import { lookup } from '@/lib/latin';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface Body {
  drillId?: string;
  translation?: string;
}

export async function POST(req: Request) {
  const gate = rateLimit(`grade-translation:${clientIp(req)}`, GRADING_RULE);
  if (!gate.ok) {
    return errorResponse(
      `You have used all ${GRADING_RULE.limit} AI grading calls for this 10-minute window. Self-grade against the model translation, or try again in about ${Math.ceil(gate.retryAfterSeconds / 60)} minute(s).`,
      429,
      { retryAfterSeconds: gate.retryAfterSeconds, degraded: true },
    );
  }

  const parsed = await readJson<Body>(req);
  if (!parsed.ok) return parsed.response;

  const drill = getDrill(parsed.data.drillId ?? '');
  if (!drill) return errorResponse('Unknown translation drill.', 400);

  const t = checkLength(parsed.data.translation, 'translation', LIMITS.translation);
  if (!t.ok) return t.response;

  const passage = getPassage(drill.passageId);

  /**
   * Ground the model in the real Latin: the segment breakdown, the accepted
   * literal rendering, the known pitfalls, and dictionary entries for the words
   * in the passage. Without this the model grades from memory and invents.
   */
  const vocabContext = buildVocabContext(drill.latin);

  /*
   * The alignment rules below are not padding. Measured against the app's own
   * model translations, the grader's failure mode was marking a correct
   * continuous translation down — penalising a segment because the word
   * appeared just inside a neighbouring segment's span, or because English
   * idiom needs no separate token for a Latin feature (a vocative does not
   * require "O"). Marking a correct student wrong is the costly error here:
   * it teaches them to distrust a right answer.
   */
  const system = [
    'You are an experienced AP Latin Reader scoring Free-Response Question 2 (literal translation).',
    'AP scores this question in discrete segments. A segment earns credit only when the student accounts for every Latin word in it with correct grammar — correct tense, voice, mood, number, case function, and syntax.',
    'Grade strictly against the segment data supplied. Never invent Latin, never grade against a passage you remember instead of the one supplied.',
    'ALIGNMENT: the student writes one continuous English translation, not labelled segments. Before judging, map the whole translation onto the segments in order. English word order differs from Latin, so a word belonging to one segment often surfaces earlier or later than its segment boundary. If the sense of a segment is present anywhere in the student\'s rendering of that area, it is accounted for. Never mark a segment missing because the word sits just inside a neighbouring segment\'s span.',
    'IDIOM: judge whether the grammatical relationship is conveyed, not whether a token-for-token equivalent appears. English needs no "O" for a vocative, no extra noun for an ablative of means, and no separate pronoun where the verb ending carries it. A natural English rendering that preserves tense, voice, mood, number and case function is correct, not partial.',
    'SHARED WORDS: English does not repeat a verb, auxiliary, modal or preposition across coordinated elements — "he came to Italy and the Lavinian shores" states the verb once for both, and "he might found a city and bring his gods" states the modal once for both. When a segment\'s verb, tense or mood is carried by a shared word governing an earlier coordinate, that segment HAS it. Do not mark it omitted because the word is not repeated; requiring the repetition would be marking correct English wrong.',
    'For each segment, name the specific grammatical error, not a vague impression: say "perfect rendered as present" or "ablative absolute translated as a coordinate main clause", never "not quite right".',
    'If the student omitted a segment entirely, mark it incorrect with studentRendering as an empty string.',
    'A paraphrase that actually drops a construction is at most partial. But reserve "partial" and "incorrect" for a real grammatical fault you can name — marking a correct rendering wrong is the worse error.',
  ].join(' ');

  const prompt = [
    `PASSAGE: ${drill.citation}${passage ? ` (${passage.author === 'vergil' ? 'Vergil, verse' : 'Pliny, prose'})` : ''}`,
    '',
    'FULL LATIN:',
    drill.latin,
    '',
    'SEGMENTS (grade each one; ids must be copied exactly):',
    ...drill.segments.map(
      (s, i) =>
        `${i + 1}. id=${s.id}\n   Latin: ${s.latin}\n   Accepted literal: ${s.literal}\n   Requirement: ${s.requirement}\n   Common errors: ${s.pitfalls.join('; ') || 'none recorded'}`,
    ),
    '',
    'DICTIONARY ENTRIES for words in this passage (from the official AP core vocabulary list):',
    vocabContext,
    '',
    "STUDENT'S TRANSLATION:",
    t.value,
  ].join('\n');

  try {
    const { value, provider, usedFallback } = await withFallback((model) =>
      generateObject({
        model,
        schema: translationGradeSchema,
        system,
        prompt,
        temperature: 0.2,
        // A 15-segment grade is a long JSON document; without an explicit
        // ceiling the provider default truncates it and generateObject then
        // fails schema validation. See GRADING_MAX_TOKENS.
        maxTokens: GRADING_MAX_TOKENS,
      }),
    );

    return NextResponse.json({
      ...value.object,
      _meta: { provider, usedFallback, remaining: gate.remaining },
    });
  } catch (err) {
    return handleAiError(err);
  }
}

/** Dictionary entries for the distinct words of a passage, capped for prompt size. */
function buildVocabContext(latin: string): string {
  const words = latin.split(/[^A-Za-zÀ-ÿĀ-ſ]+/).filter((w) => w.length > 1);
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const w of words) {
    const hits = lookup(w);
    const top = hits[0];
    if (!top || seen.has(top.entry.id)) continue;
    seen.add(top.entry.id);
    lines.push(`  ${top.entry.lemma} (${top.entry.pos}) — ${top.entry.definition}`);
    if (lines.length >= 60) break;
  }
  return lines.length ? lines.join('\n') : '  (no core-vocabulary matches found)';
}
