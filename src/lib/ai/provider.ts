import 'server-only';

import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createGroq } from '@ai-sdk/groq';
import type { LanguageModel } from 'ai';

/**
 * Provider abstraction.
 *
 * Swapping the primary provider is a one-line change: edit `PRIMARY` below.
 * Gemini Flash is the default because its free tier is generous; Groq is the
 * automatic fallback when Gemini returns 429 (quota) or 404 (model retired).
 *
 * API keys are read from process.env inside this server-only module. They are
 * never exported, never logged, and never referenced from a client component.
 */

/*
 * Model names go stale. `gemini-2.0-flash` and `llama-3.3-70b-versatile` were
 * both retired by their providers and every AI route returned 502 until these
 * were updated — with two valid keys configured, which made it look like a key
 * problem. If the AI stops working, check the model names against the
 * providers' own model lists before anything else:
 *
 *   curl -H "Authorization: Bearer $GROQ_API_KEY" https://api.groq.com/openai/v1/models
 *   curl "https://generativelanguage.googleapis.com/v1beta/models?key=$GOOGLE_GENERATIVE_AI_API_KEY"
 *
 * Both are overridable by env var so a retirement can be worked around in the
 * Vercel dashboard without a deploy.
 */
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.5-flash';
const GROQ_MODEL = process.env.GROQ_MODEL ?? 'openai/gpt-oss-120b';

export type ProviderName = 'google' | 'groq';

/** Change this to make Groq (or another provider) the primary. */
const PRIMARY: ProviderName = 'google';

export function hasKey(p: ProviderName): boolean {
  return p === 'google'
    ? Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY)
    : Boolean(process.env.GROQ_API_KEY);
}

/** True when at least one provider is configured. */
export function aiConfigured(): boolean {
  return hasKey('google') || hasKey('groq');
}

function model(p: ProviderName): LanguageModel {
  if (p === 'google') {
    const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });
    return google(GEMINI_MODEL);
  }
  const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
  return groq(GROQ_MODEL);
}

/**
 * Should we retry on the fallback provider?
 *
 * Rate limits (429), quota exhaustion, and a retired/unknown model (404) are
 * the failures the fallback exists for.
 *
 * `NoObjectGeneratedError` is here too, and it is worth saying why. It means
 * the model's JSON did not satisfy the schema — in practice almost always
 * because it ran out of output tokens partway through and the JSON was cut
 * off. That is a property of one model's response on one attempt, not of the
 * request, so the other provider deserves a go before the student is told
 * grading failed. Without this, the longest translation drill returned 502
 * every time.
 */
function shouldFallback(err: unknown): boolean {
  const e = err as { statusCode?: number; status?: number; message?: string; name?: string } | null;
  if (!e) return false;
  const code = e.statusCode ?? e.status;
  if (code === 429 || code === 404) return true;
  const msg = `${e.message ?? ''} ${e.name ?? ''}`.toLowerCase();
  return (
    msg.includes('rate limit') ||
    msg.includes('quota') ||
    msg.includes('resource_exhausted') ||
    msg.includes('model not found') ||
    msg.includes('not_found') ||
    msg.includes('is not found') ||
    msg.includes('unsupported model') ||
    msg.includes('no object generated') ||
    msg.includes('noobjectgenerated') ||
    msg.includes('did not match schema')
  );
}

/**
 * Output-token ceiling for the structured-grading calls.
 *
 * A 15-segment translation grade is a large JSON document. The provider
 * defaults are lower than it needs, and the failure mode is silent truncation
 * that only surfaces as a schema mismatch, so the budget is set explicitly
 * here rather than left to whatever each provider happens to default to.
 */
export const GRADING_MAX_TOKENS = 8192;

export interface AttemptResult<T> {
  value: T;
  provider: ProviderName;
  /** True when the primary failed and the fallback answered. */
  usedFallback: boolean;
}

/**
 * Run `fn` against the primary provider, falling back to the secondary on
 * quota/model errors. Throws `AiUnavailableError` when nothing is configured.
 */
export async function withFallback<T>(
  fn: (m: LanguageModel) => Promise<T>,
): Promise<AttemptResult<T>> {
  const order: ProviderName[] = PRIMARY === 'google' ? ['google', 'groq'] : ['groq', 'google'];
  const available = order.filter(hasKey);

  if (available.length === 0) {
    throw new AiUnavailableError(
      'No AI provider is configured. The app still works fully in self-grading mode.',
    );
  }

  let lastErr: unknown;
  for (let i = 0; i < available.length; i++) {
    const p = available[i];
    try {
      const value = await fn(model(p));
      return { value, provider: p, usedFallback: i > 0 };
    } catch (err) {
      lastErr = err;
      const isLast = i === available.length - 1;
      if (isLast || !shouldFallback(err)) throw err;
      /*
       * Say so when the primary drops out. A silent fallback means the app can
       * run entirely on the secondary for weeks — different model, different
       * grading behaviour — with nothing anywhere to show it. That is exactly
       * what happened once already: Gemini's free-tier quota was exhausted and
       * every grade was quietly coming from Groq.
       */
      console.warn(
        `[ai] ${p} failed (${(err as Error)?.name ?? 'error'}), falling back to ${available[i + 1]}:`,
        String((err as Error)?.message ?? err).slice(0, 200),
      );
    }
  }
  throw lastErr;
}

export class AiUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiUnavailableError';
  }
}

export const MODELS = { google: GEMINI_MODEL, groq: GROQ_MODEL };

/**
 * Streaming variant of {@link withFallback}.
 *
 * `streamText` does not reject on a provider error — the failure surfaces only
 * once the stream is consumed. So we pull the first chunk here to force any
 * error out while we can still switch providers, then hand back a stream that
 * replays that chunk followed by the rest.
 */
export async function streamWithFallback(
  build: (m: LanguageModel) => { textStream: AsyncIterable<string> },
): Promise<AttemptResult<ReadableStream<Uint8Array>>> {
  const order: ProviderName[] = PRIMARY === 'google' ? ['google', 'groq'] : ['groq', 'google'];
  const available = order.filter(hasKey);

  if (available.length === 0) {
    throw new AiUnavailableError(
      'No AI provider is configured. The app still works fully in self-grading mode.',
    );
  }

  let lastErr: unknown;
  for (let i = 0; i < available.length; i++) {
    const p = available[i];
    try {
      const iterator = build(model(p)).textStream[Symbol.asyncIterator]();
      // Force the provider error to surface now, while a fallback is still possible.
      const first = await iterator.next();

      const encoder = new TextEncoder();
      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          try {
            if (!first.done && first.value) controller.enqueue(encoder.encode(first.value));
            for (;;) {
              const next = await iterator.next();
              if (next.done) break;
              if (next.value) controller.enqueue(encoder.encode(next.value));
            }
            controller.close();
          } catch (err) {
            // Mid-stream failure: end cleanly rather than emitting a raw error.
            console.error('[ai] stream interrupted:', err);
            controller.enqueue(
              encoder.encode('\n\n[The answer was cut off — the provider dropped the connection.]'),
            );
            controller.close();
          }
        },
      });

      return { value: stream, provider: p, usedFallback: i > 0 };
    } catch (err) {
      lastErr = err;
      const isLast = i === available.length - 1;
      if (isLast || !shouldFallback(err)) throw err;
    }
  }
  throw lastErr;
}
