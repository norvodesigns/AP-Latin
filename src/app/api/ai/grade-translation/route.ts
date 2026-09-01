import { NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { withFallback } from '@/lib/ai/provider';
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

  const system = [
    'You are an experienced AP Latin Reader scoring Free-Response Question 2 (literal translation).',
    'AP scores this question in discrete segments. A segment earns credit only when the student accounts for every Latin word in it with correct grammar — correct tense, voice, mood, number, case function, and syntax.',
    'Grade strictly against the segment data supplied. Never invent Latin, never grade against a passage you remember instead of the one supplied.',
    'For each segment, name the specific grammatical error, not a vague impression: say "perfect rendered as present" or "ablative absolute translated as a coordinate main clause", never "not quite right".',
    'If the student omitted a segment entirely, mark it incorrect with studentRendering as an empty string.',
    'Idiomatic English is acceptable only where it preserves the grammar; a paraphrase that drops a construction is at most partial.',
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
