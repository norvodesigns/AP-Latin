import { NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { safeNext } from '@/lib/safePath';
import { getSupabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Where Supabase's emails land. The "Confirm signup" and "Reset password"
 * templates point here with `token_hash` and `type` rather than at Supabase's
 * own hosted verify endpoint, so the redirect after verifying goes to a page
 * this app actually owns instead of wherever the project's default Site URL
 * happens to be — that mismatch is what produced the 404 the old template
 * (using `{{ .ConfirmationURL }}`) sent people to.
 *
 * A template still on `{{ .ConfirmationURL }}` arrives with `?code=` instead
 * (Supabase's PKCE flow), which works when the email is opened in the same
 * browser that asked for it.
 *
 * Signup goes on to /auth/confirmed; a password reset, now signed in for the
 * purpose, to /reset-password.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const code = searchParams.get('code');
  const next = safeNext(searchParams.get('next'));
  const isReset = type === 'recovery' || next === '/reset-password';

  const supabase = await getSupabaseServer();

  if (supabase && tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(`${origin}${isReset ? '/reset-password' : (next ?? '/auth/confirmed')}`);
    }
  } else if (supabase && code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${isReset ? '/reset-password' : (next ?? '/auth/confirmed')}`);
    }
  }

  return NextResponse.redirect(`${origin}${isReset ? '/forgot-password?expired=1' : '/auth/confirm-error'}`);
}
