import { NextResponse } from 'next/server';
import { aiConfigured, hasKey, MODELS } from '@/lib/ai/provider';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Lets the client know whether AI features are available, so every AI-backed
 * surface can degrade to self-grading without a failed request first.
 * Returns no key material — only whether each provider is configured.
 */
export async function GET() {
  return NextResponse.json({
    configured: aiConfigured(),
    providers: {
      google: { configured: hasKey('google'), model: MODELS.google },
      groq: { configured: hasKey('groq'), model: MODELS.groq },
    },
  });
}
