/**
 * A `next` path that stays on this site: "/learn" yes; "//evil.example",
 * "/\evil.example" (which browsers read as "//") and "https://…" no.
 * Anything else becomes null, so the caller falls back to its default.
 */
export function safeNext(next: string | null | undefined): string | null {
  if (!next || !next.startsWith('/')) return null;
  if (next.startsWith('//') || next.startsWith('/\\')) return null;
  return next;
}

/** Where the website lives, for links that leave it in an email. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://lectio.norvodesigns.com';
