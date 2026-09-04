import 'server-only';

import { cache } from 'react';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { SUPABASE_URL, SUPABASE_ANON_KEY, supabaseConfigured } from './config';
import type { Database, Profile } from './types';

/**
 * Server Supabase client bound to the request's cookies, or null in solo mode.
 *
 * Use this in Server Components, Route Handlers and Server Actions. Never
 * trust a role or identity sent from the browser — read it from here, which
 * validates the session cookie against Supabase.
 */
export async function getSupabaseServer() {
  if (!supabaseConfigured) return null;
  const cookieStore = await cookies();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // The middleware refreshes the session instead, so this is safe.
        }
      },
    },
  });
}

/**
 * The signed-in user, verified against Supabase.
 *
 * Uses getUser() rather than getSession(): getSession() only decodes the
 * cookie, which the client could have tampered with. getUser() revalidates
 * with the auth server, so it is the one to trust for access decisions.
 *
 * Wrapped in React's cache() so repeated calls within one request — the
 * root layout resolves this for the account menu, and every classroom/teach
 * page resolves it again for its own queries — share one round trip to the
 * auth server rather than paying for it once per component.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await getSupabaseServer();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
});

/** The signed-in user's profile row (role, display name), or null. Also
 *  request-cached, for the same reason as getCurrentUser above. */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await getSupabaseServer();
  if (!supabase) return null;

  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();

  if (error) return null;
  return data;
});
