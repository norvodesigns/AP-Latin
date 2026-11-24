'use client';

import { useCallback, useState } from 'react';
import { lookup } from '@/lib/latin';
import { useStore } from '@/store/useStore';
import {
  IMPORT_LIMITS,
  distinctWords,
  unglossedWords,
  type ImportedText,
  type ImportedWord,
} from '@/lib/imports';

/** What /api/ai/gloss-text sends back. */
export interface GlossReply {
  lines: Array<{ n: number; latin: string }>;
  words: Record<string, ImportedWord>;
  unglossed: string[];
  ai: { glossed: number; error?: string; cached?: boolean };
}

/**
 * Glosses a text through the website's route: the dictionary for every word,
 * the AI for the rest. If the server can't be reached at all, the words are
 * looked up here in the browser instead (the same dictionary), so an import
 * never fails for want of a connection; only the AI's part is missing.
 */
export async function glossLines(
  lines: Array<{ n: number; latin: string }>,
  opts: { only?: string[] } = {},
): Promise<GlossReply> {
  try {
    const res = await fetch('/api/ai/gloss-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lines, ...(opts.only ? { only: opts.only } : {}) }),
    });
    const json = await res.json().catch(() => null);
    if (res.ok && json?.words) {
      if (json.ai?.glossed > 0 && !json.ai.cached) useStore.getState().recordAiCall('gloss-text');
      return json as GlossReply;
    }
    // A refusal the route explained (too long, rate limited): say so.
    if (json?.error && res.status !== 429 && res.status < 500) throw new Error(json.error);
    return { ...glossHere(lines), ai: { glossed: 0, error: json?.error ?? 'The AI glossary could not be reached.' } };
  } catch (err) {
    if (err instanceof Error && err.message && !(err instanceof TypeError)) throw err;
    return { ...glossHere(lines), ai: { glossed: 0, error: 'You seem to be offline, so only the dictionary’s words are glossed.' } };
  }
}

/** The dictionary part of `glossLines`, done in the browser. */
function glossHere(lines: Array<{ n: number; latin: string }>): Omit<GlossReply, 'ai'> {
  const words: Record<string, ImportedWord> = {};
  for (const w of distinctWords(lines)) {
    const found = lookup(w).slice(0, 4);
    if (found.length) words[w] = { g: found.map((r) => ({ id: r.entry.id, m: r.match === 'exact' ? 'e' : 's' })) };
  }
  const unglossed = distinctWords(lines).filter((w) => !words[w]?.g?.some((x) => x.m === 'e'));
  return { lines, words, unglossed };
}

/**
 * "Gloss the rest": asks the AI again for the words of an imported text that
 * still have no gloss (the AI was busy, offline, or the text had more new
 * words than one request takes), and stores what comes back with the text.
 */
export function useGlossRest(text: ImportedText | undefined) {
  const updateImportedText = useStore((s) => s.updateImportedText);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    if (!text || working) return;
    const only = unglossedWords(text);
    if (only.length === 0) return;
    setWorking(true);
    setError(null);
    try {
      const reply = await glossLines(text.lines, { only });
      const words = { ...text.words };
      for (const [w, found] of Object.entries(reply.words)) {
        words[w] = { ...(words[w] ?? {}), ...found };
      }
      updateImportedText(text.id, { words });
      if (reply.ai.error) setError(reply.ai.error);
      else if (reply.ai.glossed === 0) setError('The AI had nothing to add for those words.');
    } catch (err) {
      setError((err as Error).message || 'Could not gloss the rest just now.');
    } finally {
      setWorking(false);
    }
  }, [text, working, updateImportedText]);

  return { run, working, error };
}

/** What /api/ai/read-text reads off a photo. */
export interface PhotoReading {
  text: string;
  genre: 'prose' | 'poetry';
  firstLine: number | null;
  heading: string;
}

/**
 * Shrinks a photo to at most `max` pixels on its long side and re-encodes it
 * as JPEG, so a 12-megapixel phone photo goes up as a few hundred kilobytes.
 * Plenty for reading print, and well inside the route's size cap.
 */
export async function shrinkPhoto(file: File, max = 2000): Promise<string> {
  let bitmap: ImageBitmap | HTMLImageElement;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
  } catch {
    bitmap = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('That file could not be opened as a photo. Try a JPEG or PNG.'));
      img.src = URL.createObjectURL(file);
    });
  }
  const w = 'naturalWidth' in bitmap ? bitmap.naturalWidth : bitmap.width;
  const h = 'naturalHeight' in bitmap ? bitmap.naturalHeight : bitmap.height;
  const scale = Math.min(1, max / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser could not prepare the photo.');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  for (const quality of [0.85, 0.7, 0.55]) {
    const url = canvas.toDataURL('image/jpeg', quality);
    if (url.length <= IMPORT_LIMITS.imageChars) return url;
  }
  throw new Error('That photo is too large to send. Crop it to the Latin and try again.');
}

/** Reads the Latin off a photo through the website's route. Throws with a
 *  message written for the reader. */
export async function readPhoto(file: File): Promise<PhotoReading> {
  const image = await shrinkPhoto(file);
  let res: Response;
  try {
    res = await fetch('/api/ai/read-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image }),
    });
  } catch {
    throw new Error('Could not reach Lectio to read the photo. Check your connection, or type the Latin.');
  }
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error ?? `The photo could not be read (${res.status}).`);
  useStore.getState().recordAiCall('read-text');
  return json as PhotoReading;
}
