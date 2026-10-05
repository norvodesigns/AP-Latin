import type { Metadata } from 'next';
import Link from 'next/link';
import { supabaseConfigured } from '@/lib/supabase/config';
import { Page, PageHeader, Panel } from '@/components/ui';
import ForgotPasswordForm from './ForgotPasswordForm';

export const metadata: Metadata = { title: 'Forgot password' };

const prose = {
  margin: 0,
  fontFamily: 'var(--font-latin)',
  fontSize: '1.0625rem',
  lineHeight: 1.6,
  color: 'var(--ink2)',
} as const;

/** "Forgot password?" from the sign-in page, and from the app's sign-in. */
export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ expired?: string }>;
}) {
  const { expired } = await searchParams;

  if (!supabaseConfigured) {
    return (
      <Page>
        <PageHeader eyebrow="Accounts" title="Forgot password" />
        <Panel>
          <p className="measure" style={prose}>
            This deployment has no backend configured, so there are no accounts or passwords. Every
            study section works without signing in.
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
        title="Forgot password"
        lede="Enter the email you signed up with, and we’ll send a link to choose a new password. It works for the website and the app alike."
      />

      {expired && (
        <p
          role="alert"
          className="mb-6 rounded-[var(--r-md)] border px-4 py-3"
          style={{ ...prose, borderColor: 'var(--accent)', background: 'var(--redtint)', color: 'var(--accent)' }}
        >
          That reset link has expired or was already used. Each one works once, for an hour. Ask for a
          new one below.
        </p>
      )}

      <ForgotPasswordForm />

      <div className="mt-10 border-t pt-6" style={{ borderColor: 'var(--rule)' }}>
        <p style={{ ...prose, margin: 0 }}>
          Remembered it?{' '}
          <Link href="/login" className="link-rule" style={{ color: 'var(--accent)' }}>
            Sign in
          </Link>
        </p>
      </div>
    </Page>
  );
}
