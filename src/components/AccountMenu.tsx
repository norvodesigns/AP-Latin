'use client';

import Link from 'next/link';
import type { Profile } from '@/lib/supabase/types';

/**
 * The masthead's only auth-aware element — always exactly one compact chip,
 * at every viewport width, so it slots into the header the same way the
 * rest of this row does (nothing here is hidden below a breakpoint the way
 * the days-count and search are, so it needs to stay that small).
 *
 * Three states, matched to the three the rest of the app already
 * distinguishes (see supabase/config.ts and the middleware):
 *
 *   not configured  — nothing renders. Solo mode has no account concept.
 *   configured, signed out — a "Sign in" link.
 *   configured, signed in  — a link into the student or teacher home
 *                            (whichever the account's role is for).
 *
 * Sign-out lives on /classroom and /teach themselves, not here — it is not
 * a frequent-enough action to earn a permanent second element in a header
 * that every other control on this row goes out of its way to keep lean.
 *
 * `profile` is passed down from the root layout, a Server Component, rather
 * than fetched here — see the comment on RootLayout for why that keeps this
 * in sync with sign-in/out without a client-side auth listener.
 */
export default function AccountMenu({
  profile,
  accountsEnabled,
}: {
  profile: Profile | null;
  accountsEnabled: boolean;
}) {
  if (!accountsEnabled) return null;

  if (!profile) {
    return (
      <Link href="/login" className="chip squish">
        Sign in
      </Link>
    );
  }

  const home = profile.role === 'teacher' ? '/teach' : '/classroom';
  const label = profile.role === 'teacher' ? 'Teach' : 'Classroom';

  return (
    <Link href={home} className="chip squish" title={`Signed in as ${profile.display_name}`}>
      {label}
    </Link>
  );
}
