'use server';

import { headers } from 'next/headers';
import { rateLimit } from '@/lib/ai/guard';
import { getSupabaseServer } from '@/lib/supabase/server';
import { SUPPORT_TOPICS, type SupportTopic } from '@/lib/supabase/types';

export interface SupportResult {
  sent: boolean;
  error: string | null;
}

/** Five messages an hour from one address is plenty for a person. */
const RULE = { limit: 5, windowMs: 60 * 60_000 };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The support form (and the app's "Report this name", which opens it
 * filled in). Stores the message in support_messages, which nobody can read
 * back through the API; see supabase/migrations/0006_support_messages.sql.
 */
export async function sendSupportMessage(_prev: SupportResult, formData: FormData): Promise<SupportResult> {
  // A field people never see: anything in it came from a bot. Pretend it
  // went, so the bot has nothing to learn from.
  if (String(formData.get('website') ?? '').trim()) return { sent: true, error: null };

  const topic = String(formData.get('topic') ?? '') as SupportTopic;
  if (!SUPPORT_TOPICS.includes(topic)) return { sent: false, error: 'Choose what the message is about.' };

  const message = String(formData.get('message') ?? '').trim();
  if (!message) return { sent: false, error: 'Write a message first.' };
  if (message.length > 4000) return { sent: false, error: 'Keep the message under 4,000 characters.' };

  const replyTo = String(formData.get('replyTo') ?? '').trim();
  if (replyTo && (replyTo.length > 200 || !EMAIL.test(replyTo))) {
    return { sent: false, error: 'That email address doesn’t look right. Leave it blank if you don’t need a reply.' };
  }

  const context = String(formData.get('context') ?? '').trim().slice(0, 500);
  const platform = formData.get('platform') === 'ios' ? 'ios' : 'web';

  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0].trim() || h.get('x-real-ip') || 'local';
  if (!rateLimit(`support:${ip}`, RULE).ok) {
    return { sent: false, error: 'You’ve sent several messages in the last hour. Please try again later.' };
  }

  const supabase = await getSupabaseServer();
  if (!supabase) return { sent: false, error: 'Messages can’t be sent from this copy of Lectio.' };

  const { error } = await supabase.from('support_messages').insert({
    topic,
    message,
    reply_to: replyTo || null,
    context: context || null,
    platform,
  });
  if (error) return { sent: false, error: 'The message couldn’t be sent just now. Please try again in a few minutes.' };

  return { sent: true, error: null };
}
