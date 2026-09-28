import type { Metadata } from 'next';
import Link from 'next/link';
import { Page, PageHeader, Section } from '@/components/ui';

export const metadata: Metadata = { title: 'Support' };

/** The support page the App Store listing links to. */
export default function SupportPage() {
  return (
    <Page>
      <PageHeader
        eyebrow="Lectio · website and app"
        title="Support"
        lede="Help with Lectio on the web, iPhone and iPad."
      />

      <div
        className="measure flex flex-col [&_li]:mb-2 [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5"
        style={{ fontFamily: 'var(--font-latin)', fontSize: '1.125rem', lineHeight: 1.6, color: 'var(--ink2)' }}
      >
        <Section title="Getting in touch" className="mb-10">
          <p>
            Found a mistake in the Latin, a wrong answer key, or a bug? Report it on the project&rsquo;s{' '}
            <a href="https://github.com/norvodesigns/AP-Latin/issues">issue tracker</a>. Include the
            passage or question, and what you expected to see.
          </p>
        </Section>

        <Section title="Common questions" className="mb-10">
          <p>
            <strong>Do I need an account?</strong> No. Everything works without one; your progress is
            kept on your device. An account lets it sync between the website and the app.
          </p>
          <p>
            <strong>My progress isn&rsquo;t on my other device.</strong> Sign in with the same account on
            both. The app syncs when it opens and every minute and a half while it&rsquo;s open; Account
            shows when it last synced, and &ldquo;Sync now&rdquo; forces it.
          </p>
          <p>
            <strong>AI grading says it&rsquo;s unavailable.</strong> AI features share a free-tier quota
            and a per-person rate limit. Every AI feature has a self-graded path that works the same way;
            try the AI again in a few minutes.
          </p>
          <p>
            <strong>How do I join my class?</strong> Sign in with a student account, open Classroom, and
            enter the six-character code your teacher gives you.
          </p>
          <p>
            <strong>How do I delete my account?</strong> Settings on the website, or Account in the app.
            See the <Link href="/privacy">privacy page</Link> for exactly what that removes.
          </p>
        </Section>
      </div>
    </Page>
  );
}
