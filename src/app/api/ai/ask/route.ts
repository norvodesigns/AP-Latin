import { streamText } from 'ai';
import { streamWithFallback, aiConfigured } from '@/lib/ai/provider';
import {
  readJson, checkLength, rateLimit, clientIp, errorResponse, handleAiError,
  ASK_RULE, LIMITS,
} from '@/lib/ai/guard';
import { getPassage } from '@/data/passages';
import { lookup } from '@/lib/latin';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface Body {
  passageId?: string;
  lineN?: number;
  latin?: string;
  question?: string;
}

/**
 * "Ask about this line" — answers stream, and stay scoped to the line.
 * The response is prose rather than a structured object because it is a
 * conversational explanation; everything else in the app uses generateObject.
 */
export async function POST(req: Request) {
  if (!aiConfigured()) {
    return errorResponse(
      'AI is not configured on this deployment. The glossary and grammar reference still work offline.',
      503,
      { degraded: true },
    );
  }

  const gate = rateLimit(`ask:${clientIp(req)}`, ASK_RULE);
  if (!gate.ok) {
    return errorResponse(
      `You have asked ${ASK_RULE.limit} questions in the last 10 minutes. Try again in about ${Math.ceil(gate.retryAfterSeconds / 60)} minute(s).`,
      429,
      { retryAfterSeconds: gate.retryAfterSeconds, degraded: true },
    );
  }

  const parsed = await readJson<Body>(req);
  if (!parsed.ok) return parsed.response;

  const q = checkLength(parsed.data.question, 'question', LIMITS.question);
  if (!q.ok) return q.response;

  const passage = getPassage(parsed.data.passageId ?? '');
  const lineN = Number(parsed.data.lineN);
  const line = passage?.lines.find((l) => l.n === lineN);

  const latinCheck = checkLength(parsed.data.latin ?? line?.latin, 'line', LIMITS.latin);
  if (!latinCheck.ok) return latinCheck.response;
  const latin = latinCheck.value;

  /* Neighbouring lines give the model enough context to parse correctly
     without letting the answer wander off the line that was asked about. */
  const neighbours = passage
    ? passage.lines
        .filter((l) => Math.abs(l.n - lineN) <= 2 && l.n !== lineN)
        .map((l) => `[${l.n}] ${l.latin}`)
        .join('\n')
    : '';

  const vocab = latin
    .split(/[^A-Za-zÀ-ÿĀ-ſ]+/)
    .filter((w) => w.length > 1)
    .map((w) => lookup(w)[0])
    .filter(Boolean)
    .slice(0, 25)
    .map((r) => `  ${r!.entry.lemma} (${r!.entry.pos}) — ${r!.entry.definition}`)
    .join('\n');

  const system = [
    'You are a precise, patient AP Latin tutor answering a question about one specific line of Latin.',
    'Stay scoped to the line asked about. Use the neighbouring lines only to explain how this line fits its sentence; do not drift into a general discussion of the passage or the poem.',
    'Be concrete: name cases, tenses, moods, and constructions by their standard grammatical terms.',
    'Never invent Latin. Quote only from the line and its neighbours as supplied.',
    passage?.macronized
      ? 'This text carries macrons, so vowel quantities are given and you may rely on them for metrical questions.'
      : 'This text does NOT mark vowel quantity. If asked about metre, say what can be determined by position and note that the rest depends on quantities the text does not mark.',
    'Keep it under about 200 words unless the question genuinely needs more. Plain prose, no headings.',
  ].join(' ');

  const prompt = [
    passage ? `PASSAGE: ${passage.citation} — ${passage.title} (${passage.author === 'vergil' ? 'dactylic hexameter' : 'prose'})` : '',
    `LINE ${lineN}: ${latin}`,
    neighbours ? `\nSURROUNDING LINES (context only):\n${neighbours}` : '',
    vocab ? `\nDICTIONARY ENTRIES for words in this line:\n${vocab}` : '',
    `\nSTUDENT'S QUESTION: ${q.value}`,
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const { value, provider, usedFallback } = await streamWithFallback((model) =>
      streamText({ model, system, prompt, temperature: 0.3 }),
    );
    return new Response(value, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Ai-Provider': provider,
        'X-Ai-Fallback': String(usedFallback),
      },
    });
  } catch (err) {
    return handleAiError(err);
  }
}
