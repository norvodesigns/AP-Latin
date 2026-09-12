import { NextResponse } from 'next/server';
import { aiConfigured, hasKey, MODELS } from '@/lib/ai/provider';
import { getCurrentUser } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Lets the client know whether AI features are available, so every AI-backed
 * surface can degrade to self-grading without a failed request first.
 *
 * This route itself stays reachable without an account, like every other
 * study section — but an anonymous caller gets only a yes/no. Provider names
 * and model IDs are handed a would-be attacker exactly which provider to
 * target, so the detailed shape (still shown to a signed-in visitor in
 * Settings) is gated on a verified session rather than removed outright.
 */
export async function GET() {
  const configured = aiConfigured();
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ configured });

  return NextResponse.json({
    configured,
    providers: {
      google: { configured: hasKey('google'), model: MODELS.google },
      groq: { configured: hasKey('groq'), model: MODELS.groq },
    },
  });
}
