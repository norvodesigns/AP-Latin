import type { Metadata } from 'next';
import Link from 'next/link';
import { supabaseConfigured } from '@/lib/supabase/config';
import { Page, PageHeader, Card } from '@/components/ui';
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
        <Card>
          <p className="measure text-sm" style={{ color: 'var(--fg-muted)', margin: 0 }}>
            This deployment has no backend configured, so Lectio is running in solo mode:
            your progress lives in this browser and there are no accounts, classrooms or
            leaderboards. Every study section still works.
          </p>
          <Link href="/" className="btn btn-primary mt-4">
            Back to studying
          </Link>
        </Card>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Accounts"
        title="Sign in"
        lede="Sign in to join a classroom, see your assignments, and appear on your class leaderboard."
      />
      <LoginForm next={next ?? ''} />
      <p className="mt-5 text-sm" style={{ color: 'var(--fg-muted)' }}>
        No account yet?{' '}
        <Link href="/signup" style={{ color: 'var(--accent)' }}>
          Create one
        </Link>
        . You can also{' '}
        <Link href="/" style={{ color: 'var(--accent)' }}>
          keep studying without an account
        </Link>{' '}
        — progress stays in this browser.
      </p>
    </Page>
  );
}
