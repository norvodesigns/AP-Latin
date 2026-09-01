import 'server-only';

import { NextResponse } from 'next/server';
import { AiUnavailableError } from './provider';

/**
 * Endpoint protection for a publicly reachable deployment.
 *
 * The deployed URL is public, so every AI route caps the request body, rejects
 * oversized inputs, and rate-limits per IP. Limits are held in module memory:
 * this is a single-user study app, not a service, and in-memory state is the
 * right size of solution. On Vercel each serverless instance keeps its own
 * counters, which makes the limit slightly softer than a shared store would —
 * it is a brake against runaway usage, not a security boundary.
 */

/** Hard ceiling on any request body, before parsing. */
export const MAX_BODY_BYTES = 24_000;

/** Per-field character caps. */
export const LIMITS = {
  translation: 4_000,
  essay: 12_000,
  question: 600,
  latin: 6_000,
  shortAnswer: 8_000,
} as const;

interface Bucket {
  hits: number[];
}

const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();

export interface RateRule {
  /** Requests allowed within the window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

/** 20 grading calls per 10 minutes, as a default for the expensive routes. */
export const GRADING_RULE: RateRule = { limit: 20, windowMs: 10 * 60_000 };
/** Cheaper conversational route gets a slightly higher allowance. */
export const ASK_RULE: RateRule = { limit: 30, windowMs: 10 * 60_000 };
/** Generation is the most expensive; keep it tight. */
export const GENERATE_RULE: RateRule = { limit: 10, windowMs: 10 * 60_000 };

export function clientIp(req: Request): string {
  const h = req.headers;
  const fwd = h.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return h.get('x-real-ip') ?? h.get('cf-connecting-ip') ?? 'local';
}

export interface RateResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function rateLimit(key: string, rule: RateRule): RateResult {
  const now = Date.now();

  // Sweep stale buckets occasionally so memory does not grow unbounded.
  if (now - lastSweep > 60_000) {
    lastSweep = now;
    for (const [k, b] of buckets) {
      if (b.hits.every((t) => now - t > rule.windowMs)) buckets.delete(k);
    }
  }

  const bucket = buckets.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => now - t < rule.windowMs);

  if (bucket.hits.length >= rule.limit) {
    buckets.set(key, bucket);
    const oldest = Math.min(...bucket.hits);
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((rule.windowMs - (now - oldest)) / 1000)),
    };
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);
  return { ok: true, remaining: rule.limit - bucket.hits.length, retryAfterSeconds: 0 };
}

/** A clean JSON error. Never leaks a stack trace to the client. */
export function errorResponse(message: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

/** Read and size-check a JSON body. Returns a Response on failure. */
export async function readJson<T>(req: Request): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
  const declared = req.headers.get('content-length');
  if (declared && Number(declared) > MAX_BODY_BYTES) {
    return {
      ok: false,
      response: errorResponse(
        `That request is too large (limit ${Math.floor(MAX_BODY_BYTES / 1000)} KB). Try a shorter passage.`,
        413,
      ),
    };
  }

  let text: string;
  try {
    text = await req.text();
  } catch {
    return { ok: false, response: errorResponse('Could not read the request body.', 400) };
  }

  if (text.length > MAX_BODY_BYTES) {
    return {
      ok: false,
      response: errorResponse(
        `That request is too large (limit ${Math.floor(MAX_BODY_BYTES / 1000)} KB). Try a shorter passage.`,
        413,
      ),
    };
  }

  try {
    return { ok: true, data: JSON.parse(text) as T };
  } catch {
    return { ok: false, response: errorResponse('Request body was not valid JSON.', 400) };
  }
}

/** Validate a string field against a cap, returning a friendly message. */
export function checkLength(
  value: unknown,
  field: string,
  max: number,
  { required = true }: { required?: boolean } = {},
): { ok: true; value: string } | { ok: false; response: NextResponse } {
  if (typeof value !== 'string' || value.trim().length === 0) {
    if (!required) return { ok: true, value: '' };
    return { ok: false, response: errorResponse(`Missing ${field}.`, 400) };
  }
  if (value.length > max) {
    return {
      ok: false,
      response: errorResponse(
        `Your ${field} is ${value.length.toLocaleString()} characters; the limit is ${max.toLocaleString()}.`,
        400,
      ),
    };
  }
  return { ok: true, value };
}

/**
 * Turn any thrown error into a clean, useful client message.
 * Nothing from the provider's error object is passed through verbatim.
 */
export function handleAiError(err: unknown): NextResponse {
  if (err instanceof AiUnavailableError) {
    return errorResponse(
      'AI grading is not configured on this deployment. Everything still works in self-grading mode.',
      503,
      { degraded: true },
    );
  }

  const e = err as { statusCode?: number; status?: number; message?: string } | null;
  const code = e?.statusCode ?? e?.status;
  const msg = (e?.message ?? '').toLowerCase();

  if (code === 429 || msg.includes('quota') || msg.includes('rate limit')) {
    return errorResponse(
      'Both AI providers are rate-limited right now. Self-grade this one and try again later.',
      429,
      { degraded: true },
    );
  }
  if (code === 401 || code === 403 || msg.includes('api key')) {
    return errorResponse(
      'The AI provider rejected the API key. Check the environment variables in your Vercel project.',
      503,
      { degraded: true },
    );
  }
  if (msg.includes('timeout') || msg.includes('aborted')) {
    return errorResponse('The model took too long to answer. Try again, or self-grade this one.', 504, {
      degraded: true,
    });
  }

  // Log server-side for debugging; return nothing revealing.
  console.error('[ai] unhandled error:', err);
  return errorResponse(
    'The AI grader could not complete that request. Self-grading is still available.',
    502,
    { degraded: true },
  );
}
