import type { Metadata } from 'next';
import Link from 'next/link';
import { Page, PageHeader, Section } from '@/components/ui';
import SupportForm from './SupportForm';

export const metadata: Metadata = { title: 'Support' };

type Search = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

/**
 * The support page the App Store listing links to. The app opens it filled
 * in: `?report=<name>&classroom=<id>&from=ios` for a name reported from a
 * classroom leaderboard, `?topic=…&from=ios` otherwise.
 */
export default async function SupportPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const reported = one(params.report).slice(0, 80);
  const classroom = one(params.classroom).slice(0, 80);
  const topic = reported ? 'report' : one(params.topic);
  const platform = one(params.from) === 'ios' ? 'ios' : 'web';
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
            Questions, a mistake in the Latin or an answer key, a bug, or a name on a classroom
            leaderboard that shouldn&rsquo;t be there: send a message here. Every message is read, and
            reports about names are dealt with within a day.
          </p>
          <SupportForm
            topic={topic}
            message={reported ? `Reporting the name “${reported}” on a classroom leaderboard. ` : ''}
            context={reported ? `reported name: ${reported}; classroom: ${classroom}` : ''}
            platform={platform}
          />
          <p className="mt-6">
            If you use GitHub, you can also open an issue on the project&rsquo;s{' '}
            <a href="https://github.com/norvodesigns/AP-Latin/issues">issue tracker</a>.
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
            <strong>How do I delete my account?</strong> Settings on the website, or Settings › Account in
            the app. See the <Link href="/privacy">privacy page</Link> for exactly what that removes.
          </p>
          <p>
            <strong>Someone on my classroom leaderboard has an offensive name.</strong> In the app, swipe
            the name (or touch and hold it) and choose Report; on the website, use the form above. Teachers
            can remove a student from the roster on the classroom&rsquo;s Teach page or in the app, and
            students can leave a classroom at any time.
          </p>
          <p>
            <strong>Can I turn the AI features off?</strong> Yes. In the app, Settings › AI features. They
            only run when you press an AI button, and each one has a self-graded path that works without
            it.
          </p>
        </Section>
      </div>
    </Page>
  );
}
