import type { Metadata } from 'next';
import Link from 'next/link';
import { supabaseConfigured } from '@/lib/supabase/config';
import { Page, PageHeader, Panel } from '@/components/ui';
import LoginForm from './LoginForm';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  if (!supabaseConfigured) {
    return (
      <Page>
        <PageHeader eyebrow="Accounts" title="Sign in" />
        <Panel>
          <p
            className="measure"
            style={{
              margin: 0,
              fontFamily: 'var(--font-latin)',
              fontSize: '1.0625rem',
              lineHeight: 1.6,
              color: 'var(--ink2)',
            }}
          >
            This deployment has no backend configured, so Lectio is running in solo mode: your
            progress lives in this browser and there are no accounts, classrooms or leaderboards.
            Every study section still works.
          </p>
          <Link href="/" className="btn btn-primary mt-6">
            Back to studying
          </Link>
        </Panel>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Accounts"
        title="Sign in"
        lede="An account is only for classrooms — joining one, seeing what's assigned, and appearing on its leaderboard. Everything else works without one."
      />

      <LoginForm next={next ?? ''} />

      <div
        className="mt-10 flex flex-wrap items-baseline gap-x-8 gap-y-3 border-t pt-6"
        style={{ borderColor: 'var(--rule)' }}
      >
        <p
          style={{ margin: 0, fontFamily: 'var(--font-latin)', fontSize: '1.0625rem', color: 'var(--ink2)' }}
        >
          No account yet?{' '}
          <Link href="/signup" className="link-rule" style={{ color: 'var(--accent)' }}>
            Create one
          </Link>
        </p>
        <p
          style={{ margin: 0, fontFamily: 'var(--font-latin)', fontSize: '1.0625rem', color: 'var(--ink2)' }}
        >
          Or{' '}
          <Link href="/" className="link-rule" style={{ color: 'var(--accent)' }}>
            keep studying without one
          </Link>{' '}
          — progress stays in this browser.
        </p>
      </div>
    </Page>
  );
}
