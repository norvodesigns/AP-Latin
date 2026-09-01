import 'server-only';

import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * A small file cache for generated sight passages, so quota is not burned
 * regenerating the same request.
 *
 * On Vercel the deployment filesystem is read-only apart from /tmp, and /tmp is
 * per-instance and ephemeral — so this is a best-effort cache that survives
 * within a warm instance, not durable storage. Locally it writes to .cache/ in
 * the project root, which does persist between runs. Every failure is
 * swallowed: a cache miss must never break a request.
 */

const DIR =
  process.env.VERCEL === '1'
    ? path.join('/tmp', 'ap-latin-cache')
    : path.join(process.cwd(), '.cache');

export function cacheKey(parts: Record<string, unknown>): string {
  const json = JSON.stringify(parts, Object.keys(parts).sort());
  return crypto.createHash('sha256').update(json).digest('hex').slice(0, 32);
}

export async function readCache<T>(key: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(path.join(DIR, `${key}.json`), 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function writeCache(key: string, value: unknown): Promise<void> {
  try {
    await fs.mkdir(DIR, { recursive: true });
    await fs.writeFile(path.join(DIR, `${key}.json`), JSON.stringify(value), 'utf8');
  } catch {
    // A cache write failure is never fatal.
  }
}

/** How many entries the cache currently holds, for the settings page. */
export async function cacheSize(): Promise<number> {
  try {
    const files = await fs.readdir(DIR);
    return files.filter((f) => f.endsWith('.json')).length;
  } catch {
    return 0;
  }
}
