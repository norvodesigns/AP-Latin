import type { Metadata } from 'next';
import Link from 'next/link';
import { supabaseConfigured } from '@/lib/supabase/config';
import { Page, PageHeader, Panel } from '@/components/ui';
import SignUpForm from './SignUpForm';

export const metadata: Metadata = { title: 'Create an account' };

export default function SignUpPage() {
  if (!supabaseConfigured) {
    return (
      <Page>
        <PageHeader eyebrow="Accounts" title="Create an account" />
        <Panel>
          <p className="measure text-sm" style={{ color: 'var(--fg-muted)', margin: 0 }}>
            This deployment has no backend configured, so there are no accounts to create.
            Lectio is running in solo mode and every study section works without signing in.
          </p>
          <Link href="/" className="btn btn-primary mt-4">
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
        title="Create an account"
        lede="Students join a classroom with a code from their teacher. Teachers create a classroom and get a code to hand out."
      />
      <SignUpForm />
      <p className="mt-5 text-sm" style={{ color: 'var(--fg-muted)' }}>
        Already have an account?{' '}
        <Link href="/login" style={{ color: 'var(--accent)' }}>
          Sign in
        </Link>
        .
      </p>
    </Page>
  );
}
