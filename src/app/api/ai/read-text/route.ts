import { NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { visionModel } from '@/lib/ai/provider';
import { rateLimit, clientIp, errorResponse, handleAiError, GENERATE_RULE } from '@/lib/ai/guard';
import { photoTextSchema } from '@/lib/ai/schemas';
import { IMPORT_LIMITS, cleanImportText } from '@/lib/imports';

export const runtime = 'nodejs';
export const maxDuration = 60;

const DATA_URL = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;

/**
 * Reads the Latin off a photo of a page (a textbook, a handout, a screen),
 * for the Reading Room's import. Only the website uses it: the iPhone app
 * reads photos on the phone itself, with Apple's text recognition.
 *
 * The photo is sent as a JPEG data URL the browser has already shrunk to a
 * couple of thousand pixels. What comes back is for the reader to check and
 * correct before it is imported, which the import page asks them to do.
 */
export async function POST(req: Request) {
  const model = visionModel();
  if (!model) {
    return errorResponse(
      'Reading photos needs the Gemini AI, which is not set up on this deployment. Type or paste the Latin instead.',
      503,
      { degraded: true },
    );
  }

  const declared = Number(req.headers.get('content-length') ?? 0);
  if (declared > IMPORT_LIMITS.imageChars + 1_000) {
    return errorResponse('That photo is too large. Try a smaller one, or crop it to the Latin.', 413);
  }
  let image: unknown;
  try {
    const raw = await req.text();
    if (raw.length > IMPORT_LIMITS.imageChars + 1_000) {
      return errorResponse('That photo is too large. Try a smaller one, or crop it to the Latin.', 413);
    }
    image = (JSON.parse(raw) as { image?: unknown }).image;
  } catch {
    return errorResponse('Could not read that photo.', 400);
  }
  const m = typeof image === 'string' ? DATA_URL.exec(image) : null;
  if (!m) return errorResponse('That is not a photo Lectio can read (JPEG, PNG or WebP).', 400);

  const gate = rateLimit(`read-text:${clientIp(req)}`, GENERATE_RULE);
  if (!gate.ok) {
    return errorResponse(
      `You have read ${GENERATE_RULE.limit} photos in the last ten minutes. Paste the Latin instead, or try again in about ${Math.ceil(gate.retryAfterSeconds / 60)} minute(s).`,
      429,
      { retryAfterSeconds: gate.retryAfterSeconds, degraded: true },
    );
  }

  const system = [
    'You transcribe Latin from photographs of printed or handwritten pages for a student, who will check your transcription before using it.',
    'Copy the Latin exactly as it is on the page: the same words in the same order, the same spelling (u or v, i or j, as printed), and any macrons, accents or diaeresis marks the page has. Never correct, modernise, complete or translate it.',
    'Leave out everything that is not the Latin text itself: line numbers, verse numbers, page numbers, running heads, footnotes, marginal glosses, vocabulary lists, English, and notes.',
    'Verse: one verse per line, as printed. Prose: join each paragraph into one run of text, and join a word hyphenated across a line break.',
    'If a word is hard to read, give your best reading of it. If there is no Latin in the image, set hasLatin to false and leave text empty.',
  ].join(' ');

  try {
    const result = await generateObject({
      model,
      schema: photoTextSchema,
      system,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Transcribe the Latin in this photo.' },
            { type: 'image', image: m[2], mimeType: m[1] },
          ],
        },
      ],
      temperature: 0,
      maxTokens: 8192,
    });
    const out = result.object;
    const text = cleanImportText(out.text ?? '').slice(0, IMPORT_LIMITS.chars + 2_000);
    if (!out.hasLatin || !text) {
      return errorResponse('No Latin could be read in that photo. Try a sharper, closer one, or type the text.', 422);
    }
    return NextResponse.json({
      text,
      genre: out.genre,
      firstLine: out.firstLine ?? null,
      heading: (out.heading ?? '').trim().slice(0, 120),
      _meta: { remaining: gate.remaining },
    });
  } catch (err) {
    return handleAiError(err);
  }
}
