import { NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { withFallback } from '@/lib/ai/provider';
import {
  readJson, rateLimit, clientIp, errorResponse, handleAiError, GENERATE_RULE,
} from '@/lib/ai/guard';
import { sightPassageSchema, type GeneratedSight } from '@/lib/ai/schemas';
import { cacheKey, readCache, writeCache } from '@/lib/ai/cache';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** The authors the CED names as sources for sight reading practice. */
const SIGHT_AUTHORS = [
  'Nepos', 'Cicero', 'Livy', 'Seneca', 'Ovid', 'Martial', 'Tibullus', 'Catullus',
] as const;

type SightAuthor = (typeof SIGHT_AUTHORS)[number];

interface Body {
  author?: string;
  genre?: 'prose' | 'poetry';
  questionCount?: number;
  /** Bumping this asks for a different passage by the same author. */
  variant?: number;
}

export async function POST(req: Request) {
  const parsed = await readJson<Body>(req);
  if (!parsed.ok) return parsed.response;

  const author = parsed.data.author;
  if (!author || !SIGHT_AUTHORS.includes(author as SightAuthor)) {
    return errorResponse(
      `Pick one of the recommended sight authors: ${SIGHT_AUTHORS.join(', ')}.`,
      400,
    );
  }
  const genre: 'prose' | 'poetry' = parsed.data.genre === 'poetry' ? 'poetry' : 'prose';
  const questionCount = Math.min(6, Math.max(3, Number(parsed.data.questionCount) || 4));
  const variant = Math.min(20, Math.max(0, Number(parsed.data.variant) || 0));

  /* Serve from cache before spending any quota or a rate-limit slot. */
  const key = cacheKey({ route: 'sight', author, genre, questionCount, variant });
  const cached = await readCache<GeneratedSight & { _meta?: unknown }>(key);
  if (cached) {
    return NextResponse.json({ ...cached, _meta: { cached: true, machineSelected: true } });
  }

  const gate = rateLimit(`generate-sight:${clientIp(req)}`, GENERATE_RULE);
  if (!gate.ok) {
    return errorResponse(
      `You have generated ${GENERATE_RULE.limit} sight passages in the last 10 minutes. Work through the ones you have, or try again in about ${Math.ceil(gate.retryAfterSeconds / 60)} minute(s).`,
      429,
      { retryAfterSeconds: gate.retryAfterSeconds, degraded: true },
    );
  }

  const system = [
    'You select genuine, public-domain Classical Latin passages for AP Latin sight-reading practice.',
    'CRITICAL: you must NOT compose, invent, paraphrase, or "improve" Latin. Reproduce a real passage by the named author, exactly as it stands in the standard public-domain text.',
    'If you cannot reproduce a genuine passage accurately from memory, return an empty string for `latin` and set confidence to "low". Returning nothing is correct; inventing Latin is not.',
    'Set confidence honestly: "high" only when you are certain the text is verbatim and correctly attributed.',
    'Choose a self-contained passage of roughly 60–100 words of prose, or 8–14 lines of verse, at the difficulty of the AP Latin exam.',
    'Gloss any word a student would not know from the AP core vocabulary list.',
    'Write AP-style multiple-choice questions: four options each, one unambiguously correct, with plausible distractors that reflect real misreadings. Explain why the answer is right.',
  ].join(' ');

  const prompt = [
    `Select a ${genre} passage by ${author} suitable for AP Latin sight reading.`,
    variant > 0 ? `Choose a DIFFERENT passage from any obvious first choice — this is request variant ${variant}.` : '',
    `Write ${questionCount} multiple-choice questions on it.`,
    'Give a precise citation so the passage can be checked against a printed text.',
  ]
    .filter(Boolean)
    .join(' ');

  try {
    const { value, provider, usedFallback } = await withFallback((model) =>
      generateObject({
        model,
        schema: sightPassageSchema,
        system,
        prompt,
        temperature: 0.4,
      }),
    );

    const out = value.object;

    /* Refuse to hand back an empty or low-confidence passage rather than
       present invented Latin as practice material. */
    if (!out.latin || out.latin.trim().length < 40) {
      return errorResponse(
        `The model could not reproduce a passage by ${author} that it was confident was accurate, so it returned nothing rather than invent Latin. Try another author, or use the vetted sight passages.`,
        422,
        { degraded: true },
      );
    }

    await writeCache(key, out);

    return NextResponse.json({
      ...out,
      _meta: { provider, usedFallback, cached: false, machineSelected: true, remaining: gate.remaining },
    });
  } catch (err) {
    return handleAiError(err);
  }
}
