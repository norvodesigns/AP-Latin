'use client';

import Link from 'next/link';
import type { Profile } from '@/lib/supabase/types';
import { signOut } from '@/app/(auth)/actions';

/**
 * The masthead's only auth-aware element.
 *
 * Three states, matched exactly to the three the rest of the app already
 * distinguishes (see supabase/config.ts and the middleware):
 *
 *   not configured  — nothing renders. Solo mode has no account concept.
 *   configured, signed out — a "Sign in" link.
 *   configured, signed in  — a link into the student or teacher home
 *                            (whichever the account's role is for), plus
 *                            sign out.
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
    <div className="flex items-center gap-2">
      <Link href={home} className="chip squish" title={`Signed in as ${profile.display_name}`}>
        {label}
      </Link>
      <form action={signOut}>
        <button type="submit" className="btn btn-ghost">
          Sign out
        </button>
      </form>
    </div>
  );
}
