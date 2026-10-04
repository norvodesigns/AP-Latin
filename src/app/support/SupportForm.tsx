'use client';

import { useActionState } from 'react';
import { sendSupportMessage, type SupportResult } from './actions';

const initial: SupportResult = { sent: false, error: null };

const TOPICS: Array<[string, string]> = [
  ['question', 'A question'],
  ['mistake', 'A mistake in the Latin or an answer'],
  ['bug', 'Something isn’t working'],
  ['account', 'My account or my data'],
  ['report', 'Report a name on a classroom leaderboard'],
  ['other', 'Something else'],
];

/** The contact form. `topic`, `message`, `context` and `platform` come from
 *  the URL, so the app can open it filled in (a reported name, say). */
export default function SupportForm({
  topic = 'question',
  message = '',
  context = '',
  platform = 'web',
}: {
  topic?: string;
  message?: string;
  context?: string;
  platform?: string;
}) {
  const [state, action, pending] = useActionState(sendSupportMessage, initial);

  if (state.sent) {
    return (
      <p role="status" style={{ margin: 0 }}>
        Thank you, your message has been sent. If you left an email address, you&rsquo;ll get a reply there.
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4" style={{ fontFamily: 'var(--font-sans)' }}>
      <label>
        <span className="slab-sm mb-2 block">What is it about?</span>
        <select className="input" name="topic" defaultValue={TOPICS.some(([t]) => t === topic) ? topic : 'question'}>
          {TOPICS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="slab-sm mb-2 block">Message</span>
        <textarea
          className="input"
          name="message"
          required
          maxLength={4000}
          rows={6}
          defaultValue={message}
          placeholder="For a mistake, include the passage or question and what you expected to see."
        />
      </label>
      <label>
        <span className="slab-sm mb-2 block">Your email, if you&rsquo;d like a reply (optional)</span>
        <input className="input" type="email" name="replyTo" maxLength={200} autoComplete="email" />
      </label>
      {/* Hidden from people; a bot that fills it in is ignored. */}
      <label aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
        Website
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </label>
      <input type="hidden" name="context" value={context.slice(0, 500)} />
      <input type="hidden" name="platform" value={platform === 'ios' ? 'ios' : 'web'} />
      <div>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? 'Sending…' : 'Send message'}
        </button>
      </div>
      {state.error && (
        <p role="alert" style={{ margin: 0, color: 'var(--accent)', fontSize: '0.9375rem' }}>
          {state.error}
        </p>
      )}
    </form>
  );
}
