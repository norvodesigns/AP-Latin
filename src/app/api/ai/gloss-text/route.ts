import { NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { aiConfigured, withFallback, GRADING_MAX_TOKENS } from '@/lib/ai/provider';
import {
  readJson, rateLimit, clientIp, errorResponse, handleAiError, GRADING_RULE, type RateRule,
} from '@/lib/ai/guard';
import { textGlossSchema, type TextGloss } from '@/lib/ai/schemas';
import { cacheKey, readCache, writeCache } from '@/lib/ai/cache';
import { lookup } from '@/lib/latin';
import {
  IMPORT_LIMITS,
  distinctWords,
  isGlossed,
  splitImport,
  stripLineNumbers,
  type AiGloss,
  type ImportedText,
  type ImportedWord,
} from '@/lib/imports';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface Body {
  /** The text as typed, pasted or read off a photo: split here into rows. */
  text?: string;
  layout?: ImportedText['layout'];
  /** The first row's number; by default the first printed line number, or 1. */
  startAt?: number;
  /** Or rows already split (the website splits them itself, to preview). */
  lines?: Array<{ n: number; latin: string }>;
  /** False: Lectio's dictionary only, nothing sent to an AI provider (the
   *  apps, when the reader hasn't allowed AI). */
  ai?: boolean;
  /** Only these words, for "gloss the rest" on a text already imported. */
  only?: string[];
}

/** The dictionary alone costs nothing, so it gets a looser limit than the AI. */
const DICTIONARY_RULE: RateRule = { limit: 60, windowMs: 10 * 60_000 };

/** Words per AI request: about 40 output tokens a word against the 8k budget. */
const CHUNK = 110;

/**
 * Glosses a text the reader is importing into the Reading Room: every
 * distinct word looked up in Lectio's own dictionary (`lookup()`, as every
 * Reader does), then each word with no exact entry glossed by the AI, in the
 * context of the whole text. Returns the rows and, per word, what was found,
 * which the apps store with the text (src/lib/imports.ts).
 *
 * The dictionary part always answers. If the AI is off, unconfigured, rate
 * limited or fails, the reply says so in `ai.error` and the words it would
 * have glossed are listed in `unglossed`, for a later "gloss the rest".
 */
export async function POST(req: Request) {
  const parsed = await readJson<Body>(req);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  /* The rows. */
  let lines: Array<{ n: number; latin: string }>;
  let startAt: number | null = null;
  if (Array.isArray(body.lines)) {
    lines = body.lines
      .filter((l) => l && typeof l.latin === 'string' && Number.isFinite(Number(l.n)))
      .map((l) => ({ n: Math.floor(Number(l.n)), latin: l.latin.normalize('NFC').trim() }))
      .filter((l) => l.latin);
  } else if (typeof body.text === 'string') {
    const layout = body.layout === 'lines' ? 'lines' : 'sentences';
    const stripped = stripLineNumbers(body.text.normalize('NFC'));
    startAt = typeof body.startAt === 'number' && Number.isFinite(body.startAt) ? body.startAt : (stripped.firstNumber ?? 1);
    lines = splitImport(stripped.text, layout, startAt);
  } else {
    return errorResponse('No Latin was sent.', 400);
  }

  const chars = lines.reduce((n, l) => n + l.latin.length, 0);
  if (lines.length === 0 || chars === 0) return errorResponse('There is no Latin in that text.', 400);
  if (chars > IMPORT_LIMITS.chars) {
    return errorResponse(
      `That text is ${chars.toLocaleString()} characters; the limit is ${IMPORT_LIMITS.chars.toLocaleString()} (about a thousand words). Import it in two parts.`,
      400,
    );
  }
  if (lines.length > IMPORT_LIMITS.lines) {
    return errorResponse(`That text has ${lines.length} lines; the limit is ${IMPORT_LIMITS.lines}. Import it in two parts.`, 400);
  }

  const gate = rateLimit(`gloss-dictionary:${clientIp(req)}`, DICTIONARY_RULE);
  if (!gate.ok) {
    return errorResponse(
      `That is a lot of imports in ten minutes. Try again in about ${Math.ceil(gate.retryAfterSeconds / 60)} minute(s).`,
      429,
      { retryAfterSeconds: gate.retryAfterSeconds },
    );
  }

  /* Lectio's dictionary, for every distinct word. */
  const all = distinctWords(lines);
  const words: Record<string, ImportedWord> = {};
  for (const w of all) {
    const found = lookup(w).slice(0, 4);
    if (found.length > 0) {
      words[w] = { g: found.map((r) => ({ id: r.entry.id, m: r.match === 'exact' ? 'e' : 's' })) };
    }
  }

  /* The AI, for the words the dictionary has no exact entry for. */
  const only = Array.isArray(body.only) ? new Set(body.only.filter((w) => typeof w === 'string')) : null;
  const wanted = all.filter((w) => !isGlossed(words[w]) && (!only || only.has(w)));
  const ai: { glossed: number; error?: string; cached?: boolean } = { glossed: 0 };
  let asked: string[] = [];

  if (wanted.length > 0 && body.ai !== false) {
    if (!aiConfigured()) {
      ai.error = 'AI glossing is not set up on this deployment, so only the dictionary’s words are glossed.';
    } else {
      const aiGate = rateLimit(`gloss-text:${clientIp(req)}`, GRADING_RULE);
      if (!aiGate.ok) {
        ai.error = `You have used the AI glossary ${GRADING_RULE.limit} times in ten minutes. The dictionary’s words are glossed; try the rest again in about ${Math.ceil(aiGate.retryAfterSeconds / 60)} minute(s).`;
      } else {
        asked = wanted.slice(0, IMPORT_LIMITS.aiWords);
        try {
          const { glosses, cached } = await glossWithAi(lines, asked);
          ai.cached = cached;
          for (const [w, g] of glosses) {
            words[w] = { ...(words[w] ?? {}), ai: g };
            ai.glossed++;
          }
          if (wanted.length > asked.length) {
            ai.error = `The AI glosses ${IMPORT_LIMITS.aiWords} new words at a time; the rest can be glossed from the Reader.`;
          }
        } catch (err) {
          const res = handleAiError(err);
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          ai.error = j.error ?? 'The AI glossary could not finish, so only the dictionary’s words are glossed.';
        }
      }
    }
  }

  const unglossed = all.filter((w) => !isGlossed(words[w]));

  return NextResponse.json({
    lines,
    ...(startAt !== null ? { startAt } : {}),
    words,
    unglossed,
    ai,
    _meta: { cached: ai.glossed === 0 || ai.cached === true },
  });
}

/** The AI's glosses for `asked`, in chunks run side by side, keyed by the
 *  word as listed. A chunk that fails leaves its words for a later "gloss
 *  the rest"; the others still count. Throws only if every chunk fails. */
async function glossWithAi(
  lines: Array<{ n: number; latin: string }>,
  asked: string[],
): Promise<{ glosses: Map<string, AiGloss>; cached: boolean }> {
  const text = lines.map((l) => `[${l.n}] ${l.latin}`).join('\n');
  const key = cacheKey({ kind: 'gloss-text-v1', text, asked });
  const hit = await readCache<Array<[string, AiGloss]>>(key);
  if (hit) return { glosses: new Map(hit), cached: true };

  const chunks: string[][] = [];
  for (let i = 0; i < asked.length; i += CHUNK) chunks.push(asked.slice(i, i + CHUNK));

  const system = [
    'You write the marginal glossary for a Latin text an AP Latin student has brought into their reader.',
    'For each word listed, give its dictionary entry, its part of speech, a short English meaning that fits how the word is used in this text, and what this particular form is.',
    'Write the dictionary entry without macrons, the way a school glossary prints it.',
    'Words are listed exactly as they appear, capitals included; a capitalised word in mid-sentence is usually a proper name.',
    'A word with -que, -ne or -ve attached: gloss the word and include the enclitic in the meaning ("and the man", "or by sea").',
    'The text may have come from a photo, so a word can be misread. If a listed word is not real Latin, give the word you think was meant as the dictionary entry and begin the meaning with "probably".',
    'Never skip a word, never add one that was not listed, and copy each word exactly.',
  ].join(' ');

  const results = await Promise.allSettled(
    chunks.map((chunk) =>
      withFallback((model) =>
        generateObject({
          model,
          schema: textGlossSchema,
          system,
          prompt: `TEXT:\n${text}\n\nWORDS TO GLOSS (${chunk.length}, one per line):\n${chunk.join('\n')}`,
          temperature: 0.1,
          maxTokens: GRADING_MAX_TOKENS,
        }),
      ),
    ),
  );

  const glosses = new Map<string, AiGloss>();
  const wantedSet = new Set(asked);
  const byLower = new Map(asked.map((w) => [w.toLowerCase(), w]));
  let failures = 0;
  let firstError: unknown = null;
  for (const r of results) {
    if (r.status === 'rejected') {
      failures++;
      firstError ??= r.reason;
      continue;
    }
    for (const g of (r.value.value.object as TextGloss).glosses) {
      const w = wantedSet.has(g.word) ? g.word : byLower.get(g.word.toLowerCase());
      if (!w || glosses.has(w)) continue;
      const lemma = clip(g.lemma, 120);
      const meaning = clip(g.meaning, 160);
      if (!lemma || !meaning) continue;
      const form = clip(g.form, 80);
      glosses.set(w, { lemma, pos: clip(g.pos, 40) || 'word', meaning, ...(form ? { form } : {}) });
    }
  }
  if (failures === chunks.length) throw firstError;
  if (failures === 0) await writeCache(key, [...glosses]);
  return { glosses, cached: false };
}

function clip(s: unknown, max: number): string {
  if (typeof s !== 'string') return '';
  const t = s.trim().replace(/\s+/g, ' ');
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}
