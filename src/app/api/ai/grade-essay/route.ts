import { NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { withFallback } from '@/lib/ai/provider';
import {
  readJson, checkLength, rateLimit, clientIp, errorResponse, handleAiError,
  GRADING_RULE, LIMITS,
} from '@/lib/ai/guard';
import { essayFeedbackSchema } from '@/lib/ai/schemas';
import { getPrompt } from '@/data/frq';
import { getPassage } from '@/data/passages';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface Body {
  promptId?: string;
  essay?: string;
  /** For project passages the student supplies themselves. */
  customPassage?: { citation?: string; latin?: string };
  /** The specific sub-prompt being answered, when the question has several. */
  subquestionId?: string;
}

export async function POST(req: Request) {
  const gate = rateLimit(`grade-essay:${clientIp(req)}`, GRADING_RULE);
  if (!gate.ok) {
    return errorResponse(
      `You have used all ${GRADING_RULE.limit} AI grading calls for this 10-minute window. Score yourself against the rubric, or try again in about ${Math.ceil(gate.retryAfterSeconds / 60)} minute(s).`,
      429,
      { retryAfterSeconds: gate.retryAfterSeconds, degraded: true },
    );
  }

  const parsed = await readJson<Body>(req);
  if (!parsed.ok) return parsed.response;

  const promptDef = getPrompt(parsed.data.promptId ?? '');
  if (!promptDef) return errorResponse('Unknown free-response prompt.', 400);

  const essay = checkLength(parsed.data.essay, 'essay', LIMITS.essay);
  if (!essay.ok) return essay.response;

  /* Assemble the Latin the essay must be graded against. */
  let latin = '';
  let citation = promptDef.citation ?? '';
  const passage = promptDef.passageId ? getPassage(promptDef.passageId) : undefined;

  if (passage) {
    latin = passage.lines.map((l) => `[${l.n}] ${l.latin}`).join('\n');
    citation = passage.citation;
  } else if (parsed.data.customPassage?.latin) {
    const cp = checkLength(parsed.data.customPassage.latin, 'passage', LIMITS.latin);
    if (!cp.ok) return cp.response;
    latin = cp.value;
    citation = (parsed.data.customPassage.citation ?? 'your project passage').slice(0, 200);
  } else {
    return errorResponse(
      'This prompt needs a passage. Add your course project passage first.',
      400,
    );
  }

  const sub = parsed.data.subquestionId
    ? promptDef.subquestions.find((s) => s.id === parsed.data.subquestionId)
    : undefined;

  const system = [
    'You are an experienced AP Latin Reader scoring a free-response essay against the official College Board rubric.',
    'Score ONLY against the rubric dimensions supplied. Do not invent dimensions and do not award more than the stated maximum for a row.',
    'The single most common way students lose points is making a claim without citing Latin. Flag every such claim explicitly in uncitedClaims.',
    'Check every Latin quotation the student gives against the passage supplied, including its line or section number. Mark a quotation inaccurate if the words do not appear in the passage, or if the cited number is wrong.',
    'Never quote Latin in your feedback that does not appear in the supplied passage. If you want to suggest evidence, take it verbatim from the passage.',
    'Be exacting but fair: judge what the student actually wrote, not what they might have meant.',
  ].join(' ');

  const prompt = [
    `QUESTION: ${promptDef.title} (${promptDef.type})`,
    sub ? `SUB-PROMPT BEING ANSWERED: ${sub.label} — ${sub.prompt} (${sub.points} points)` : '',
    '',
    `PASSAGE: ${citation}`,
    'Line/section numbers are in square brackets. Cite them exactly.',
    latin,
    '',
    'RUBRIC DIMENSIONS (score each; ids must be copied exactly):',
    ...promptDef.rubric.map(
      (r) =>
        `- id=${r.id} | ${r.label} | max ${r.maxPoints} point(s)\n  Criteria: ${r.criteria}\n  Decision rules: ${r.decisionRules.join(' ')}`,
    ),
    '',
    "STUDENT'S ESSAY:",
    essay.value,
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const { value, provider, usedFallback } = await withFallback((model) =>
      generateObject({
        model,
        schema: essayFeedbackSchema,
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
