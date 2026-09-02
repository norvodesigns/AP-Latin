'use client';

import { createBrowserClient } from '@supabase/ssr';
import { SUPABASE_URL, SUPABASE_ANON_KEY, supabaseConfigured } from './config';
import type { Database } from './types';

let cached: ReturnType<typeof createBrowserClient<Database>> | null = null;

/**
 * Browser Supabase client, or null when the app is running in solo mode.
 *
 * Callers must handle null rather than assuming a backend exists — that is
 * what keeps the app usable with no Supabase project attached.
 */
export function getSupabaseBrowser() {
  if (!supabaseConfigured) return null;
  cached ??= createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
  return cached;
}
