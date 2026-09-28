import type { Metadata } from 'next';
import Link from 'next/link';
import { Page, PageHeader, Section } from '@/components/ui';

export const metadata: Metadata = { title: 'Privacy' };

/**
 * The privacy policy for the website and the iPhone/iPad app — one page for
 * both, because they share an account system and the same study data. The
 * App Store requires a public URL for this; every statement here describes
 * what the code actually does (see README.md › Data and privacy).
 */
export default function PrivacyPage() {
  return (
    <Page>
      <PageHeader
        eyebrow="Lectio · website and app"
        title="Privacy"
        lede="What Lectio stores, where it lives, and who can see it. The short version: without an account, nothing leaves your device; with one, your progress syncs to your account and only you can read it."
      />

      <Prose>
        <Section title="Without an account" className="mb-10">
          <p>
            Lectio works fully without signing in. Your progress — reading notes and highlights, your
            vocabulary deck, quiz, translation, scansion and exam history, your study plan and streak —
            is stored on your own device: in your browser&rsquo;s local storage on the website, and in
            the app&rsquo;s own storage on iPhone and iPad. None of it is sent to us.
          </p>
        </Section>

        <Section title="With an account" className="mb-10">
          <p>Creating an account (email and password) lets your progress follow you between devices. We store:</p>
          <ul>
            <li>your email address, display name, and whether the account is a student or teacher account;</li>
            <li>
              a copy of your progress, so another device can pick it up. Only you can read it — not
              teachers, not classmates;
            </li>
            <li>
              for classrooms: minutes studied per section per day, and how many graded answers you got
              right. That is what a teacher&rsquo;s dashboard and the classroom leaderboard show — never
              your notes, highlights or written answers.
            </li>
          </ul>
          <p>
            Accounts and data are held by Supabase, our database provider. Access is enforced by the
            database itself, so one student&rsquo;s data cannot be read by another account.
          </p>
        </Section>

        <Section title="AI features" className="mb-10">
          <p>
            AI grading, the line tutor and sight-passage generation are optional and only run when you
            ask for them. When you do, the Latin passage and the text you wrote are sent from our server
            to an AI provider (Google Gemini, or Groq as a fallback) to produce the feedback. On free
            tiers these providers may use submitted text to improve their models, so don&rsquo;t put
            anything personal in a translation or essay you send for grading. Nothing is sent unless you
            press the button.
          </p>
        </Section>

        <Section title="Analytics and tracking" className="mb-10">
          <p>
            The website uses Vercel Web Analytics to count page views. It uses no cookies and does not
            identify you. The iPhone and iPad app includes no analytics, advertising or tracking of any
            kind, and does not track you across other apps or websites.
          </p>
        </Section>

        <Section title="Deleting your data" className="mb-10">
          <p>
            You can delete your account at any time from Settings on the website or from Account in the
            app. Deleting it permanently removes your account, your synced progress, your classroom
            memberships and study statistics, and any classrooms you teach. Progress already stored on
            a device stays on that device until you remove it (Settings › reset on the website, or
            deleting the app).
          </p>
        </Section>

        <Section title="Questions" className="mb-10">
          <p>
            See the <Link href="/support">support page</Link> for how to get in touch.
          </p>
        </Section>
      </Prose>
    </Page>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="measure flex flex-col [&_li]:mb-2 [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5"
      style={{ fontFamily: 'var(--font-latin)', fontSize: '1.125rem', lineHeight: 1.6, color: 'var(--ink2)' }}
    >
      {children}
    </div>
  );
}
