/**
 * Whether a Supabase backend is configured for this deployment.
 *
 * Lectio runs in two modes:
 *
 *   Solo mode      — no Supabase keys. Everything lives in localStorage,
 *                    exactly as before accounts existed. No login, no
 *                    classrooms, no leaderboards, but every study feature
 *                    works. This is the fallback, not a broken state.
 *
 *   Classroom mode — Supabase configured. Accounts, classrooms, teacher
 *                    oversight, assignments and leaderboards become
 *                    available; local progress still works and syncs up.
 *
 * These two values are the only Supabase settings that are safe to expose
 * to the browser. The anon key is designed to be public — row-level
 * security in the database, not secrecy of this key, is what protects
 * student data. The service-role key must never appear here.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
