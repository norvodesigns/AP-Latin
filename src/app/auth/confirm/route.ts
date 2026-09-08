import { NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { getSupabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Where Supabase's confirmation emails land. The "Confirm signup" template
 * points here with `token_hash` and `type` rather than at Supabase's own
 * hosted verify endpoint, so the redirect after verifying goes to a page this
 * app actually owns instead of wherever the project's default Site URL
 * happens to be — that mismatch is what produced the 404 the old template
 * (using `{{ .ConfirmationURL }}`) sent people to.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;

  const supabase = await getSupabaseServer();

  if (supabase && tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(`${origin}/auth/confirmed`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/confirm-error`);
}
