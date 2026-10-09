import type { Metadata } from 'next';
import Link from 'next/link';
import { Page, PageHeader, Section, TRADEMARK_NOTICE } from '@/components/ui';

export const metadata: Metadata = { title: 'Privacy' };

/**
 * The privacy policy for the website and the iPhone, iPad and Android apps —
 * one page for all of them, because they share an account system and the same
 * study data. The App Store and Google Play require a public URL for this;
 * every statement here describes what the code actually does (see README.md ›
 * Data and privacy).
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
            the app&rsquo;s own storage on iPhone, iPad and Android. None of it is sent to us.
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
            AI grading, the line tutor and sight-passage selection are optional and only run when you
            ask for them. When you do, the Latin passage and the text you wrote or asked (a translation,
            an answer, an essay or a question) are sent from our server to an AI provider (Google Gemini,
            or Groq as a fallback) to produce the feedback. Your name, email address and progress are
            not sent. On free tiers these providers may keep submitted text and use it to improve their
            models, so don&rsquo;t put anything personal in a translation or essay you send for grading.
            Lectio itself does not store the text you send; the feedback is kept only in your own
            progress.
          </p>
          <p>
            The app asks for your permission before the first AI request, and you can withdraw it at any
            time in Settings › AI features. Without it, every feature still works through its self-graded
            path.
          </p>
        </Section>

        <Section title="Analytics and tracking" className="mb-10">
          <p>
            The website uses Vercel Web Analytics to count page views. It uses no cookies and does not
            identify you. The iPhone, iPad and Android apps include no analytics, advertising or tracking of any
            kind, and do not track you across other apps or websites.
          </p>
        </Section>

        <Section title="Who else handles your data" className="mb-10">
          <p>
            Lectio has no advertisers and sells nothing. The only other companies involved are the ones
            that run it: Supabase (accounts and synced progress), Vercel (the website and its server,
            including page-view counts), and, only when you use an AI feature, Google or Groq (see
            above). Each processes data only to provide its service to Lectio, under its own privacy
            terms, which protect it at least as well as this policy.
          </p>
        </Section>

        <Section title="Support messages" className="mb-10">
          <p>
            If you write to us through the <Link href="/support">support page</Link> (or report a name
            from a classroom leaderboard), we keep your message and, if you give one, the email address
            to reply to. They aren&rsquo;t linked to your account, and we delete them once the matter is
            dealt with.
          </p>
        </Section>

        <Section title="How long we keep it" className="mb-10">
          <p>
            Account data and synced progress are kept until you delete your account, and are then
            deleted at once. Classroom study statistics are kept while you belong to the classroom, and
            go with your account. AI requests are not stored by Lectio.
          </p>
        </Section>

        <Section title="Children" className="mb-10">
          <p>
            Lectio is made for high-school and college students. Accounts are not meant for children
            under 13; if you are under 13, use Lectio without an account, which keeps everything on your
            device. If you believe a child under 13 has created an account, tell us on the support page
            and we will delete it.
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

        <Section title="Questions and changes" className="mb-10">
          <p>
            Write to us through the <Link href="/support">support page</Link>. If this policy changes,
            the new version is posted here with a new date.
          </p>
          <p>Last updated 9 October 2026.</p>
          <p style={{ fontSize: '0.9375rem', color: 'var(--fg-muted)' }}>{TRADEMARK_NOTICE}</p>
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
