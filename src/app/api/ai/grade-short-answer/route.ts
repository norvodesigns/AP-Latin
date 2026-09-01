import { NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { withFallback } from '@/lib/ai/provider';
import {
  readJson, rateLimit, clientIp, errorResponse, handleAiError,
  GRADING_RULE, LIMITS,
} from '@/lib/ai/guard';
import { shortAnswerGradeSchema } from '@/lib/ai/schemas';
import { getPrompt } from '@/data/frq';
import { getPassage } from '@/data/passages';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface Body {
  promptId?: string;
  /** subquestion id -> the student's answer. */
  answers?: Record<string, string>;
}

export async function POST(req: Request) {
  const gate = rateLimit(`grade-short-answer:${clientIp(req)}`, GRADING_RULE);
  if (!gate.ok) {
    return errorResponse(
      `You have used all ${GRADING_RULE.limit} AI grading calls for this 10-minute window. Self-score against the sample response, or try again in about ${Math.ceil(gate.retryAfterSeconds / 60)} minute(s).`,
      429,
      { retryAfterSeconds: gate.retryAfterSeconds, degraded: true },
    );
  }

  const parsed = await readJson<Body>(req);
  if (!parsed.ok) return parsed.response;

  const promptDef = getPrompt(parsed.data.promptId ?? '');
  if (!promptDef) return errorResponse('Unknown free-response prompt.', 400);

  const answers = parsed.data.answers;
  if (!answers || typeof answers !== 'object') {
    return errorResponse('No answers were submitted.', 400);
  }

  const total = Object.values(answers).join('').length;
  if (total > LIMITS.shortAnswer) {
    return errorResponse(
      `Your answers total ${total.toLocaleString()} characters; the limit is ${LIMITS.shortAnswer.toLocaleString()}.`,
      400,
    );
  }
  if (total === 0) return errorResponse('No answers were submitted.', 400);

  const passage = promptDef.passageId ? getPassage(promptDef.passageId) : undefined;
  const latin = passage
    ? passage.lines.map((l) => `[${l.n}] ${l.latin}`).join('\n')
    : (promptDef.latin ?? '');

  const system = [
    'You are an experienced AP Latin Reader scoring Free-Response Question 1 (Short Answer), which is worth 8 points across 6–8 subquestions.',
    'Each subquestion is scored independently and strictly for what it asks. A student who answers a different question than the one asked earns nothing for that row.',
    'Where a subquestion asks for Latin, the answer must be Latin from the passage. Where it asks for a case AND use, both are required. Where it asks for scansion, check the feet against the metre.',
    'Where it asks for a translation, apply the same standard as FRQ 2: every Latin word must be accounted for with correct grammar.',
    'Never quote Latin that does not appear in the supplied passage.',
    'Give partial credit only where the subquestion is worth more than one point.',
  ].join(' ');

  const prompt = [
    `QUESTION: ${promptDef.title}`,
    `PASSAGE: ${promptDef.citation ?? passage?.citation ?? 'supplied below'}`,
    latin,
    '',
    'SUBQUESTIONS (grade each; copy ids exactly):',
    ...promptDef.subquestions.map(
      (s) =>
        `- id=${s.id} | ${s.label} | ${s.points} point(s)\n  Prompt: ${s.prompt}\n  Student answer: ${answers[s.id]?.trim() || '(no answer given)'}`,
    ),
    '',
    'A strong reference response for the whole set:',
    promptDef.sampleResponse,
  ].join('\n');

  try {
    const { value, provider, usedFallback } = await withFallback((model) =>
      generateObject({
        model,
        schema: shortAnswerGradeSchema,
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
