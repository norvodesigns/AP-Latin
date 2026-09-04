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
            This deployment has no backend configured, so there are no accounts to create. Lectio is
            running in solo mode and every study section works without signing in.
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
        title="Create an account"
        lede="Only needed for classrooms. Every passage, drill and practice exam already works without one — an account adds your teacher, your assignments, and where you stand."
      />

      <SignUpForm />

      <p
        className="mt-10 border-t pt-6"
        style={{
          borderColor: 'var(--rule)',
          fontFamily: 'var(--font-latin)',
          fontSize: '1.0625rem',
          color: 'var(--ink2)',
        }}
      >
        Already have an account?{' '}
        <Link href="/login" className="link-rule" style={{ color: 'var(--accent)' }}>
          Sign in
        </Link>
        .
      </p>
    </Page>
  );
}
